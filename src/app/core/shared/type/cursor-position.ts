import {getRange} from "@/core/shared/range-util";

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

export function getCursorPositionFrom(startContainer: Node, startOffset: number, endContainer: Node, endOffset: number): CursorPosition {
    const cursorPosition = {
        startContainer: startContainer,
        endContainer: endContainer,
        startOffset: startOffset,
        endOffset: endOffset,
        range: new Range()
    }

    return {
        ...cursorPosition,
        range: getRangeFromCursorPosition(cursorPosition)
    };
}

export function extractContents(cursorPosition: CursorPosition): DocumentFragment {
    return cursorPosition.range.extractContents();
}

export function insertNode(cursorPosition: CursorPosition, node: Node) {
    cursorPosition.range.insertNode(node);
}

export function isCollapsed(cursorPosition: CursorPosition) {
    return cursorPosition.range.collapsed;
}

export function deleteContents(cursorPosition: CursorPosition) {
    return getRangeFromCursorPosition(cursorPosition).deleteContents();
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

export function setCursorPosition(contentEditable: HTMLElement, cursorPosition: CursorPosition) {
    const range: Range = getRangeFromCursorPosition(cursorPosition);
    const selection: Selection | null = window.getSelection();
    if (!selection) {
        return;
    }
    selection.removeAllRanges();
    selection.addRange(range);
}

export function isRangeIn(element?: HTMLElement, cursorPosition = getCursorPosition()) {
    return element?.contains(cursorPosition.startContainer) &&
        element?.contains(cursorPosition.endContainer);
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