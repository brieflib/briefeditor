import {getSelectedBlock} from "@/core/selection/selection";
import {getRange} from "@/core/shared/range-util";
import {CursorPosition} from "@/core/cursor/type/cursor-position";
import {restoreRange} from "@/core/cursor/cursor";

export function mergeNextBlock(contentEditable: HTMLElement) {
    const block = getSelectedBlock(contentEditable)[0];
    if (!block) {
        return;
    }
    const next = block.nextElementSibling;
    if (!next) {
        return;
    }

    while (next.firstChild) {
        block.appendChild(next.firstChild);
    }

    next.remove();
    block.normalize();
}

export function mergePreviousBlock(contentEditable: HTMLElement, cursorPosition: CursorPosition) {
    const range = restoreRange(contentEditable, cursorPosition);
    const block = getSelectedBlock(contentEditable, range)[0];
    if (!block) {
        return;
    }

    const previous = block.previousElementSibling;
    if (!previous) {
        return;
    }

    while (block.firstChild) {
        previous.appendChild(block.firstChild);
    }

    block.remove();
    previous.normalize();

    return true;
}

export function mergeBlocks(contentEditable: HTMLElement, cursorPosition: CursorPosition, pressedKey: string, range = getRange()) {
    if (isKeyPrintable(pressedKey)) {
        const textNode = document.createTextNode(pressedKey);
        range.insertNode(textNode);
        cursorPosition.startOffset = cursorPosition.startOffset + 1;
        cursorPosition.endOffset = cursorPosition.endOffset + 1;
    }
    const shiftRange = restoreRange(contentEditable, cursorPosition);

    const blocks = getSelectedBlock(contentEditable);
    const firstBlock = blocks[0];
    const lastBlock = blocks[blocks.length - 1];
    if (!firstBlock || !lastBlock) {
        return;
    }

    shiftRange.deleteContents();

    while (lastBlock.firstChild) {
        firstBlock.appendChild(lastBlock.firstChild);
    }
    lastBlock.remove();
    firstBlock.normalize();
}

export function isSpecialKey(event: KeyboardEvent) {
    if (event.ctrlKey || event.altKey || event.shiftKey || event.metaKey) {
        return true;
    }

    return [
        "Tab", "Enter", "Shift", "Control", "Alt", "Meta",
        "Escape", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
        "Home", "End", "PageUp", "PageDown", "Insert",
        "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",
        "CapsLock", "NumLock", "ScrollLock", "Pause"
    ].includes(event.key);
}

function isKeyPrintable(key: string) {
    return key.length === 1;
}