import {
    cloneRange,
    CursorPosition,
    getCursorPosition, getLength,
    isCollapsed,
    selectNodeContents, setRangeEnd
} from "@/core/shared/type/cursor-position";
import {getSelectedBlock} from "@/core/selection/selection";
import {Display, isSchemaContain} from "@/core/normalize/type/schema";
import {collectTextSiblings, computeOffset, isIndexInArray, replaceWithMerged} from "@/core/cursor/util/cursor-util";

export function isCursorAtEndOfBlock(contentEditable: HTMLElement, cursorPosition = getCursorPosition()) {
    if (!isCollapsed(cursorPosition)) {
        return false;
    }

    const block = getSelectedBlock(contentEditable)[0];
    if (!block) {
        return false;
    }

    let endPosition = cloneRange(cursorPosition);
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

    const block = getSelectedBlock(contentEditable)[0];
    if (!block) {
        return false;
    }

    let endRange = cloneRange(cursorPosition);
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

export function mergeSiblingTextNodes(cursorPosition: CursorPosition): CursorPosition {
    let {startContainer, endContainer, startOffset, endOffset} = cursorPosition;

    if (startContainer.nodeType !== Node.TEXT_NODE || endContainer.nodeType !== Node.TEXT_NODE) {
        return cursorPosition;
    }

    const startSiblings = collectTextSiblings(startContainer);
    const startIndex = startSiblings.indexOf(startContainer);
    const endIndex = startSiblings.indexOf(endContainer);

    startOffset = computeOffset(startSiblings, startIndex, startOffset);
    startContainer = replaceWithMerged(startSiblings);
    if (isIndexInArray(endIndex)) {
        endOffset = computeOffset(startSiblings, endIndex, endOffset);
        endContainer = startContainer;
    }

    if (!isIndexInArray(endIndex)) {
        const endSiblings = collectTextSiblings(endContainer);
        const endIndex = endSiblings.indexOf(endContainer);

        endOffset = computeOffset(endSiblings, endIndex, endOffset);
        endContainer = replaceWithMerged(endSiblings);
    }

    return {...cursorPosition, startContainer, startOffset, endContainer, endOffset};
}

