import {getRange} from "@/core/shared/range-util";
import {getFirstText, getLastText} from "@/core/shared/element-util";
import {Command} from "@/core/command/type/command";
import {
    anchorCursorOnLeaf,
    collapseLeaves,
    getLeafNodes,
    remapDroppedLeafCursor,
    setLeafParents
} from "@/core/normalize/util/normalize-util";

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

// Everything written after the cursor, lifted out of the container. Both sides are written back from the
// leaves they hold, each leaf carrying the tags standing over it, so a tag open at the cursor is closed on
// the one side and opened again on the other. The container keeps what was written before the cursor and
// what follows is handed back. The container is an element on the page or the fragment an item's content
// was parsed into; either one holds the leaves the split reads.
export function splitAtCursor(container: HTMLElement | DocumentFragment, cursorPosition: CursorPosition): DocumentFragment {
    const leafNodes = getLeafNodes(container);
    // The cursor has to name a leaf for the split to have a place to fall. The browser leaves it on the
    // block itself where a block holds no text of its own, and a selection deleted just before the split
    // leaves it on a text node emptied in place, which is no longer a leaf at all - the same two cursors
    // every rebuild here remaps before it reads them.
    const splitIndex = getSplitIndex(leafNodes,
        remapDroppedLeafCursor(container, leafNodes, anchorCursorOnLeaf(cursorPosition)));
    if (splitIndex < 0) {
        return new DocumentFragment();
    }

    // Both sides are read before either is written back: collapsing one moves its leaves out of the
    // container the other is still standing in.
    const head = collapseToFragment(container, leafNodes.slice(0, splitIndex), cursorPosition);
    const tail = collapseToFragment(container, leafNodes.slice(splitIndex), cursorPosition);
    container.replaceChildren(head);

    return tail;
}

// The leaf the tail opens on. The cursor standing in the middle of a leaf divides it, the writer's own node
// keeping what was written before the cursor and a node of its own taking what follows, so the two sides
// never share one. Resting at either end of a leaf it divides the leaves where it stands, and a leaf holding
// no text of its own to stand in - the br standing in for a line - goes whole to the side the cursor leaves
// it on. A cursor outside the container names no leaf here and there is nothing to divide.
function getSplitIndex(leafNodes: Node[], cursorPosition: CursorPosition): number {
    const index = leafNodes.indexOf(cursorPosition.startContainer);
    const leafNode = leafNodes[index];
    if (!leafNode) {
        return -1;
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

// The leaves of one side, written back as the markup they were written in. The collapse hands them back
// inside a wrapper of its own, the way it does for every rebuild, and only what it holds is wanted here.
function collapseToFragment(container: Node, leafNodes: Node[], cursorPosition: CursorPosition): DocumentFragment {
    const leaves = leafNodes.map(leafNode => setLeafParents(container, leafNode));
    const collapsed = collapseLeaves(leaves, cursorPosition).container.firstChild;

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

// The element the cursor sits in. An empty block holds no text of its own, so the cursor is anchored on the
// block itself - climbing to its parent from there lands on the editor, and an editor taller than the viewport
// is never in view, so scrolling it into one carries the whole document back to its first element. A container
// left detached by an edit has no place on screen to scroll to either.
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