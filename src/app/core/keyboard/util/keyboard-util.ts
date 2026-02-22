import {getSelectedBlock} from "@/core/selection/selection";
import {getRange} from "@/core/shared/range-util";
import {CursorPosition} from "@/core/shared/type/cursor-position";
import {setCursorPosition} from "@/core/cursor/cursor";
import {isListMergeAllowed} from "@/core/list/list";
import {getFirstText, getLastText, getNextNode, getPreviousNode} from "@/core/shared/element-util";
import {normalizeRootElements} from "@/core/normalize/normalize";

export function mergePreviousBlock(contentEditable: HTMLElement, cursorPosition: CursorPosition) {
    const isRemoved = removeEmptyBlock(contentEditable);
    if (isRemoved) {
        setCursorPosition(contentEditable, cursorPosition);
        return;
    }

    const range = getRange();
    const previousNode = getPreviousNode(contentEditable, range.startContainer);
    if (!previousNode) {
        return;
    }
    const lastChild = getLastText(previousNode);

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
    if (!nextNode) {
        return;
    }
    const firstChild = getFirstText(nextNode);

    if (!firstChild.textContent) {
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

    const blocks = getSelectedBlock(contentEditable, range);
    const firstBlock = blocks[0];
    const lastBlock = blocks[blocks.length - 1];
    if (!firstBlock || !lastBlock || firstBlock === lastBlock) {
        return;
    }

    range.deleteContents();

    if (isKeyPrintable(pressedKey)) {
        const textNode = document.createTextNode(pressedKey);
        lastBlock.firstChild?.before(textNode);
    }

    while (lastBlock.firstChild) {
        const nestedListWrapper = firstBlock.querySelector("ul, ol");
        if (nestedListWrapper) {
            nestedListWrapper.before(lastBlock.firstChild);
        } else {
            firstBlock.appendChild(lastBlock.firstChild);
        }
    }
    lastBlock.remove();

    cursorPosition = {
        startContainer: cursorPosition.startContainer,
        startOffset: cursorPosition.startOffset,
        endContainer: cursorPosition.endContainer,
        endOffset: 0
    }
    normalizeRootElements(contentEditable, cursorPosition);
    //setCursorPosition(contentEditable, cursorPosition, false);
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

function removeEmptyElement(contentEditable: HTMLElement, element: HTMLElement) {
    const parent = element.parentElement;
    if (!element.firstChild) {
        element.remove();
    }
    if (parent && parent !== contentEditable) {
        removeEmptyElement(contentEditable, parent);
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
    if (!getFirstText(firstBlock).textContent) {
        firstBlock.remove();
        return true;
    }

    return false;
}