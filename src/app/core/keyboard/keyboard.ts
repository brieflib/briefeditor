import {
    isCursorAtEndOfBlock,
    isCursorAtStartOfBlock,
    isCursorIntersectBlocks
} from "@/core/cursor/cursor";
import {isSpecialKey, mergeBlocks, mergeNextBlock, mergePreviousBlock} from "@/core/keyboard/util/keyboard-util";
import {getCursorPosition, setCursorPosition} from "@/core/shared/type/cursor-position";

export function handleEvent(contentEditable: HTMLElement, event: KeyboardEvent) {
    let cursorPosition = getCursorPosition();
    if (isSpecialKey(event)) {
        event.preventDefault();
        return;
    }

    if (isCursorIntersectBlocks(contentEditable)) {
        event.preventDefault();
        cursorPosition = mergeBlocks(contentEditable, cursorPosition, event.key);
        setCursorPosition(contentEditable, cursorPosition);
        return;
    }

    if (event.key === "Delete" && isCursorAtEndOfBlock(contentEditable)) {
        event.preventDefault();
        cursorPosition = mergeNextBlock(contentEditable, cursorPosition);
        setCursorPosition(contentEditable, cursorPosition);
        return;
    }

    if (event.key === "Backspace" && isCursorAtStartOfBlock(contentEditable)) {
        event.preventDefault();
        cursorPosition = mergePreviousBlock(contentEditable, cursorPosition);
        setCursorPosition(contentEditable, cursorPosition);
        return;
    }
}