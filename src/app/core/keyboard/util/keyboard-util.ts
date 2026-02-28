import {getSelectedBlock} from "@/core/selection/selection";
import {
    CursorPosition,
    deleteContents,
    getCursorPosition,
    getCursorPositionFrom,
    setCursorPosition
} from "@/core/shared/type/cursor-position";
import {isListMergeAllowed} from "@/core/list/list";
import {getFirstText, getLastText, getNextNode, getPreviousNode} from "@/core/shared/element-util";
import {normalizeRootElements} from "@/core/normalize/normalize";

export function mergePreviousBlock(contentEditable: HTMLElement, cursorPosition: CursorPosition = getCursorPosition()) {
    const isRemoved = removeEmptyBlock(contentEditable);
    if (isRemoved) {
        setCursorPosition(contentEditable, cursorPosition);
        return;
    }

    const previousNode = getPreviousNode(contentEditable, cursorPosition.startContainer);
    if (!previousNode) {
        return;
    }
    const lastChild = getLastText(previousNode);

    if (!lastChild) {
        (previousNode as Element)?.remove();
        return;
    }

    if (lastChild.textContent) {
        cursorPosition = {...cursorPosition, startContainer: lastChild, startOffset: lastChild.textContent.length};
        mergeBlocks(contentEditable, cursorPosition, "");
    }
}

export function mergeNextBlock(contentEditable: HTMLElement, cursorPosition: CursorPosition = getCursorPosition()) {
    const isRemoved = removeEmptyBlock(contentEditable);
    if (isRemoved) {
        setCursorPosition(contentEditable, cursorPosition);
        return;
    }

    const nextNode = getNextNode(contentEditable, cursorPosition.endContainer);
    if (!nextNode) {
        return;
    }
    const firstChild = getFirstText(nextNode);

    if (!firstChild.textContent) {
        (nextNode as Element)?.remove();
        return;
    }

    cursorPosition = {...cursorPosition, endContainer: firstChild, endOffset: 0};
    mergeBlocks(contentEditable, cursorPosition, "");
}

export function mergeBlocks(contentEditable: HTMLElement, cursorPosition: CursorPosition, pressedKey = "") {
    if (!isListMergeAllowed(contentEditable)) {
        return;
    }

    const blocks = getSelectedBlock(contentEditable, cursorPosition);
    const firstBlock = blocks[0];
    const lastBlock = blocks[blocks.length - 1];
    if (!firstBlock || !lastBlock || firstBlock === lastBlock) {
        return;
    }

    deleteContents(cursorPosition);

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

    cursorPosition = getCursorPositionFrom(cursorPosition.startContainer,
        cursorPosition.startOffset,
        cursorPosition.endContainer,
        0);
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