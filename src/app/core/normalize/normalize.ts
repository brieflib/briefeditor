import {
    collapseLeaves,
    ContainerAndCursorPosition,
    filterLeafParents,
    getLeafNodes,
    remapCursor,
    removeConsecutiveDuplicates,
    replaceLeafParents,
    setLeafParents,
    sortLeafParents
} from "@/core/normalize/util/normalize-util";
import {getFirstText, getLastText, getRootElement} from "@/core/shared/element-util";
import {Display, isSchemaContain} from "@/core/normalize/type/schema";
import {
    CursorPosition,
    extractContents,
    getCursorPosition,
    getCursorPositionFrom,
    insertNode,
    isCursorPositionEqual,
    selectNode
} from "@/core/shared/type/cursor-position";
import {getFirstSelectedRoot, getSelectedRoot} from "@/core/selection/selection";
import {applyAttributes} from "@/core/command/util/command-util";
import {Attributes} from "@/core/command/type/command";

export function normalize(contentEditable: HTMLElement, ...cursorPosition: CursorPosition[]) {
    let resultCursorPosition = cursorPosition[0] as CursorPosition;

    for (let i = 0; i < cursorPosition.length; i++) {
        const currentCursorPosition = cursorPosition[i];
        const nextCursorPosition = cursorPosition[i + 1];

        if (!currentCursorPosition) {
            return resultCursorPosition;
        }

        if (!nextCursorPosition) {
            const rootElement = getFirstSelectedRoot(contentEditable, resultCursorPosition);
            return removeAndNormalize(contentEditable, rootElement, [], resultCursorPosition);
        }

        if (isCursorPositionEqual(currentCursorPosition, nextCursorPosition)) {
            const rootElement = getFirstSelectedRoot(contentEditable, nextCursorPosition);
            resultCursorPosition = removeAndNormalize(contentEditable, rootElement, [], nextCursorPosition);
        }

        if (!isCursorPositionEqual(currentCursorPosition, nextCursorPosition)) {
            let rootElement = getFirstSelectedRoot(contentEditable, currentCursorPosition);
            removeAndNormalize(contentEditable, rootElement, [], currentCursorPosition);
            rootElement = getFirstSelectedRoot(contentEditable, nextCursorPosition);
            resultCursorPosition = removeAndNormalize(contentEditable, rootElement, [], nextCursorPosition);
        }
    }

    return resultCursorPosition;
}

export function removeTags(contentEditable: HTMLElement, tags: string[], cursorPosition: CursorPosition) {
    const documentFragment: DocumentFragment = extractContents(cursorPosition);
    const firstText = getFirstText(documentFragment);
    const lastText = getLastText(documentFragment);

    const removeTagFrom = document.createElement("DELETED");
    removeTagFrom.appendChild(documentFragment);
    insertNode(cursorPosition, removeTagFrom);

    cursorPosition = remapCursor(firstText, lastText, cursorPosition);
    return removeAndNormalize(contentEditable, removeTagFrom, [...tags, "DELETED"], cursorPosition);
}

export function appendTag(contentEditable: HTMLElement, cursorPosition: CursorPosition, tag: string, attributes?: Attributes) {
    const documentFragment: DocumentFragment = extractContents(cursorPosition);
    const firstText = getFirstText(documentFragment);
    const lastText = getLastText(documentFragment);

    const tagElement = document.createElement(tag);
    applyAttributes(tagElement, attributes);
    tagElement.appendChild(documentFragment);

    const removeTagFrom = document.createElement("DELETED");
    removeTagFrom.appendChild(tagElement);
    insertNode(cursorPosition, removeTagFrom);

    cursorPosition = remapCursor(firstText, lastText, cursorPosition);
    return removeAndNormalize(contentEditable, removeTagFrom, ["DELETED"], cursorPosition);
}

export function removeAndNormalize(contentEditable: HTMLElement, removeTagFrom: HTMLElement, tags: string[], cursorPosition: CursorPosition) {
    const rootElement = getRootElement(contentEditable, removeTagFrom);

    const leaves = getLeafNodes(rootElement)
        .map(node => setLeafParents(contentEditable, node))
        .filter(leaf => filterLeafParents(removeTagFrom, tags, leaf))
        .map(leaf => sortLeafParents(leaf))
        .map(leaf => removeConsecutiveDuplicates(leaf));

    const containerAndCursorPosition = collapseLeaves(leaves, cursorPosition);
    return replaceElement(containerAndCursorPosition, rootElement);
}

export function replaceTags(contentEditable: HTMLElement, replaceTagFrom: HTMLElement, replaceFrom: string[], replaceTo: string[], isClosest = false) {
    const rootElement = getRootElement(contentEditable, replaceTagFrom);
    const elementsToReplace = buildElementsToReplace(replaceTo);

    const leaves = getLeafNodes(rootElement)
        .map(node => setLeafParents(contentEditable, node))
        .filter(leaf => replaceLeafParents(replaceTagFrom, elementsToReplace, replaceFrom, leaf, isClosest))
        .map(leaf => sortLeafParents(leaf))
        .map(leaf => removeConsecutiveDuplicates(leaf));

    const containerAndCursorPosition = collapseLeaves(leaves);
    return replaceElement(containerAndCursorPosition, rootElement);
}

export function mergeLists(contentEditable: HTMLElement, cursorPosition: CursorPosition = getCursorPosition()) {
    const rootElements = getSelectedRoot(contentEditable, cursorPosition);

    const firstRoot = rootElements[0];
    if (!firstRoot) {
        return;
    }

    // Fill array with previous ul, ol and li
    let previousListWrapper = firstRoot.previousElementSibling;
    while (previousListWrapper && isSchemaContain(previousListWrapper, [Display.ListWrapper, Display.List])) {
        rootElements.unshift(previousListWrapper as HTMLElement);
        previousListWrapper = previousListWrapper.previousElementSibling;
    }

    // Fill array with next ul, ol and li
    const lastRoot = rootElements[rootElements.length - 1];
    if (!lastRoot) {
        return;
    }
    let nextListWrapper = lastRoot.nextElementSibling;
    while (nextListWrapper && isSchemaContain(nextListWrapper, [Display.ListWrapper, Display.List])) {
        rootElements.push(nextListWrapper as HTMLElement);
        nextListWrapper = nextListWrapper.nextElementSibling;
    }

    // Wrap all elements in tag and normalize
    const wrapper = document.createElement("DELETED");
    firstRoot.before(wrapper);
    wrapper.append(...rootElements);
    removeAndNormalize(contentEditable, wrapper, ["DELETED"], cursorPosition);
}

export function closeTags(rootElement: HTMLElement, cursorPosition: CursorPosition): CursorPosition {
    if (cursorPosition.startContainer.nodeType === Node.TEXT_NODE) {
        const text = cursorPosition.startContainer as Text;
        const offset = cursorPosition.startOffset;
        if (offset > 0 && offset < text.length) {
            text.splitText(offset);
        }
    }

    const beforeLeafNodes: Node[] = [];
    const afterLeafNodes: Node[] = [];
    for (const leafNode of getLeafNodes(rootElement)) {
        if (isLeafBeforeCursor(leafNode, cursorPosition)) {
            beforeLeafNodes.push(leafNode);
        } else {
            afterLeafNodes.push(leafNode);
        }
    }

    const build = (nodes: Node[]) => nodes
        .map(node => setLeafParents(rootElement, node))
        .map(leaf => sortLeafParents(leaf))
        .map(leaf => removeConsecutiveDuplicates(leaf));

    const beforeResult = collapseLeaves(build(beforeLeafNodes), cursorPosition);
    const afterResult = collapseLeaves(build(afterLeafNodes), cursorPosition);

    const beforeWrapper = beforeResult.container.firstChild;
    if (beforeWrapper) {
        rootElement.append(...beforeWrapper.childNodes);
    }
    const cursorOffset = rootElement.childNodes.length;
    const afterWrapper = afterResult.container.firstChild;
    if (afterWrapper) {
        rootElement.append(...afterWrapper.childNodes);
    }

    return getCursorPositionFrom(rootElement, cursorOffset, rootElement, cursorOffset);
}

function isLeafBeforeCursor(leaf: Node, cursorPosition: CursorPosition): boolean {
    const container = cursorPosition.startContainer;
    const offset = cursorPosition.startOffset;

    if (leaf === container && container.nodeType === Node.TEXT_NODE) {
        return offset === (container as Text).length;
    }

    let node: Node = leaf;
    while (node.parentNode && node.parentNode !== container) {
        node = node.parentNode;
    }
    if (node.parentNode === container) {
        const idx = Array.prototype.indexOf.call(container.childNodes, node);
        return idx < offset;
    }

    const pos = leaf.compareDocumentPosition(container);
    return !!(pos & Node.DOCUMENT_POSITION_FOLLOWING);
}

function buildElementsToReplace(replaceTo: string[]) {
    const elementsToReplace: HTMLElement[] = [];
    for (const replaceTag of replaceTo) {
        const element = document.createElement(replaceTag);
        elementsToReplace.push(element);
    }

    return elementsToReplace;
}

function replaceElement(containerAndCursorPosition: ContainerAndCursorPosition, replaceableElement: HTMLElement) {
    const cursorPosition = containerAndCursorPosition.cursorPosition;
    selectNode(cursorPosition, replaceableElement);
    replaceableElement.remove();
    const container = containerAndCursorPosition.container;
    const childNodes = container.firstChild?.childNodes;
    const innerFragment = new DocumentFragment();
    if (childNodes) {
        innerFragment.append(...childNodes);
    }

    insertNode(cursorPosition, innerFragment);
    return cursorPosition;
}