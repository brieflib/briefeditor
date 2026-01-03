import {CursorPosition} from "@/core/cursor/type/cursor-position";
import {findNodeAndOffset, isOutsideElement} from "@/core/cursor/util/cursor-util";
import {getRange} from "@/core/shared/range-util";
import {getPreviousNode} from "@/core/shared/element-util";

export function getSelectionOffset(contentEditable: HTMLElement): CursorPosition | null {
    const range: Range = getRange();

    const startRange: Range = range.cloneRange();
    startRange.selectNodeContents(contentEditable);
    startRange.setEnd(range.startContainer, range.startOffset);

    const endRange: Range = range.cloneRange();
    endRange.selectNodeContents(contentEditable);
    endRange.setEnd(range.endContainer, range.endOffset);

    if (isOutsideElement(contentEditable, range.startContainer, range.endContainer)) {
        return null;
    }

    const startOffset = startRange.toString().length;
    const endOffset = endRange.toString().length;

    const previousText = getPreviousNode(contentEditable, range.startContainer);

    const isStartShift = isShift(previousText, range, range.startContainer, range.startOffset);
    const isEndShift = isShift(previousText, range, range.endContainer, range.endOffset);

    return {
        startOffset: startOffset,
        endOffset: endOffset,
        isStartShift: isStartShift,
        isEndShift: isEndShift
    };
}

export function setCursorPosition(contentEditable: HTMLElement, cursorPosition: CursorPosition) {
    const range: Range = restoreRange(contentEditable, cursorPosition);
    const selection: Selection | null = window.getSelection();
    if (!selection) {
        return;
    }
    selection.removeAllRanges();
    selection.addRange(range);
}

export function restoreRange(contentEditable: HTMLElement, cursorPosition: CursorPosition): Range {
    const range: Range = getRange().cloneRange();
    range.selectNode(contentEditable);

    const start = findNodeAndOffset(contentEditable, cursorPosition.startOffset, cursorPosition.isStartShift);
    const end = findNodeAndOffset(contentEditable, cursorPosition.endOffset, cursorPosition.isEndShift);

    if (start.node) {
        range.setStart(start.node, start.offset);
    } else {
        range.setStart(contentEditable, 0);
    }

    if (end.node) {
        range.setEnd(end.node, end.offset);
    } else {
        range.setEnd(contentEditable, 0);
    }

    return range;
}

export function selectElement(element: HTMLElement) {
    const selection = window.getSelection();
    const range = document.createRange();

    if (!selection) {
        return;
    }

    range.selectNodeContents(element);
    selection.removeAllRanges();
    selection.addRange(range);
}

function isShift(previousText: Node | undefined, range: Range, container: Node, offset: number) {
    if (!previousText) {
        return false;
    }

    const previousRangeStart: Range = range.cloneRange();
    previousRangeStart.selectNodeContents(previousText);
    previousRangeStart.setEnd(container, offset);
    return range.startOffset === 0 && previousText?.textContent?.length === previousRangeStart.toString().length;
}