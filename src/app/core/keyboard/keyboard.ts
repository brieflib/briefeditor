import {
    getSelectionOffset,
    isCursorAtEndOfBlock,
    isCursorAtStartOfBlock, isCursorIntersectBlocks, restoreRange,
    setCursorPosition
} from "@/core/cursor/cursor";
import {
    mergePreviousBlock,
    mergeNextBlock,
    mergeBlocks, isSpecialKey
} from "@/core/keyboard/util/keyboard-util";
import {pasteParagraph} from "@/core/shared/element-util";
import {CursorPosition} from "@/core/cursor/type/cursor-position";

export function handleEvent(contentEditable: HTMLElement, event: KeyboardEvent) {
    const cursorPosition = getSelectionOffset(contentEditable);
    if (!cursorPosition || isSpecialKey(event)) {
        return;
    }

    if (isCursorIntersectBlocks(contentEditable)) {
        event.preventDefault();
        mergeBlocks(contentEditable, cursorPosition, event.key);
        setCursorPositionAtStart(contentEditable, cursorPosition);
        return;
    }

    if (event.key === "Delete" && isCursorAtEndOfBlock(contentEditable)) {
        event.preventDefault();
        mergeNextBlock(contentEditable);
        return;
    }

    if (event.key === "Backspace" && isCursorAtStartOfBlock(contentEditable)) {
        event.preventDefault();
        const isMerged = mergePreviousBlock(contentEditable);
        if (isMerged) {
            setCursorPositionAtStart(contentEditable, cursorPosition);
        }
        return;
    }

    //pasteParagraph(contentEditable);
}

function setCursorPositionAtStart(contentEditable: HTMLElement, cursorPosition: CursorPosition | null) {
    if (cursorPosition) {
        cursorPosition.endOffset = cursorPosition.startOffset;
        setCursorPosition(contentEditable, cursorPosition, false);
    }
}