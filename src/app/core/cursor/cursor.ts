import {CursorPosition} from "@/core/cursor/type/cursor-position";
import {findNodeAndOffset, isOutsideElement} from "@/core/cursor/util/cursor-util";
import {getRange} from "@/core/shared/range-util";

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

    const shift = range.startOffset === 0 && range.endOffset === 0 ? 1 : 0;

    return {
        startOffset: startRange.toString().length + shift,
        endOffset: endRange.toString().length + shift,
        shift: shift
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

    const start = findNodeAndOffset(contentEditable, cursorPosition.startOffset - cursorPosition.shift, cursorPosition.shift);
    const end = findNodeAndOffset(contentEditable, cursorPosition.endOffset - cursorPosition.shift, cursorPosition.shift);

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