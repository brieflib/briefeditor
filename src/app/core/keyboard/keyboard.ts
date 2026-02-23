import {
    isCursorAtEndOfBlock,
    isCursorAtStartOfBlock,
    isCursorIntersectBlocks
} from "@/core/cursor/cursor";
import {isSpecialKey, mergeBlocks, mergeNextBlock, mergePreviousBlock} from "@/core/keyboard/util/keyboard-util";
import {getCursorPosition} from "@/core/shared/type/cursor-position";

export function handleEvent(contentEditable: HTMLElement, event: KeyboardEvent) {
    const cursorPosition = getCursorPosition();
    if (!cursorPosition || isSpecialKey(event)) {
        return;
    }

    if (isCursorIntersectBlocks(contentEditable)) {
        event.preventDefault();
        mergeBlocks(contentEditable, cursorPosition, event.key);
        return;
    }

    if (event.key === "Delete" && isCursorAtEndOfBlock(contentEditable)) {
        event.preventDefault();
        mergeNextBlock(contentEditable, cursorPosition);
        return;
    }

    if (event.key === "Backspace" && isCursorAtStartOfBlock(contentEditable)) {
        event.preventDefault();
        mergePreviousBlock(contentEditable, cursorPosition);
        return;
    }
}