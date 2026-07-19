import {getSelectedBlock} from "@/core/selection/selection";
import {
    CursorPosition,
    deleteContents,
    extractContents,
    getCursorPosition,
    getCursorPositionFrom,
    getCursorPositionFromElement, insertNode,
    isCollapsed
} from "@/core/shared/type/cursor-position";
import {
    getChildFragment,
    getFirstText,
    getLastNonEmptyText,
    getNextNode, getNextNotEmptyNode,
    getPreviousNode,
    hasSelfCloseDescendant
} from "@/core/shared/element-util";
import {isCursorAtEndOfBlock, isCursorAtStartOfBlock} from "@/core/cursor/cursor";
import {normalize} from "@/core/normalize/normalize";
import {Display, isSchemaContain} from "@/core/normalize/type/schema";
import {maybeInsertLists} from "@/core/list/list";

export function mergePreviousBlock(contentEditable: HTMLElement, cursorPosition: CursorPosition = getCursorPosition()) {
    const previousNode = getPreviousNode(contentEditable, cursorPosition.startContainer);
    if (!previousNode) {
        return cursorPosition;
    }

    const lastText = getLastNonEmptyText(previousNode);
    if (lastText.textContent) {
        cursorPosition = getCursorPositionFrom(lastText, lastText.textContent.length, cursorPosition.endContainer, cursorPosition.endOffset);
    }
    cursorPosition = mergeBlocks(contentEditable, cursorPosition, "");
    if (!previousNode.textContent) {
        (previousNode as Element)?.remove();
    }

    return cursorPosition;
}

export function mergeNextBlock(contentEditable: HTMLElement, cursorPosition: CursorPosition = getCursorPosition()) {
    const nextNode = getNextNode(contentEditable, cursorPosition.endContainer);
    if (!nextNode) {
        return cursorPosition;
    }
    const previousNode = getPreviousNode(contentEditable, cursorPosition.startContainer);
    const isRemoved = removeEmptyBlock(contentEditable, nextNode);
    const nextNodeFirstChild = getFirstText(nextNode);
    if (isRemoved && previousNode) {
        const lastText = getLastNonEmptyText(previousNode);
        const offset = lastText.textContent?.length ?? 0;
        return getCursorPositionFrom(lastText, offset, lastText, offset);
    }
    if (isRemoved) {
        return getCursorPositionFrom(nextNodeFirstChild, 0, nextNodeFirstChild, 0);
    }

    if (!nextNode.textContent && !isSchemaContain(nextNode, [Display.SelfClose])) {
        (nextNode as Element)?.remove();
        return cursorPosition;
    }

    cursorPosition = getCursorPositionFrom(cursorPosition.startContainer, cursorPosition.startOffset, nextNodeFirstChild, 0);
    return mergeBlocks(contentEditable, cursorPosition, "");
}

export function mergeBlocks(contentEditable: HTMLElement, cursorPosition: CursorPosition, pressedKey = ""): CursorPosition {
    const firstBlock = getSelectedBlock(contentEditable, cursorPosition)[0];
    let cursorPositionAfterDelete = deleteContents(cursorPosition);

    const lastBlock = appendToStartOfFirstBlock(contentEditable, cursorPosition, pressedKey, firstBlock);
    cursorPositionAfterDelete = maybeInsertLists(contentEditable, cursorPositionAfterDelete);

    if (lastBlock && lastBlock.isConnected) {
        const lastBlockCursorPosition = getCursorPositionFromElement(lastBlock);
        cursorPositionAfterDelete = normalize(contentEditable, lastBlockCursorPosition, cursorPositionAfterDelete);
    } else {
        cursorPositionAfterDelete = normalize(contentEditable, cursorPositionAfterDelete);
    }
    return getCursorPositionFrom(cursorPositionAfterDelete.startContainer, cursorPositionAfterDelete.startOffset + pressedKey.length, cursorPositionAfterDelete.endContainer, cursorPositionAfterDelete.endOffset + pressedKey.length);
}

export function isSpecialKey(event: KeyboardEvent) {
    if (event.ctrlKey || event.altKey || event.metaKey) {
        return true;
    }

    return [
        "Control", "Alt", "Meta", "Escape", "Insert", "Shift",
        "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",
        "CapsLock", "NumLock", "ScrollLock", "Pause"
    ].includes(event.key);
}

function appendToStartOfFirstBlock(contentEditable: HTMLElement, cursorPosition: CursorPosition, pressedKey = "", firstBlock?: HTMLElement) {
    const blocks = getSelectedBlock(contentEditable, cursorPosition);
    const lastBlock = blocks[blocks.length - 1];
    if (firstBlock && lastBlock) {
        if (isKeyPrintable(pressedKey)) {
            const textNode = document.createTextNode(pressedKey);
            getFirstText(firstBlock).after(textNode);
            const fragment = getChildFragment(lastBlock);
            const nestedListWrapper = firstBlock.querySelector("ul, ol");
            if (nestedListWrapper) {
                nestedListWrapper.before(fragment);
            } else {
                firstBlock.appendChild(fragment);
            }
        }
    }

    return lastBlock;
}

function isKeyPrintable(key: string) {
    return key.length === 1 || key.length === 0;
}

export function insertBreak(contentEditable: HTMLElement, cursorPosition: CursorPosition): CursorPosition {
    const br = document.createElement("br");
    insertNode(cursorPosition, br);
    const nextLine = getNextNotEmptyNode(contentEditable, br);
    if (!nextLine) {
        return cursorPosition;
    }

    const firstText = getFirstText(nextLine);
    return getCursorPositionFrom(firstText, 0, firstText, 0);
}

export function newLine(contentEditable: HTMLElement, cursorPosition: CursorPosition): CursorPosition {
    const block = getSelectedBlock(contentEditable, cursorPosition)[0];
    if (!block) {
        return cursorPosition;
    }

    if (isCursorAtEndOfBlock(contentEditable, cursorPosition)) {
        const emptyBlock = document.createElement(block.nodeName);
        emptyBlock.appendChild(document.createElement("br"));
        block.after(emptyBlock);
        const emptyFirstText = getFirstText(emptyBlock);
        return getCursorPositionFrom(emptyFirstText, 0, emptyFirstText, 0);
    }

    if (isCursorAtStartOfBlock(contentEditable, cursorPosition)) {
        const emptyBlock = document.createElement(block.nodeName);
        emptyBlock.appendChild(document.createElement("br"));
        block.before(emptyBlock);
        return cursorPosition;
    }

    const newBlock = document.createElement(block.nodeName);
    cursorPosition = getCursorPositionFrom(cursorPosition.startContainer, cursorPosition.startOffset, block, block.childNodes.length);

    const fragment = extractContents(cursorPosition);
    Array.from(fragment.childNodes).forEach(child => {
        if (child.nodeType === Node.TEXT_NODE && !child.textContent) {
            child.remove();
        }
    });
    newBlock.appendChild(fragment);
    block.after(newBlock);

    const firstText = getFirstText(newBlock);
    return getCursorPositionFrom(firstText, 0, firstText, 0);
}

export function isPrintableKey(event: KeyboardEvent) {
    return event.key.length === 1;
}

export function insertCharacter(contentEditable: HTMLElement, cursorPosition: CursorPosition, key: string): CursorPosition {
    if (!isCollapsed(cursorPosition)) {
        cursorPosition = deleteContents(cursorPosition);
    }

    const container = cursorPosition.startContainer;
    if (container.nodeType === Node.TEXT_NODE) {
        const text = container as Text;
        text.insertData(cursorPosition.startOffset, key);
        const offset = cursorPosition.startOffset + key.length;
        return getCursorPositionFrom(text, offset, text, offset);
    }

    const textNode = document.createTextNode(key);
    if (isSchemaContain(container, [Display.SelfClose])) {
        (container as Element).before(textNode);
        (container as Element).remove();
        return getCursorPositionFrom(textNode, key.length, textNode, key.length);
    }

    const block = getSelectedBlock(contentEditable, cursorPosition)[0];
    const wasEmpty = block ? !block.textContent : false;
    insertNode(cursorPosition, textNode);
    if (block && wasEmpty) {
        block.querySelectorAll("br").forEach(br => br.remove());
    }

    return getCursorPositionFrom(textNode, key.length, textNode, key.length);
}

export function deletePreviousCharacter(contentEditable: HTMLElement, cursorPosition: CursorPosition): CursorPosition {
    return deleteCharacter(contentEditable, cursorPosition, Direction.Previous);
}

export function deleteNextCharacter(contentEditable: HTMLElement, cursorPosition: CursorPosition): CursorPosition {
    return deleteCharacter(contentEditable, cursorPosition, Direction.Next);
}

function deleteCharacter(contentEditable: HTMLElement, cursorPosition: CursorPosition, direction: Direction): CursorPosition {
    const container = cursorPosition.startContainer;
    if (isCursorInsideText(container, cursorPosition.startOffset, direction)) {
        return deleteCharacterAt(contentEditable, container as Text, cursorPosition.startOffset, direction);
    }

    const block = getSelectedBlock(contentEditable, cursorPosition)[0];
    if (!block) {
        return cursorPosition;
    }

    const leaf = findLeaf(block, container, cursorPosition.startOffset, direction);
    if (!leaf) {
        return cursorPosition;
    }

    if (isSchemaContain(leaf, [Display.SelfClose])) {
        (leaf as Element).remove();
        return addBrForEmptyBlockAndNormalize(contentEditable, cursorPosition);
    }

    const text = leaf as Text;
    const offset = direction === Direction.Previous ? text.data.length : 0;
    return deleteCharacterAt(contentEditable, text, offset, direction);
}

function isCursorInsideText(container: Node, offset: number, direction: Direction) {
    if (container.nodeType !== Node.TEXT_NODE) {
        return false;
    }

    return direction === Direction.Previous ? offset > 0 : offset < (container as Text).length;
}

function deleteCharacterAt(contentEditable: HTMLElement, text: Text, offset: number, direction: Direction): CursorPosition {
    const length = direction === Direction.Previous ? charLengthBefore(text.data, offset) : charLengthAfter(text.data, offset);
    const deleteFrom = direction === Direction.Previous ? offset - length : offset;
    text.deleteData(deleteFrom, length);
    if (text.data) {
        return getCursorPositionFrom(text, deleteFrom, text, deleteFrom);
    }
    return addBrForEmptyBlockAndNormalize(contentEditable, getCursorPositionFrom(text, 0, text, 0));
}

export function addBrForEmptyBlockAndNormalize(contentEditable: HTMLElement, cursorPosition: CursorPosition): CursorPosition {
    const block = getSelectedBlock(contentEditable, cursorPosition)[0];
    if (!block) {
        return cursorPosition;
    }

    if (!block.textContent) {
        if (!hasSelfCloseDescendant(block)) {
            block.appendChild(document.createElement("br"));
        }
        const firstText = getFirstText(block);
        return getCursorPositionFrom(firstText, 0, firstText, 0);
    }

    return normalize(contentEditable, cursorPosition);
}

enum Direction {
    Previous,
    Next
}

function findLeaf(block: HTMLElement, container: Node, offset: number, direction: Direction): Node | null {
    let candidate = firstCandidate(block, container, offset, direction);

    while (candidate) {
        if (!block.contains(candidate)) {
            return null;
        }
        const leaf = direction === Direction.Previous ? getLastNonEmptyText(candidate) : getFirstText(candidate);
        if ((leaf.nodeType === Node.TEXT_NODE && leaf.textContent) || isSchemaContain(leaf, [Display.SelfClose])) {
            return leaf;
        }
        candidate = direction === Direction.Previous ? getPreviousNode(block, candidate) : getNextNode(block, candidate);
    }

    return null;
}

function firstCandidate(block: HTMLElement, container: Node, offset: number, direction: Direction): Node | null {
    if (container.nodeType !== Node.TEXT_NODE) {
        if (direction === Direction.Previous && offset > 0) {
            return container.childNodes[offset - 1] ?? null;
        }
        if (direction === Direction.Next && offset < container.childNodes.length) {
            return container.childNodes[offset] ?? null;
        }
    }

    return direction === Direction.Previous ? getPreviousNode(block, container) : getNextNode(block, container);
}

function charLengthBefore(data: string, offset: number) {
    if (offset >= 2 && isLowSurrogate(data.charCodeAt(offset - 1)) && isHighSurrogate(data.charCodeAt(offset - 2))) {
        return 2;
    }
    return 1;
}

function charLengthAfter(data: string, offset: number) {
    if (offset + 1 < data.length && isHighSurrogate(data.charCodeAt(offset)) && isLowSurrogate(data.charCodeAt(offset + 1))) {
        return 2;
    }
    return 1;
}

function isHighSurrogate(code: number) {
    return code >= 0xD800 && code <= 0xDBFF;
}

function isLowSurrogate(code: number) {
    return code >= 0xDC00 && code <= 0xDFFF;
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