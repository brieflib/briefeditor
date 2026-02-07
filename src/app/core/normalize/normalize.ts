import {
    appendLeafParents,
    collapseLeaves,
    filterDistantLeafParents,
    filterEmptyParents,
    filterLeafParents,
    getLeafNodes,
    removeConsecutiveDuplicates,
    replaceLeafParents,
    setLeafParents,
    sortLeafParents
} from "@/core/normalize/util/normalize-util";
import {getRange} from "@/core/shared/range-util";
import {getRootElement} from "@/core/shared/element-util";
import {Display, isSchemaContain} from "@/core/normalize/type/schema";
import {CursorPosition} from "@/core/cursor/type/cursor-position";
import {getInitialBlocks, getSelectedParentElements} from "@/core/selection/selection";
import {restoreRange} from "@/core/cursor/cursor";

export default function normalize(contentEditable: HTMLElement, element: HTMLElement) {
    const leaves = getLeafNodes(element)
        .map(node => setLeafParents(contentEditable, node))
        .map(leaf => sortLeafParents(leaf))
        .map(leaf => removeConsecutiveDuplicates(leaf))
        .map(leaf => filterEmptyParents(leaf));

    const fragment = collapseLeaves(leaves);
    replaceElement(fragment, element);
}

export function removeTags(contentEditable: HTMLElement, removeTagFrom: HTMLElement, tags: string[]) {
    const rootElement = getRootElement(contentEditable, removeTagFrom);

    const leaves = getLeafNodes(rootElement)
        .map(node => setLeafParents(contentEditable, node))
        .filter(leaf => filterLeafParents(removeTagFrom, tags, leaf))
        .map(leaf => sortLeafParents(leaf))
        .map(leaf => removeConsecutiveDuplicates(leaf))
        .map(leaf => filterEmptyParents(leaf));

    const fragment = collapseLeaves(leaves);
    replaceElement(fragment, rootElement);
}

export function removeDistantTags(contentEditable: HTMLElement, wrapper: HTMLElement, toRemoveFrom: HTMLElement[], tags: string[]) {
    const rootElement = getRootElement(contentEditable, wrapper);

    const leaves = getLeafNodes(rootElement)
        .map(node => setLeafParents(contentEditable, node))
        .filter(leaf => filterDistantLeafParents(toRemoveFrom, [...tags], leaf))
        .map(leaf => sortLeafParents(leaf))
        .map(leaf => removeConsecutiveDuplicates(leaf))
        .map(leaf => filterEmptyParents(leaf));

    const fragment = collapseLeaves(leaves);
    replaceElement(fragment, rootElement);
}

export function replaceTags(contentEditable: HTMLElement, replaceTagFrom: HTMLElement, replaceFrom: string[], replaceTo: string[], isClosest = false) {
    const rootElement = getRootElement(contentEditable, replaceTagFrom);
    const elementsToReplace = buildElementsToReplace(replaceTo);

    const leaves = getLeafNodes(rootElement)
        .map(node => setLeafParents(contentEditable, node))
        .filter(leaf => replaceLeafParents(replaceTagFrom, elementsToReplace, replaceFrom, leaf, isClosest))
        .map(leaf => sortLeafParents(leaf))
        .map(leaf => removeConsecutiveDuplicates(leaf));

    const fragment = collapseLeaves(leaves);
    return replaceElement(fragment, rootElement);
}

export function appendTags(contentEditable: HTMLElement, appendTagTo: HTMLElement, appendTags: string[]) {
    const rootElement = getRootElement(contentEditable, appendTagTo);
    const elementsToAppend = buildElementsToReplace(appendTags);

    const leaves = getLeafNodes(rootElement)
        .map(node => setLeafParents(contentEditable, node))
        .map(leaf => appendLeafParents(appendTagTo, elementsToAppend, leaf))
        .map(leaf => sortLeafParents(leaf))
        .map(leaf => removeConsecutiveDuplicates(leaf));

    const fragment = collapseLeaves(leaves);
    return replaceElement(fragment, rootElement);
}

export function normalizeRootElements(contentEditable: HTMLElement, cursorPosition: CursorPosition) {
    const initialBlocks = getInitialBlocks(contentEditable, cursorPosition);
    const firstBlock = initialBlocks[0];
    if (!firstBlock) {
        return;
    }

    const rootElements: HTMLElement[] = [];

    const firstRoot = getRootElement(contentEditable, firstBlock);
    rootElements.push(firstRoot);

    // Fill array with previous ul, ol and li
    let firstRootElement = rootElements[0];
    if (!firstRootElement) {
        return;
    }
    let previousListWrapper = firstRootElement.previousElementSibling;
    while (previousListWrapper && isSchemaContain(previousListWrapper, [Display.ListWrapper, Display.List])) {
        rootElements.unshift(previousListWrapper as HTMLElement);
        previousListWrapper = previousListWrapper.previousElementSibling;
    }

    // Fill array with next ul, ol and li
    const lastRootElement = rootElements[rootElements.length - 1];
    if (!lastRootElement) {
        return;
    }
    let nextListWrapper = lastRootElement.nextElementSibling;
    while (nextListWrapper && isSchemaContain(nextListWrapper, [Display.ListWrapper, Display.List])) {
        rootElements.push(nextListWrapper as HTMLElement);
        nextListWrapper = nextListWrapper.nextElementSibling;
    }

    // Wrap all elements in tag and normalize
    const wrapper = document.createElement("DELETED");
    firstRootElement = rootElements[0];
    if (!firstRootElement) {
        return;
    }
    firstRootElement.before(wrapper);

    wrapper.append(...rootElements);
    removeTags(contentEditable, wrapper, ["DELETED"]);

    const initialRange = restoreRange(contentEditable, cursorPosition);
    const parents = getSelectedParentElements(initialRange);
    parents.forEach(parent => parent.normalize());
}

function buildElementsToReplace(replaceTo: string[]) {
    const elementsToReplace: HTMLElement[] = [];
    for (const replaceTag of replaceTo) {
        const element = document.createElement(replaceTag);
        elementsToReplace.push(element);
    }

    return elementsToReplace;
}

function replaceElement(fragment: DocumentFragment, replacebleElement: HTMLElement) {
    const range = getRange();
    range.selectNode(replacebleElement);
    replacebleElement.remove();
    const childNodes = fragment.firstChild?.childNodes;
    const innerFragment = new DocumentFragment();
    if (childNodes) {
        innerFragment.append(...childNodes);
    }
    range.insertNode(innerFragment);
}