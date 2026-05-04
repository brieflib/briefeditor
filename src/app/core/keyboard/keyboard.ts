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
    getCursorPositionFrom,
    isCollapsed, isCursorPositionEqual,
    setCursorPosition
} from "@/core/shared/type/cursor-position";
import {normalize} from "@/core/normalize/normalize";

export function handleEvent(contentEditable: HTMLElement, event: KeyboardEvent): CursorPosition {
    let cursorPosition = getCursorPosition();
    if (isSpecialKey(event)) {
        event.preventDefault();
        return cursorPosition;
    }

    if (event.key === "Enter") {
        event.preventDefault();
        if (!isCollapsed(cursorPosition)) {
            deleteContents(cursorPosition);
            cursorPosition = getCursorPositionFrom(
                cursorPosition.startContainer, cursorPosition.startOffset,
                cursorPosition.startContainer, cursorPosition.startOffset
            );
        }
        const nextBlockCursorPosition = insertBreak(contentEditable, cursorPosition);
        if (isCursorPositionEqual(cursorPosition, nextBlockCursorPosition)) {
            cursorPosition = normalize(contentEditable, cursorPosition);
        } else {
            normalize(contentEditable, cursorPosition);
            cursorPosition = normalize(contentEditable, nextBlockCursorPosition);
        }

        setCursorPosition(contentEditable, cursorPosition);
        return cursorPosition;
    }

    if (isCursorIntersectBlocks(contentEditable)) {
        event.preventDefault();
        let key = event.key;
        if (event.key === "Delete" || event.key === "Backspace") {
            key = "";
        }
        cursorPosition = mergeBlocks(contentEditable, cursorPosition, key);
        cursorPosition = normalize(contentEditable, cursorPosition);
        setCursorPosition(contentEditable, cursorPosition);
        return cursorPosition;
    }

    if (event.key === "Delete" && isCursorAtEndOfBlock(contentEditable)) {
        event.preventDefault();
        cursorPosition = mergeNextBlock(contentEditable, cursorPosition);
        cursorPosition = normalize(contentEditable, cursorPosition);
        setCursorPosition(contentEditable, cursorPosition);
        return cursorPosition;
    }

    if (event.key === "Backspace" && isCursorAtStartOfBlock(contentEditable)) {
        event.preventDefault();
        cursorPosition = mergePreviousBlock(contentEditable, cursorPosition);
        cursorPosition = normalize(contentEditable, cursorPosition);
        setCursorPosition(contentEditable, cursorPosition);
        return cursorPosition;
    }

    return cursorPosition;
}