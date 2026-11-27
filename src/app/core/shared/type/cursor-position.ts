import {getRange} from "@/core/shared/range-util";
import {getElement, getFirstText, getLastNode, getLastText} from "@/core/shared/element-util";
import {getSelectedBlocks} from "@/core/selection/selection";
import {anchorCursorOnLeaf, collapseLeaves, getLeafNodes, setLeafParents} from "@/core/normalize/util/normalize-util";
import {getSelectedLeaves} from "@/core/selection/util/selection-util";
import {Display, isSchemaContain} from "@/core/normalize/type/schema";

export interface CursorPosition {
    readonly startContainer: Node,
    readonly endContainer: Node,
    readonly startOffset: number,
    readonly endOffset: number,
    readonly range: Range
}

export function isCursorPositionEqual(comparable?: CursorPosition | null, compareTo?: CursorPosition | null) {
    if (!comparable || !compareTo) {
        return false;
    }

    return comparable.startContainer === compareTo.startContainer &&
        comparable.endContainer === compareTo.endContainer &&
        comparable.startOffset === compareTo.startOffset &&
        comparable.endOffset === compareTo.endOffset;
}

export function getCursorPosition(): CursorPosition {
    const range = getRange();
    return {
        startContainer: range.startContainer,
        endContainer: range.endContainer,
        startOffset: range.startOffset,
        endOffset: range.endOffset,
        range: range
    };
}

export function getCursorPositionFrom(startContainer: Node, startOffset: number, endContainer: Node, endOffset: number, isRange = true): CursorPosition {
    const cursorPosition = {
        startContainer: startContainer,
        endContainer: endContainer,
        startOffset: startOffset,
        endOffset: endOffset,
        range: new Range()
    }

    if (!isRange) {
        return cursorPosition;
    }

    return {
        ...cursorPosition,
        range: getRangeFromCursorPosition(cursorPosition)
    };
}

/** Moves a collapsed cursor standing on an element before a nested list onto the leaf before that list. */
export function whenCursorSpansElements(contentEditable: HTMLElement, cursorPosition: CursorPosition) {
    const container = cursorPosition.startContainer;
    if (!isCollapsed(cursorPosition) || !(container instanceof HTMLElement)) {
        return cursorPosition;
    }

    const line = getElement(contentEditable, container, [Display.Line, Display.List]);
    const child = container.childNodes[cursorPosition.startOffset];
    if (!line || !child || !isSchemaContain(child, [Display.ListWrapper])) {
        return cursorPosition;
    }

    const previous = getLastNode(child.previousSibling);
    if (!previous) {
        return cursorPosition;
    }

    const offset = previous instanceof Text ? previous.data.length : 0;
    return getCursorPositionFrom(previous, offset, previous, offset);
}

/**
 * Returns a cursor position on every selected text node: the first one from the cursor, the last one up to it and the
 * rest whole.
 */
export function getSelectedTexts(contentEditable: HTMLElement, cursorPosition = getCursorPosition()) {
    return getSelectedLeaves(contentEditable, cursorPosition).map(text => {
        const startOffset = text === cursorPosition.startContainer ? cursorPosition.startOffset : 0;
        const endOffset = text === cursorPosition.endContainer ? cursorPosition.endOffset : text.textContent?.length ?? 0;

        return getCursorPositionFrom(text, startOffset, text, endOffset);
    });
}

export function wrapCursorPosition(first?: Node, last?: Node) {
    if (!first || !last) {
        return;
    }

    const range = new Range();
    range.setStartBefore(first);
    range.setEndAfter(last);

    return getCursorPositionFrom(range.startContainer, range.startOffset, range.endContainer, range.endOffset);
}

/**
 * A cursor position around the roots from `firstRoot` to `lastRoot` and the root on each side of them, so the
 * rebuild joins lists a removed line stood between.
 */
export function wrapWithNeighbours(firstRoot: HTMLElement | undefined, lastRoot: HTMLElement | undefined) {
    return wrapCursorPosition(
        firstRoot?.previousElementSibling ?? firstRoot,
        lastRoot?.nextElementSibling ?? lastRoot
    );
}

/**
 * Returns the part of the selection that lies inside `block`: from the cursor to the block's end for the first block,
 * the whole block for a middle one, and from the block's start to the cursor for the last one.
 */
export function getBlockCursorPosition(block: HTMLElement, blocks: HTMLElement[], cursorPosition: CursorPosition) {
    const isFirst = block === blocks.at(0);
    const isLast = block === blocks.at(-1);

    // The first block starts in the middle, at the cursor; every other block starts at its beginning
    const startContainer = isFirst ? cursorPosition.startContainer : block;
    const startOffset = isFirst ? cursorPosition.startOffset : 0;

    // The last block ends in the middle, at the cursor; every other block ends at its end
    const endContainer = isLast ? cursorPosition.endContainer : block;
    const endOffset = isLast ? cursorPosition.endOffset : block.childNodes.length;

    return getCursorPositionFrom(startContainer, startOffset, endContainer, endOffset);
}


/**
 * Returns a cursor position standing around the selected blocks, so extracting it takes the blocks themselves.
 * Undefined when no block is selected.
 */
export function getSelectedBlocksCursorPosition(contentEditable: HTMLElement, cursorPosition: CursorPosition) {
    const blocks = getSelectedBlocks(contentEditable, cursorPosition);
    const firstBlock = blocks.at(0);
    const lastBlock = blocks.at(-1);
    if (!firstBlock || !lastBlock) {
        return;
    }

    const range = new Range();
    range.setStartBefore(firstBlock);
    range.setEndAfter(lastBlock);

    return getCursorPositionFrom(range.startContainer, range.startOffset, range.endContainer, range.endOffset);
}

export function getCursorPositionFromElement(element: Node, isRange = true): CursorPosition {
    const firstText = getFirstText(element);
    const lastText = getLastText(element);

    const cursorPosition = {
        startContainer: firstText,
        endContainer: lastText,
        startOffset: firstText.textContent.length,
        endOffset: lastText.textContent.length,
        range: new Range()
    }

    if (!isRange) {
        return cursorPosition;
    }

    return {
        ...cursorPosition,
        range: getRangeFromCursorPosition(cursorPosition)
    };
}

/**
 * Extracts the range contents, keeping the original nodes for everything the selection touches: a fully
 * selected node is moved as is, a partly selected element is split in two and the original keeps the
 * selected children, and a partly selected text node keeps the selected slice. The unselected remainder
 * stays in the DOM as a clone.
 */
export function extractContents(cursorPosition: CursorPosition): DocumentFragment {
    const {range} = cursorPosition;
    if (range.collapsed) {
        return new DocumentFragment();
    }

    const context: ExtractContext = {
        states: getSelectionStates(range.commonAncestorContainer, range),
        startContainer: range.startContainer,
        startOffset: range.startOffset,
        endContainer: range.endContainer,
        endOffset: range.endOffset,
        seam: {
            after: null,
            before: null,
            fallbackParent: null,
            fallbackOffset: 0
        }
    };

    const fragment = document.createDocumentFragment();
    if (range.commonAncestorContainer.nodeType === Node.TEXT_NODE) {
        extractText(range.commonAncestorContainer as Text, context, fragment);
    } else {
        extractChildren(range.commonAncestorContainer, context, fragment, true);
    }

    setRangeToSeam(range, context);
    return fragment;
}

enum SelectionState {
    Full,
    Partial,
    None
}

interface ExtractSeam {
    after: Node | null;
    before: Node | null;
    fallbackParent: Node | null;
    fallbackOffset: number;
}

interface ExtractContext {
    readonly states: Map<Node, SelectionState>;
    readonly startContainer: Node;
    readonly startOffset: number;
    readonly endContainer: Node;
    readonly endOffset: number;
    readonly seam: ExtractSeam;
}

/** Reads every node's relation to the range before any mutation changes the tree. */
function getSelectionStates(commonAncestor: Node, range: Range) {
    const states = new Map<Node, SelectionState>();
    const pending = Array.from(commonAncestor.childNodes);

    while (pending.length > 0) {
        const node = pending.pop() as Node;
        const nodeRange = new Range();
        nodeRange.selectNode(node);

        if (range.intersectsNode(node)) {
            const startsInside = range.compareBoundaryPoints(Range.START_TO_START, nodeRange) <= 0;
            const endsInside = range.compareBoundaryPoints(Range.END_TO_END, nodeRange) >= 0;
            states.set(node, startsInside && endsInside ? SelectionState.Full : SelectionState.Partial);
        } else {
            states.set(node, SelectionState.None);
        }

        pending.push(...Array.from(node.childNodes));
    }

    return states;
}

function extractChildren(parent: Node, context: ExtractContext, fragment: DocumentFragment, isRoot: boolean) {
    const children = Array.from(parent.childNodes);
    let seenSelected = false;

    children.forEach((child, index) => {
        const state = context.states.get(child) ?? SelectionState.None;

        if (state === SelectionState.None) {
            if (!seenSelected) {
                context.seam.after = child;
            } else if (!context.seam.before) {
                context.seam.before = child;
            }
            return;
        }

        if (!seenSelected) {
            seenSelected = true;
            if (isRoot) {
                context.seam.fallbackParent = parent;
                context.seam.fallbackOffset = index;
            }
        }

        if (state === SelectionState.Full) {
            fragment.append(child);
            return;
        }

        if (child.nodeType === Node.TEXT_NODE) {
            extractText(child as Text, context, fragment);
            return;
        }

        if (child.nodeType === Node.ELEMENT_NODE) {
            extractElement(child as Element, context, fragment);
            return;
        }

        fragment.append(child);
    });
}

/** Moves the original element into the fragment with the selected children and leaves a clone holding the rest. */
function extractElement(element: Element, context: ExtractContext, fragment: DocumentFragment) {
    const isStartSide = element.contains(context.startContainer);
    const isEndSide = element.contains(context.endContainer);
    const selected = document.createDocumentFragment();

    extractChildren(element, context, selected, false);
    if (!selected.hasChildNodes()) {
        return;
    }

    const remainder = element.cloneNode(false) as Element;
    while (element.firstChild) {
        remainder.appendChild(element.firstChild);
    }

    if (remainder.hasChildNodes()) {
        element.before(remainder);
        if (isStartSide) {
            context.seam.after = remainder;
        }
        if (isEndSide && !context.seam.before) {
            context.seam.before = remainder;
        }
    }

    element.appendChild(selected);
    fragment.append(element);
}

/** Keeps the original text node as the selected slice and leaves the unselected prefix and suffix in the DOM. */
function extractText(text: Text, context: ExtractContext, fragment: DocumentFragment) {
    const data = text.data;
    const start = text === context.startContainer ? context.startOffset : 0;
    const end = text === context.endContainer ? context.endOffset : data.length;

    if (start >= end) {
        if (text === context.endContainer && context.endOffset === 0) {
            if (!context.seam.before) {
                context.seam.before = text;
            }
        } else if (text === context.startContainer) {
            context.seam.after = text;
        }
        return;
    }

    if (start === 0 && end === data.length) {
        if (text.parentNode) {
            context.seam.fallbackParent = text.parentNode;
            context.seam.fallbackOffset = getChildIndex(text);
        }
        fragment.append(text);
        return;
    }

    if (start > 0) {
        const prefix = document.createTextNode(data.slice(0, start));
        text.before(prefix);
        context.seam.after = prefix;
    }

    if (end < data.length) {
        const suffix = document.createTextNode(data.slice(end));
        text.after(suffix);
        if (!context.seam.before) {
            context.seam.before = suffix;
        }
    }

    text.data = data.slice(start, end);
    fragment.append(text);
}

/** Collapses the range where the extracted content stood, so a following insertion lands in its place. */
function setRangeToSeam(range: Range, context: ExtractContext) {
    const {after, before, fallbackParent, fallbackOffset} = context.seam;

    if (after?.parentNode) {
        range.setStart(after.parentNode, getChildIndex(after) + 1);
    } else if (before?.parentNode) {
        range.setStart(before.parentNode, getChildIndex(before));
    } else if (fallbackParent) {
        range.setStart(fallbackParent, fallbackOffset);
    } else if (context.startContainer.isConnected) {
        range.setStart(context.startContainer, context.startOffset);
    }

    range.collapse(true);
}

function getChildIndex(node: Node) {
    const parent = node.parentNode;
    return parent ? Array.prototype.indexOf.call(parent.childNodes, node) : -1;
}

/**
 * Splits `container` at the cursor, leaving what precedes it in place and returning what
 * follows as a fragment. Each side is rebuilt from its leaves with the tags that stood over
 * them, so a tag open at the cursor is closed on one side and reopened on the other.
 */
export function splitAtCursor(container: HTMLElement | DocumentFragment, cursorPosition: CursorPosition): DocumentFragment {
    const leafNodes = getLeafNodes(container);
    // The cursor must name a leaf for the split to have a place to fall.
    const splitIndex = getSplitIndex(container, leafNodes, anchorCursorOnLeaf(cursorPosition));
    if (splitIndex < 0) {
        return new DocumentFragment();
    }

    // Read both sides before writing either back: collapsing one moves its leaves out of the
    // container the other side is still standing in.
    const head = collapseToFragment(container, leafNodes.slice(0, splitIndex));
    const tail = collapseToFragment(container, leafNodes.slice(splitIndex));
    container.replaceChildren(head);

    return tail;
}

/**
 * The index in `leafNodes` where the split falls. A cursor in the middle of a text leaf
 * splits that node in two; at either end it just falls between leaves. A leaf with no text
 * of its own (e.g. a line's br) goes whole to whichever side the cursor is on. Returns -1
 * if the cursor lies outside `container`.
 */
function getSplitIndex(container: Node, leafNodes: Node[], cursorPosition: CursorPosition): number {
    const index = leafNodes.indexOf(cursorPosition.startContainer);
    const leafNode = leafNodes[index];
    if (!leafNode) {
        return getSplitIndexAtOffset(container, leafNodes, cursorPosition);
    }

    if (leafNode.nodeType !== Node.TEXT_NODE) {
        return cursorPosition.startOffset === 0 ? index : index + 1;
    }

    const text = leafNode as Text;
    if (cursorPosition.startOffset === 0) {
        return index;
    }
    if (cursorPosition.startOffset >= text.length) {
        return index + 1;
    }

    leafNodes.splice(index + 1, 0, text.splitText(cursorPosition.startOffset));

    return index + 1;
}

/**
 * Fallback for a cursor naming no leaf directly - e.g. anchored on an empty block, or on a
 * text node a deletion emptied in place. Both still name a place in the text, found here by
 * counting characters up to it. Returns -1 if the cursor lies outside `container`.
 */
function getSplitIndexAtOffset(container: Node, leafNodes: Node[], cursorPosition: CursorPosition): number {
    if (!container.contains(cursorPosition.startContainer)) {
        return -1;
    }

    const range = new Range();
    range.selectNodeContents(container);
    range.setEnd(cursorPosition.startContainer, cursorPosition.startOffset);
    const offset = range.toString().length;

    let position = 0;
    for (let index = 0; index < leafNodes.length; index++) {
        const leafNode = leafNodes[index] as Node;
        const length = leafNode.textContent?.length ?? 0;

        if (offset <= position) {
            return index;
        }
        if (offset < position + length) {
            leafNodes.splice(index + 1, 0, (leafNode as Text).splitText(offset - position));
            return index + 1;
        }
        position += length;
    }

    return leafNodes.length;
}

/** Rebuilds a run of leaves back into the markup they were written in. */
function collapseToFragment(container: Node, leafNodes: Node[]): DocumentFragment {
    const leaves = leafNodes.map(leafNode => setLeafParents(container, leafNode));
    const collapsed = collapseLeaves(leaves).firstChild;

    const fragment = new DocumentFragment();
    if (collapsed) {
        fragment.append(...Array.from(collapsed.childNodes));
    }

    return fragment;
}

export function cloneContents(cursorPosition: CursorPosition): DocumentFragment {
    return cursorPosition.range.cloneContents();
}

export function insertNode(cursorPosition: CursorPosition, node: Node) {
    cursorPosition.range.insertNode(node);
}

export function isCollapsed(cursorPosition: CursorPosition) {
    return cursorPosition.startContainer === cursorPosition.endContainer &&
        cursorPosition.startOffset === cursorPosition.endOffset;
}

export function deleteContents(cursorPosition: CursorPosition) {
    getRangeFromCursorPosition(cursorPosition).deleteContents();

    return getCursorPositionFrom(
        cursorPosition.startContainer, cursorPosition.startOffset,
        cursorPosition.startContainer, cursorPosition.startOffset
    );
}

export function getBoundingClientRect(cursorPosition: CursorPosition) {
    return cursorPosition.range.getBoundingClientRect();
}

export function selectNode(cursorPosition: CursorPosition, node: Node) {
    cursorPosition.range.selectNode(node);
}

export function selectNodeContents(cursorPosition: CursorPosition, node: Node) {
    cursorPosition.range.selectNodeContents(node);
}

export function commonAncestorContainer(cursorPosition: CursorPosition) {
    return cursorPosition.range.commonAncestorContainer;
}

export function setRangeEnd(cursorPosition: CursorPosition) {
    cursorPosition.range.setEnd(cursorPosition.endContainer, cursorPosition.endOffset);
}

export function getLength(cursorPosition: CursorPosition) {
    return cursorPosition.range.toString().length;
}

export function cloneRange(cursorPosition: CursorPosition) {
    return {
        ...cursorPosition,
        range: cursorPosition.range.cloneRange()
    }
}

export function setCursorPosition(cursorPosition: CursorPosition) {
    const range: Range = getRangeFromCursorPosition(cursorPosition);
    const selection: Selection | null = window.getSelection();
    if (!selection) {
        return;
    }
    selection.removeAllRanges();
    selection.addRange(range);
}

export function scrollToViewport(cursorPosition: CursorPosition) {
    const {startContainer} = cursorPosition;
    const element = startContainer instanceof HTMLElement ? startContainer : startContainer.parentElement;
    if (!element || !element.isConnected || isInViewport(element)) {
        return;
    }

    element.scrollIntoView({ behavior: 'auto', block: 'start' });
}

function isInViewport(element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

export function isRangeIn(element?: HTMLElement, cursorPosition = getCursorPosition()) {
    return element?.contains(cursorPosition.startContainer) && element?.contains(cursorPosition.endContainer);
}

export function createContextualFragment(htmlString: string, cursorPosition: CursorPosition) {
    return getRangeFromCursorPosition(cursorPosition).createContextualFragment(htmlString);
}

export function intersectsNode(cursorPosition: CursorPosition, node: Node) {
    return cursorPosition.range.intersectsNode(node);
}

function getRangeFromCursorPosition(cursorPosition: CursorPosition): Range {
    const range = new Range();

    range.setStart(cursorPosition.startContainer, cursorPosition.startOffset);
    range.setEnd(cursorPosition.endContainer, cursorPosition.endOffset);

    return range;
}
