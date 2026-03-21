import {getSelectedBlock} from "@/core/selection/selection";
import {
    CursorPosition,
    deleteContents,
    getCursorPosition,
    getCursorPositionFrom
} from "@/core/shared/type/cursor-position";
import {isListMergeAllowed} from "@/core/list/list";
import {getFirstText, getLastText, getNextNode, getPreviousNode} from "@/core/shared/element-util";
import {mergeLists} from "@/core/normalize/normalize";

export function mergePreviousBlock(contentEditable: HTMLElement, cursorPosition: CursorPosition = getCursorPosition()) {
    const previousNode = getPreviousNode(contentEditable, cursorPosition.startContainer);
    if (!previousNode) {
        return cursorPosition;
    }

    const isRemoved = removeEmptyBlock(contentEditable, previousNode);
    if (isRemoved) {
        return cursorPosition;
    }

    if (!previousNode.textContent) {
        (previousNode as Element)?.remove();
        return cursorPosition;
    }

    const lastChild = getLastText(previousNode);
    if (lastChild.textContent) {
        cursorPosition = {...cursorPosition, startContainer: lastChild, startOffset: lastChild.textContent.length};
        mergeBlocks(contentEditable, cursorPosition, "");
    }

    return cursorPosition;
}

export function mergeNextBlock(contentEditable: HTMLElement, cursorPosition: CursorPosition = getCursorPosition()) {
    const nextNode = getNextNode(contentEditable, cursorPosition.endContainer);
    if (!nextNode) {
        return cursorPosition;
    }

    const isRemoved = removeEmptyBlock(contentEditable, nextNode);
    const firstChild = getFirstText(nextNode);
    if (isRemoved) {
        return {...cursorPosition, startContainer: firstChild, startOffset: 0, endContainer: firstChild, endOffset: 0};
    }

    if (!nextNode.textContent) {
        (nextNode as Element)?.remove();
        return cursorPosition;
    }

    cursorPosition = {...cursorPosition, endContainer: firstChild, endOffset: 0};
    mergeBlocks(contentEditable, cursorPosition, "");

    return cursorPosition;
}

export function mergeBlocks(contentEditable: HTMLElement, cursorPosition: CursorPosition, pressedKey = ""): CursorPosition {
    if (!isListMergeAllowed(contentEditable)) {
        return cursorPosition;
    }

    const blocks = getSelectedBlock(contentEditable, cursorPosition);
    const firstBlock = blocks[0];
    const lastBlock = blocks[blocks.length - 1];
    if (!firstBlock || !lastBlock || firstBlock === lastBlock) {
        return cursorPosition;
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
    mergeLists(contentEditable, cursorPosition);

    return cursorPosition;
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

function isKeyPrintable(key: string) {
    return key.length === 1;
}

function removeEmptyBlock(contentEditable: HTMLElement, node: Node) {
    const block = getSelectedBlock(contentEditable);
    const firstBlock = block[0];
    if (!firstBlock) {
        return true;
    }
    if (!firstBlock.textContent && node.textContent) {
        firstBlock.remove();
        return true;
    }

    return false;
}