import {getSelectedBlock} from "@/core/selection/selection";
import {getRange} from "@/core/shared/range-util";
import {CursorPosition} from "@/core/cursor/type/cursor-position";
import {restoreRange, setCursorPosition} from "@/core/cursor/cursor";
import {isListMergeAllowed} from "@/core/list/list";
import {getFirstText, getLastText, getNextNode, getPreviousNode} from "@/core/shared/element-util";
import {normalizeRootElements} from "@/core/normalize/normalize";

export function mergePreviousBlock(contentEditable: HTMLElement, cursorPosition: CursorPosition) {
    const range = getRange();
    const previousNode = getPreviousNode(contentEditable, range.startContainer);
    const lastChild = getLastText(previousNode);

    const isRemoved = removeEmptyBlock(contentEditable);
    if (isRemoved) {
        setCursorPosition(contentEditable, cursorPosition);
        return;
    }

    if (!lastChild) {
        (previousNode as Element)?.remove();
        return;
    }

    if (lastChild.textContent) {
        range.setStart(lastChild, lastChild.textContent.length);
        mergeBlocks(contentEditable, cursorPosition, "", range);
    }
}

export function mergeNextBlock(contentEditable: HTMLElement, cursorPosition: CursorPosition) {
    const isRemoved = removeEmptyBlock(contentEditable);
    if (isRemoved) {
        setCursorPosition(contentEditable, cursorPosition);
        return;
    }

    const range = getRange();
    const nextNode = getNextNode(contentEditable, range.endContainer);
    const firstChild = getFirstText(nextNode);

    if (!firstChild) {
        (nextNode as Element)?.remove();
        return;
    }

    range.setEnd(firstChild, 0);
    mergeBlocks(contentEditable, cursorPosition, "", range);
}

export function mergeBlocks(contentEditable: HTMLElement, cursorPosition: CursorPosition, pressedKey = "", range = getRange()) {
    if (!isListMergeAllowed(contentEditable)) {
        return;
    }

    let shiftRange = range;
    if (isKeyPrintable(pressedKey)) {
        const textNode = document.createTextNode(pressedKey);
        range.insertNode(textNode);
        cursorPosition.startOffset = cursorPosition.startOffset + 1;
        cursorPosition.endOffset = cursorPosition.endOffset + 1;
        shiftRange = restoreRange(contentEditable, cursorPosition, true);
    }

    const blocks = getSelectedBlock(contentEditable, shiftRange);
    const firstBlock = blocks[0];
    const lastBlock = blocks[blocks.length - 1];
    if (!firstBlock || !lastBlock || firstBlock === lastBlock) {
        return;
    }

    shiftRange.deleteContents();

    while (lastBlock.firstChild) {
        const nestedListWrapper = firstBlock.querySelector("ul, ol");
        if (nestedListWrapper) {
            nestedListWrapper.before(lastBlock.firstChild);
        } else {
            firstBlock.appendChild(lastBlock.firstChild);
        }
        removeEmptyListWrapper(contentEditable, lastBlock);
    }
    lastBlock.remove();
    firstBlock.normalize();

    cursorPosition.endOffset = cursorPosition.startOffset;
    normalizeRootElements(contentEditable, cursorPosition);
    setCursorPosition(contentEditable, cursorPosition, false);
}

export function isSpecialKey(event: KeyboardEvent) {
    if (event.ctrlKey || event.altKey || event.shiftKey || event.metaKey) {
        return true;
    }

    return [
        "Enter", "Tab", "Shift", "Control", "Alt", "Meta",
        "Escape", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
        "Home", "End", "PageUp", "PageDown", "Insert",
        "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",
        "CapsLock", "NumLock", "ScrollLock", "Pause"
    ].includes(event.key);
}

function removeEmptyListWrapper(contentEditable: HTMLElement, list: HTMLElement) {
    const parent = list.parentElement;
    if (!list.firstChild) {
        list.remove();
    }
    if (parent && parent !== contentEditable) {
        removeEmptyListWrapper(contentEditable, parent);
    }
}

function isKeyPrintable(key: string) {
    return key.length === 1;
}

function removeEmptyBlock(contentEditable: HTMLElement) {
    const block = getSelectedBlock(contentEditable);
    const firstBlock = block[0];
    if (!firstBlock) {
        return true;
    }
    if (!getFirstText(firstBlock)) {
        firstBlock.remove();
        return true;
    }

    return false;
}