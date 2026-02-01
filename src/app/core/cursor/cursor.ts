import {CursorPosition} from "@/core/cursor/type/cursor-position";
import {findNodeAndOffset, isOutsideElement, isShift} from "@/core/cursor/util/cursor-util";
import {getRange} from "@/core/shared/range-util";
import {getPreviousNode} from "@/core/shared/element-util";
import {getSelectedBlock} from "@/core/selection/selection";
import {Display, isSchemaContain} from "@/core/normalize/type/schema";

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

export function setCursorPosition(contentEditable: HTMLElement, cursorPosition: CursorPosition, isShiftEnabled = true) {
    const range: Range = restoreRange(contentEditable, cursorPosition, isShiftEnabled);
    const selection: Selection | null = window.getSelection();
    if (!selection) {
        return;
    }
    selection.removeAllRanges();
    selection.addRange(range);
}

export function restoreRange(contentEditable: HTMLElement, cursorPosition: CursorPosition, isShiftEnabled = true): Range {
    const cloneRange: Range = getRange().cloneRange();
    cloneRange.selectNode(contentEditable);

    const start = findNodeAndOffset(contentEditable, cursorPosition.startOffset, cursorPosition.isStartShift && isShiftEnabled);
    const end = findNodeAndOffset(contentEditable, cursorPosition.endOffset, cursorPosition.isEndShift && isShiftEnabled);

    if (start.node) {
        cloneRange.setStart(start.node, start.offset);
    } else {
        cloneRange.setStart(contentEditable, 0);
    }

    if (end.node) {
        cloneRange.setEnd(end.node, end.offset);
    } else {
        cloneRange.setEnd(contentEditable, 0);
    }

    return cloneRange;
}

export function isCursorAtEndOfBlock(contentEditable: HTMLElement, range = getRange()) {
    if (!range.collapsed) {
        return false;
    }

    const block = getSelectedBlock(contentEditable)[0];
    if (!block) {
        return false;
    }

    const endRange: Range = range.cloneRange();
    endRange.selectNodeContents(block);
    endRange.setEnd(range.endContainer, range.endOffset);

    const endOffset = endRange.toString().length;
    if (!isSchemaContain(block, [Display.List])) {
        return endOffset === block.textContent.length;
    }

    const blockWithoutListWrappers = block.cloneNode(true) as HTMLElement;
    const nestedListWrappers = blockWithoutListWrappers.querySelectorAll("ul, ol");
    nestedListWrappers.forEach(listWrapper => {
        listWrapper.remove();
    });
    const elementLength = blockWithoutListWrappers.textContent.length;

    return endOffset === elementLength;
}

export function isCursorAtStartOfBlock(contentEditable: HTMLElement, range = getRange()) {
    if (!range.collapsed) {
        return false;
    }

    const block = getSelectedBlock(contentEditable)[0];
    if (!block) {
        return false;
    }

    const startRange: Range = range.cloneRange();
    startRange.selectNodeContents(block);
    startRange.setStart(range.startContainer, range.startOffset);

    const endRange: Range = range.cloneRange();
    endRange.selectNodeContents(block);
    endRange.setEnd(range.endContainer, range.endOffset);

    return endRange.toString().length === 0;
}

export function isCursorIntersectBlocks(contentEditable: HTMLElement, range = getRange()) {
    if (range.collapsed) {
        return false;
    }

    return getSelectedBlock(contentEditable).length > 1;
}