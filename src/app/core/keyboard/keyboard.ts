import {isCursorAtEndOfBlock, isCursorAtStartOfBlock, isCursorIntersectBlocks} from "@/core/cursor/cursor";
import {
    newLine,
    isSpecialKey,
    mergeBlocks,
    mergeNextBlock,
    mergePreviousBlock, insertBreak,
    cleanupAfterDeletion,
    deleteNextCharacter,
    deletePreviousCharacter,
    insertCharacter,
    isPrintableKey
} from "@/core/keyboard/util/keyboard-util";
import {
    CursorPosition,
    deleteContents,
    getCursorPosition,
    isCollapsed,
    setCursorPosition
} from "@/core/shared/type/cursor-position";
import {normalize} from "@/core/normalize/normalize";
import {Display, isSchemaContain} from "@/core/normalize/type/schema";

export function handleKeyboardEvent(contentEditable: HTMLElement, event: KeyboardEvent, cursorPosition = getCursorPosition()): CursorPosition {
    if (isSpecialKey(event)) {
        return cursorPosition;
    }

    if (event.key === "Enter") {
        event.preventDefault();
        if (!isCollapsed(cursorPosition)) {
            cursorPosition = deleteContents(cursorPosition);
        }
        let breakCursorPosition = event.shiftKey ? insertBreak(contentEditable, cursorPosition) : newLine(contentEditable, cursorPosition);

        if (isSchemaContain(breakCursorPosition.startContainer, [Display.SelfClose]) &&
            isSchemaContain(breakCursorPosition.endContainer, [Display.SelfClose])) {
            setCursorPosition(contentEditable, breakCursorPosition);
            return breakCursorPosition;
        }

        breakCursorPosition = normalize(contentEditable, cursorPosition, breakCursorPosition);
        setCursorPosition(contentEditable, breakCursorPosition);
        return breakCursorPosition;
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

    if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        if (!isCollapsed(cursorPosition)) {
            const isTextOnly = cursorPosition.startContainer === cursorPosition.endContainer &&
                cursorPosition.startContainer.nodeType === Node.TEXT_NODE;
            cursorPosition = deleteContents(cursorPosition);
            if (!isTextOnly || !cursorPosition.startContainer.textContent) {
                cursorPosition = cleanupAfterDeletion(contentEditable, cursorPosition);
            }
        } else {
            cursorPosition = event.key === "Backspace"
                ? deletePreviousCharacter(contentEditable, cursorPosition)
                : deleteNextCharacter(contentEditable, cursorPosition);
        }
        setCursorPosition(contentEditable, cursorPosition);
        return cursorPosition;
    }

    if (isPrintableKey(event)) {
        event.preventDefault();
        cursorPosition = insertCharacter(contentEditable, cursorPosition, event.key);
        setCursorPosition(contentEditable, cursorPosition);
        return cursorPosition;
    }

    return cursorPosition;
}