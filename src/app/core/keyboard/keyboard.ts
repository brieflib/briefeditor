import {isCursorAtEndOfBlock, isCursorAtStartOfBlock, isCursorIntersectBlocks} from "@/core/cursor/cursor";
import {
    insertBreak,
    isSpecialKey,
    mergeBlocks,
    mergeNextBlock,
    mergePreviousBlock
} from "@/core/keyboard/util/keyboard-util";
import {
    CursorPosition,
    deleteContents,
    getCursorPosition,
    isCollapsed,
    setCursorPosition
} from "@/core/shared/type/cursor-position";

export function handleEvent(contentEditable: HTMLElement, event: KeyboardEvent): CursorPosition {
    let cursorPosition = getCursorPosition();
    if (isSpecialKey(event)) {
        event.preventDefault();
        return cursorPosition;
    }

    if (event.key === "Enter") {
        event.preventDefault();
        deleteContents(cursorPosition);

        if (isCollapsed(cursorPosition)) {
            cursorPosition = insertBreak(contentEditable, cursorPosition);
            setCursorPosition(contentEditable, cursorPosition);
        }

        return cursorPosition;
    }

    if (isCursorIntersectBlocks(contentEditable)) {
        event.preventDefault();
        let key = event.key;
        if (event.key === "Delete" || event.key === "Backspace") {
            key = "";
        }
        cursorPosition = mergeBlocks(contentEditable, cursorPosition, key);
        setCursorPosition(contentEditable, cursorPosition);
        return cursorPosition;
    }

    if (event.key === "Delete" && isCursorAtEndOfBlock(contentEditable)) {
        event.preventDefault();
        cursorPosition = mergeNextBlock(contentEditable, cursorPosition);
        setCursorPosition(contentEditable, cursorPosition);
        return cursorPosition;
    }

    if (event.key === "Backspace" && isCursorAtStartOfBlock(contentEditable)) {
        event.preventDefault();
        cursorPosition = mergePreviousBlock(contentEditable, cursorPosition);
        setCursorPosition(contentEditable, cursorPosition);
        return cursorPosition;
    }

    return cursorPosition;
}