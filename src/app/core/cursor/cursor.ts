import {CursorPosition} from "@/core/cursor/type/cursor-position";
import {createRange} from "@/core/cursor/util/util";

export function getSelectionOffset(contentEditable: HTMLElement): CursorPosition {
    const range: Range = window.getSelection().getRangeAt(0);

    const startRange: Range = range.cloneRange();
    startRange.selectNodeContents(contentEditable);
    startRange.setEnd(range.startContainer, range.startOffset);

    const endRange: Range = range.cloneRange();
    endRange.selectNodeContents(contentEditable);
    endRange.setEnd(range.endContainer, range.endOffset);

    return {
        startOffset: startRange.toString().length,
        endOffset: endRange.toString().length
    };
}

export function setCursorPosition(contentEditable: HTMLElement, cursorPosition: CursorPosition) {
    const range: Range = createRange(contentEditable, cursorPosition);
    const selection: Selection | null = window.getSelection();
    if (!selection) {
        return;
    }
    selection.removeAllRanges();
    selection.addRange(range);
}