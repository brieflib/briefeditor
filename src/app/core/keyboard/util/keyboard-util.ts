import {getSelectedBlock} from "@/core/selection/selection";
import {
    CursorPosition,
    deleteContents,
    getCursorPosition,
    getCursorPositionFrom
} from "@/core/shared/type/cursor-position";
import {getFirstText, getLastText, getNextNode, getPreviousNode} from "@/core/shared/element-util";
import {mergeLists} from "@/core/normalize/normalize";
import {Display, isSchemaContain} from "@/core/normalize/type/schema";

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
    const nextNodeFirstChild = getFirstText(nextNode);
    if (isRemoved) {
        return {...cursorPosition, startContainer: nextNodeFirstChild, startOffset: 0, endContainer: nextNodeFirstChild, endOffset: 0};
    }

    if (!nextNode.textContent) {
        (nextNode as Element)?.remove();
        return cursorPosition;
    }

    const cursorPositionAfterRemove = removeFirstEmptyBlock(contentEditable, cursorPosition);
    if (cursorPositionAfterRemove) {
        return cursorPositionAfterRemove;
    }

    cursorPosition = {...cursorPosition, endContainer: nextNodeFirstChild, endOffset: 0};
    mergeBlocks(contentEditable, cursorPosition, "");

    return cursorPosition;
}

export function mergeBlocks(contentEditable: HTMLElement, cursorPosition: CursorPosition, pressedKey = ""): CursorPosition {
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
        const child = lastBlock.firstChild;
        if (isSchemaContain(child, [Display.ListWrapper]) && !isSchemaContain(firstBlock, [Display.List])) {
            firstBlock.after(child);
        } else {
            const nestedListWrapper = firstBlock.querySelector("ul, ol");
            if (nestedListWrapper) {
                nestedListWrapper.before(child);
            } else {
                firstBlock.appendChild(child);
            }
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
    if (event.ctrlKey || event.altKey || event.metaKey) {
        return true;
    }

    return [
        "Control", "Alt", "Meta", "Escape", "Insert",
        "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",
        "CapsLock", "NumLock", "ScrollLock", "Pause"
    ].includes(event.key);
}

function removeFirstEmptyBlock(contentEditable: HTMLElement, cursorPosition: CursorPosition) {
    const firstBlock = getSelectedBlock(contentEditable)[0];
    if (firstBlock) {
        const firstChild = getFirstText(firstBlock);
        if (!firstChild.textContent) {
            const parentLi = firstBlock.parentElement;
            let lastNode;
            if (parentLi) {
                while (firstBlock.firstChild) {
                    lastNode = firstBlock.firstChild;
                    parentLi.before(lastNode);
                }
                parentLi.remove();
                (firstChild as Element).remove();
            }
            if (!lastNode) {
                return null;
            }
            return {...cursorPosition, endContainer: getFirstText(lastNode), endOffset: 0};
        }
    } else {
        return null;
    }
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