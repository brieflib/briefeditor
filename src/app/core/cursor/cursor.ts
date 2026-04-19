import {
    cloneRange,
    CursorPosition,
    getCursorPosition, getCursorPositionFrom,
    getLength,
    isCollapsed,
    selectNodeContents,
    setRangeEnd
} from "@/core/shared/type/cursor-position";
import {getSelectedBlock} from "@/core/selection/selection";
import {Display, isSchemaContain} from "@/core/normalize/type/schema";
import {computeNodeOffset} from "@/core/cursor/util/cursor-util";

export function isCursorAtEndOfBlock(contentEditable: HTMLElement, cursorPosition = getCursorPosition()) {
    if (!isCollapsed(cursorPosition)) {
        return false;
    }

    const block = getSelectedBlock(contentEditable)[0];
    if (!block) {
        return false;
    }

    const endPosition = cloneRange(cursorPosition);
    selectNodeContents(endPosition, block);
    setRangeEnd(endPosition);

    const endOffset = getLength(endPosition);
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

export function isCursorAtStartOfBlock(contentEditable: HTMLElement, cursorPosition = getCursorPosition()) {
    if (!isCollapsed(cursorPosition)) {
        return false;
    }

    const block = getSelectedBlock(contentEditable, cursorPosition)[0];
    if (!block) {
        return false;
    }

    const endRange = cloneRange(cursorPosition);
    selectNodeContents(endRange, block);
    setRangeEnd(endRange);

    return getLength(endRange) === 0;
}

export function isCursorIntersectBlocks(contentEditable: HTMLElement, cursorPosition = getCursorPosition()) {
    if (isCollapsed(cursorPosition)) {
        return false;
    }

    return getSelectedBlock(contentEditable).length > 1;
}

export function mergeEmptyTextNodes(contentEditable: HTMLElement, cursorPosition: CursorPosition): CursorPosition {
    let {startContainer, endContainer, startOffset, endOffset} = cursorPosition;

    const startNodeOffset = computeNodeOffset(contentEditable, startContainer, startOffset);
    const endNodeOffset = computeNodeOffset(contentEditable, endContainer, endOffset);

    startContainer = startNodeOffset.node;
    endContainer = endNodeOffset.node;
    startOffset = startNodeOffset.offset;
    endOffset = endNodeOffset.offset;

    return getCursorPositionFrom(startContainer, startOffset, endContainer, endOffset);
}

