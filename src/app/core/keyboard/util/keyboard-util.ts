import {getFirstSelectedRoot, getSelectedBlock} from "@/core/selection/selection";
import {
    CursorPosition,
    deleteContents,
    extractContents,
    getCursorPosition,
    getCursorPositionFrom
} from "@/core/shared/type/cursor-position";
import {
    getChildFragment,
    getFirstText,
    getLastNonEmptyText,
    getNextNode,
    getPreviousNode
} from "@/core/shared/element-util";
import {Display, isSchemaContain} from "@/core/normalize/type/schema";
import {appendBeforeAndDelete} from "@/core/list/util/list-util";
import {convertList, normalizeLists, parseList} from "@/core/list/type/list-class";
import {isCursorAtEndOfBlock, isCursorAtStartOfBlock} from "@/core/cursor/cursor";

export function mergePreviousBlock(contentEditable: HTMLElement, cursorPosition: CursorPosition = getCursorPosition()) {
    const emptyParentResult = removeEmptyParentListItem(contentEditable, cursorPosition);
    if (emptyParentResult) {
        return emptyParentResult;
    }

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

    const lastChild = getLastNonEmptyText(previousNode);
    if (lastChild.textContent) {
        cursorPosition = {...cursorPosition, startContainer: lastChild, startOffset: lastChild.textContent.length};
        mergeBlocks(contentEditable, cursorPosition, "");
        cursorPosition = getCursorPositionFrom(lastChild, lastChild.textContent.length, lastChild, lastChild.textContent.length);
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
        return getCursorPositionFrom(nextNodeFirstChild, 0, nextNodeFirstChild, 0);
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
    const firstBlock = getSelectedBlock(contentEditable, cursorPosition)[0];
    deleteContents(cursorPosition);

    const lastBlock = appendToStartOfFirstBlock(contentEditable, cursorPosition, pressedKey, firstBlock);
    const firstListWrapper = getFirstSelectedRoot(contentEditable, cursorPosition);
    const lists = parseList(firstListWrapper);
    const normalizedLists = normalizeLists(lists);
    const listWrappers = convertList(normalizedLists);
    appendBeforeAndDelete(firstListWrapper, listWrappers);

    deleteEmptyBlocks(lastBlock);

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
            const parentListWrapper = firstBlock.parentElement;
            if (!parentListWrapper) {
                return null;
            }

            const firstNestedList = Array.from(firstBlock.children)
                .find(child => isSchemaContain(child, [Display.ListWrapper])) as HTMLElement | undefined;
            if (!firstNestedList?.firstElementChild) {
                return null;
            }

            const firstNestedListTag = firstNestedList.nodeName;
            const isSameType = firstNestedListTag === parentListWrapper.nodeName;

            const promotedLi = firstNestedList.firstElementChild;
            promotedLi.remove();

            if (firstNestedList.firstElementChild) {
                promotedLi.appendChild(firstNestedList);
            } else {
                firstNestedList.remove();
            }

            while (firstBlock.firstChild) {
                const child = firstBlock.firstChild;
                if (isSchemaContain(child, [Display.ListWrapper])) {
                    promotedLi.appendChild(child);
                } else {
                    child.remove();
                }
            }

            if (isSameType) {
                firstBlock.before(promotedLi);
            } else {
                const wrapper = document.createElement(firstNestedListTag);
                wrapper.appendChild(promotedLi);
                parentListWrapper.before(wrapper);
            }

            firstBlock.remove();
            if (!parentListWrapper.firstElementChild) {
                parentListWrapper.remove();
            }

            return {...cursorPosition, endContainer: getFirstText(promotedLi), endOffset: 0};
        }
    } else {
        return null;
    }
}

function appendToStartOfFirstBlock(contentEditable: HTMLElement, cursorPosition: CursorPosition, pressedKey = "", firstBlock?: HTMLElement) {
    const blocks = getSelectedBlock(contentEditable, cursorPosition);
    const lastBlock = blocks[blocks.length - 1];
    if (firstBlock && lastBlock) {
        if (isKeyPrintable(pressedKey)) {
            const textNode = document.createTextNode(pressedKey);
            getFirstText(lastBlock).before(textNode);
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

function deleteEmptyBlocks(lastBlock: HTMLElement | undefined) {
    let forDelete = lastBlock;
    while (forDelete?.parentElement && !forDelete.textContent) {
        const parentElement = forDelete.parentElement;
        forDelete.remove();
        forDelete = parentElement;
    }
}

function isKeyPrintable(key: string) {
    return key.length === 1 || key.length === 0;
}

function removeEmptyParentListItem(contentEditable: HTMLElement, cursorPosition: CursorPosition): CursorPosition | null {
    const firstBlock = getSelectedBlock(contentEditable, cursorPosition)[0];
    if (!firstBlock || !firstBlock.parentElement || !isSchemaContain(firstBlock.parentElement, [Display.ListWrapper])) {
        return null;
    }

    const listWrapper = firstBlock.parentElement;
    const parentLi = listWrapper.parentElement;
    if (!parentLi || !isSchemaContain(parentLi, [Display.List])) {
        return null;
    }

    const hasNonListContent = Array.from(parentLi.childNodes).some(
        child => !isSchemaContain(child, [Display.ListWrapper]) &&
            !(child.nodeType === Node.TEXT_NODE && !child.textContent) &&
            !isSchemaContain(child, [Display.SelfClose])
    );
    if (hasNonListContent) {
        return null;
    }

    const parentListWrapper = parentLi.parentElement;
    if (!parentListWrapper || !isSchemaContain(parentListWrapper, [Display.ListWrapper])) {
        return null;
    }

    while (listWrapper.nextSibling) {
        const sibling = listWrapper.nextSibling;
        if (isSchemaContain(sibling, [Display.ListWrapper])) {
            firstBlock.appendChild(sibling);
        } else {
            sibling.remove();
        }
    }

    Array.from(parentLi.childNodes).forEach(child => {
        if ((child.nodeType === Node.TEXT_NODE && !child.textContent) || isSchemaContain(child, [Display.SelfClose])) {
            child.remove();
        }
    });

    const hasRemainingLis = listWrapper.children.length > 1;
    if (hasRemainingLis) {
        while (firstBlock.firstChild) {
            listWrapper.before(firstBlock.firstChild);
        }
        for (const attr of Array.from(firstBlock.attributes)) {
            if (!parentLi.hasAttribute(attr.name)) {
                parentLi.setAttribute(attr.name, attr.value);
            }
        }
        firstBlock.remove();
    } else {
        while (parentLi.firstChild) {
            parentListWrapper.before(parentLi.firstChild);
        }
        parentLi.remove();
        if (!parentListWrapper.firstElementChild) {
            parentListWrapper.remove();
        }
    }

    return cursorPosition;
}

export function insertBreak(contentEditable: HTMLElement, cursorPosition: CursorPosition): CursorPosition {
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
        //const emptyFirstText = getFirstText(emptyBlock);
        //return getCursorPositionFrom(emptyFirstText, 0, emptyFirstText, 0);
        return cursorPosition;
    }

    const newBlock = document.createElement(block.nodeName);
    cursorPosition = getCursorPositionFrom(cursorPosition.startContainer, cursorPosition.startOffset, block, block.childNodes.length);
    newBlock.appendChild(extractContents(cursorPosition));
    block.after(newBlock);

    const firstText = getFirstText(newBlock);
    return getCursorPositionFrom(firstText, 0, firstText, 0);
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