import {getSelectedBlock} from "@/core/selection/selection";
import {
    CursorPosition,
    deleteContents,
    getCursorPosition,
    getCursorPositionFrom,
    getCursorPositionFromElement, insertNode,
    isCollapsed,
    splitAtCursor
} from "@/core/shared/type/cursor-position";
import {
    getChildFragment,
    getElement,
    getFirstText,
    getLastNonEmptyText,
    getLastText,
    getNextNode, getNextNotEmptyNode,
    getPreviousNode,
    hasSelfCloseDescendant
} from "@/core/shared/element-util";
import {isCursorAtEndOfBlock, isCursorAtStartOfBlock} from "@/core/cursor/cursor";
import {anchorCursorOnLeaf} from "@/core/normalize/util/normalize-util";
import {normalize} from "@/core/normalize/normalize";
import {Display, isSchemaContain} from "@/core/normalize/type/schema";
import {
    maybeInsertLists,
    mergeIntoPreviousEmptyItem,
    mergeNextIntoEmptyItem,
    removeEmptyItem,
    splitItem
} from "@/core/list/list";
import {getDirectChildren, getLine, isListEmpty} from "@/core/list/util/list-util";

/** Merges the current block into the one before it (backspace at the start of a line). */
export function mergePreviousBlock(contentEditable: HTMLElement, cursorPosition: CursorPosition = getCursorPosition()) {
    const previousNode = getPreviousNode(contentEditable, cursorPosition.startContainer);
    if (!previousNode) {
        // An item opening the document has no line above it to merge into; if it's also
        // empty it's just dropped, moving the cursor to the start of what follows (or to the
        // paragraph the editor falls back to once the last block is gone).
        const firstBlock = getSelectedBlock(contentEditable, cursorPosition)[0];
        if (firstBlock && isSchemaContain(firstBlock, [Display.List]) && isListEmpty(firstBlock)) {
            cursorPosition = removeEmptyItem(contentEditable, cursorPosition);
            if (cursorPosition.startContainer.isConnected) {
                return cursorPosition;
            }

            const firstText = getFirstText(contentEditable);
            return getCursorPositionFrom(firstText, 0, firstText, 0);
        }

        return cursorPosition;
    }

    // An empty item above is the line the merge lands on, not an item to merge into - the
    // regular merge would otherwise trade the current item's wrapper for the empty one's.
    const previousBlock = getElement(contentEditable, getLastText(previousNode), [Display.FirstLevel, Display.List]);
    if (isMergedIntoEmptyItem(contentEditable, cursorPosition, previousBlock)) {
        return mergeIntoPreviousEmptyItem(contentEditable, cursorPosition);
    }

    // An empty item has nothing to carry up, so it's dropped instead, lowering any items
    // nested in it to the line above's level; the cursor lands at the end of that line, read
    // here before the item goes.
    const block = getSelectedBlock(contentEditable, cursorPosition)[0];
    if (previousBlock && block && isSchemaContain(block, [Display.List]) && isListEmpty(block)) {
        const lastText = getLastNonEmptyText(previousNode);
        const offset = lastText.textContent?.length ?? 0;
        removeEmptyItem(contentEditable, cursorPosition);
        return getCursorPositionFrom(lastText, offset, lastText, offset);
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

function isMergedIntoEmptyItem(contentEditable: HTMLElement, cursorPosition: CursorPosition, previousBlock: HTMLElement | null) {
    if (!previousBlock || !isSchemaContain(previousBlock, [Display.List]) || !isListEmpty(previousBlock)) {
        return false;
    }

    const block = getSelectedBlock(contentEditable, cursorPosition)[0];

    return !!block && isSchemaContain(block, [Display.List]);
}

/** Merges the block after the cursor into the current one (delete at the end of a line). */
export function mergeNextBlock(contentEditable: HTMLElement, cursorPosition: CursorPosition = getCursorPosition()) {
    // An empty item has no text of its own, so the browser anchors the cursor on the item
    // itself, which would put a nested list between the cursor and the next item and have
    // the merge delete it as selected content. Re-anchoring on the item's placeholder br
    // instead puts the nested list after the cursor, where it belongs.
    cursorPosition = anchorCursorOnLeaf(cursorPosition);
    let nextNode = getNextNode(contentEditable, cursorPosition.endContainer);
    // An empty block's placeholder br is the line itself, not content to pull up, so the
    // merge should read the node after it instead.
    if (nextNode && isPlaceholderOf(getSelectedBlock(contentEditable, cursorPosition)[0], nextNode)) {
        nextNode = getNextNode(contentEditable, nextNode);
    }
    if (!nextNode) {
        return cursorPosition;
    }

    // An empty item at the cursor is itself the line the next item merges onto (the
    // backspace merge from the other side), so it's dropped rather than merged into,
    // leaving any nested list's wrapper in place and the next item at its own level.
    if (isEmptyItemMergedInto(contentEditable, cursorPosition, nextNode)) {
        return mergeNextIntoEmptyItem(contentEditable, cursorPosition);
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

/** Whether `node` is the placeholder br standing in for `block`'s (empty) line. */
function isPlaceholderOf(block: HTMLElement | undefined, node: Node) {
    if (!block || !isListEmpty(block)) {
        return false;
    }

    return block.contains(node) && isSchemaContain(node, [Display.SelfClose]);
}

function isEmptyItemMergedInto(contentEditable: HTMLElement, cursorPosition: CursorPosition, nextNode: Node) {
    const block = getSelectedBlock(contentEditable, cursorPosition)[0];
    if (!block || !isSchemaContain(block, [Display.List]) || !isListEmpty(block)) {
        return false;
    }

    // nextNode may be the list nested inside the current item; its enclosing block says
    // whether an item actually follows.
    const nextBlock = getElement(contentEditable, getFirstText(nextNode), [Display.FirstLevel, Display.List]);

    return isSchemaContain(nextBlock, [Display.List]);
}

export function mergeBlocks(contentEditable: HTMLElement, cursorPosition: CursorPosition, pressedKey = ""): CursorPosition {
    const firstBlock = getSelectedBlock(contentEditable, cursorPosition)[0];
    const wasEmpty = !!firstBlock && isListEmpty(firstBlock);
    let cursorPositionAfterDelete = deleteContents(cursorPosition);

    const lastBlock = appendToStartOfFirstBlock(contentEditable, cursorPosition, pressedKey, firstBlock);
    if (firstBlock && wasEmpty) {
        cursorPositionAfterDelete = removePlaceholder(firstBlock, cursorPositionAfterDelete);
    }
    cursorPositionAfterDelete = maybeInsertLists(contentEditable, cursorPositionAfterDelete);

    if (lastBlock && lastBlock.isConnected) {
        const lastBlockCursorPosition = getCursorPositionFromElement(lastBlock);
        cursorPositionAfterDelete = normalize(contentEditable, lastBlockCursorPosition, cursorPositionAfterDelete);
    } else {
        cursorPositionAfterDelete = normalize(contentEditable, cursorPositionAfterDelete);
    }
    return getCursorPositionFrom(cursorPositionAfterDelete.startContainer, cursorPositionAfterDelete.startOffset + pressedKey.length, cursorPositionAfterDelete.endContainer, cursorPositionAfterDelete.endOffset + pressedKey.length);
}

/**
 * Removes an empty block's placeholder br once a merge has moved real content in (otherwise
 * it shows as a blank line above it), remapping the cursor off it - {@link maybeInsertLists}
 * and {@link normalize} both resolve from the cursor's container, and a detached one leaves
 * them silently doing nothing.
 */
function removePlaceholder(block: HTMLElement, cursorPosition: CursorPosition): CursorPosition {
    const placeholder = block.firstChild;
    if (placeholder?.nodeName !== "BR" || isListEmpty(block)) {
        return cursorPosition;
    }

    placeholder.remove();
    const firstText = getFirstText(block);

    return getCursorPositionFrom(firstText, 0, firstText, 0);
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
            const nestedListWrapper = getDirectChildren(firstBlock, [Display.ListWrapper])[0];
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

    // An item is a line of a list, so a break inside one splits the item, not the block.
    if (isSchemaContain(block, [Display.List])) {
        return splitItem(contentEditable, cursorPosition);
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
    newBlock.appendChild(splitAtCursor(block, cursorPosition));
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

    // A nested list is its own items' content, not the block's, so it's excluded here too.
    const line = getLine(block);
    if (!line.textContent) {
        if (!hasSelfCloseDescendant(line)) {
            addPlaceholder(block);
        }
        const firstText = getFirstText(block);
        return getCursorPositionFrom(firstText, 0, firstText, 0);
    }

    return normalize(contentEditable, cursorPosition);
}

/**
 * Adds a placeholder br for `block`'s now-empty line, before any nested list wrapper -
 * appending it after everything would put it below the nested list instead.
 */
function addPlaceholder(block: HTMLElement) {
    const br = document.createElement("br");
    const nestedListWrapper = getDirectChildren(block, [Display.ListWrapper])[0];
    if (nestedListWrapper) {
        nestedListWrapper.before(br);
        return;
    }

    block.appendChild(br);
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