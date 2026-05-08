import {
    collapseLeaves, ContainerAndCursorPosition,
    filterLeafParents,
    getLeafNodes,
    isLeafEmpty,
    removeConsecutiveDuplicates,
    replaceLeafParents,
    setLeafParents,
    sortLeafParents
} from "@/core/normalize/util/normalize-util";
import {getRootElement} from "@/core/shared/element-util";
import {Display, isSchemaContain} from "@/core/normalize/type/schema";
import {
    CursorPosition,
    extractContents,
    getCursorPosition,
    insertNode,
    isCursorPositionEqual,
    selectNode
} from "@/core/shared/type/cursor-position";
import {getSelectedRoot} from "@/core/selection/selection";
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
            return removeTags(contentEditable, [], resultCursorPosition);
        }

        if (isCursorPositionEqual(currentCursorPosition, nextCursorPosition)) {
            resultCursorPosition = removeTags(contentEditable, [], nextCursorPosition);
        }

        if (!isCursorPositionEqual(currentCursorPosition, nextCursorPosition)) {
            removeTags(contentEditable, [], currentCursorPosition);
            resultCursorPosition = removeTags(contentEditable, [], nextCursorPosition);
        }
    }

    return resultCursorPosition;
}

export function removeTags(contentEditable: HTMLElement, tags: string[], cursorPosition: CursorPosition) {
    const documentFragment: DocumentFragment = extractContents(cursorPosition);

    const removeTagFrom = document.createElement("DELETED");
    removeTagFrom.appendChild(documentFragment);
    insertNode(cursorPosition, removeTagFrom);

    return removeAndNormalize(contentEditable, removeTagFrom, [...tags, "DELETED"], cursorPosition);
}

export function appendTag(contentEditable: HTMLElement, cursorPosition: CursorPosition, tag: string, attributes?: Attributes) {
    const documentFragment: DocumentFragment = extractContents(cursorPosition);

    const tagElement = document.createElement(tag);
    applyAttributes(tagElement, attributes);
    tagElement.appendChild(documentFragment);

    const removeTagFrom = document.createElement("DELETED");
    removeTagFrom.appendChild(tagElement);
    insertNode(cursorPosition, removeTagFrom);

    return removeAndNormalize(contentEditable, removeTagFrom, ["DELETED"], cursorPosition);
}

function removeAndNormalize(contentEditable: HTMLElement, removeTagFrom: HTMLElement, tags: string[], cursorPosition: CursorPosition) {
    //cursorPosition = getNextNotEmptyNodes(contentEditable, cursorPosition);
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