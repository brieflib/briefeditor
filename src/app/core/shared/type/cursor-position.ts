import {getRange} from "@/core/shared/range-util";
import {getFirstText, getLastText} from "@/core/shared/element-util";
import {Command} from "@/core/command/type/command";
import {anchorCursorOnLeaf, collapseLeaves, getLeafNodes, setLeafParents} from "@/core/normalize/util/normalize-util";

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

export function setCursorPositionEndAsLastTextOfElement(cursorPosition: CursorPosition, endElement: Element) {
    const endContainer = getLastText(endElement);
    return getCursorPositionFrom(cursorPosition.startContainer, cursorPosition.startOffset, endContainer, endContainer.textContent.length);
}

export function setCursorPositionStartAsFirstTextOfElement(cursorPosition: CursorPosition, startElement: Element) {
    const startContainer = getFirstText(startElement);
    return  getCursorPositionFrom(startContainer, 0, cursorPosition.endContainer, cursorPosition.endOffset);
}

export function extractContents(cursorPosition: CursorPosition): DocumentFragment {
    return cursorPosition.range.extractContents();
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

export function setCursorPosition(contentEditable: HTMLElement, cursorPosition: CursorPosition, command?: Command) {
    const range: Range = getRangeFromCursorPosition(cursorPosition);
    const selection: Selection | null = window.getSelection();
    if (!selection) {
        return;
    }
    selection.removeAllRanges();
    selection.addRange(range);


    scrollToViewport(contentEditable, cursorPosition, command);
}

function scrollToViewport(contentEditable: HTMLElement, cursorPosition: CursorPosition, command?: Command) {
    if (command && command.event instanceof KeyboardEvent && command.event.key.length !== 1) {
        return;
    }

    const element = getCursorElement(contentEditable, cursorPosition);
    if (!element || isInViewport(element)) {
        return;
    }

    element.scrollIntoView({ behavior: 'auto', block: 'start' });
}

/**
 * The element the cursor sits in, or `null` when there's nowhere sensible to scroll to: the
 * editor itself (an empty block anchors the cursor on the block, not a text node, so climbing
 * to its parent can reach the editor - scrolling that in would jump to the document's start)
 * or an element an edit has left detached.
 */
function getCursorElement(contentEditable: HTMLElement, cursorPosition: CursorPosition) {
    const container = cursorPosition.startContainer;
    const element = container.nodeType === Node.ELEMENT_NODE
        ? container as HTMLElement
        : container.parentElement;

    if (!element || !element.isConnected || element === contentEditable) {
        return null;
    }

    return element;
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