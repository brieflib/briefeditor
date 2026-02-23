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
import {getRootElement} from "@/core/shared/element-util";
import {Display, isSchemaContain} from "@/core/normalize/type/schema";
import {CursorPosition, getCursorPosition, insertNode, selectNode} from "@/core/shared/type/cursor-position";
import {getSelectedRoot} from "@/core/selection/selection";

export default function normalize(contentEditable: HTMLElement, element: HTMLElement) {
    const leaves = getLeafNodes(element)
        .map(node => setLeafParents(contentEditable, node))
        .map(leaf => sortLeafParents(leaf))
        .map(leaf => removeConsecutiveDuplicates(leaf))
        .map(leaf => filterEmptyParents(leaf));

    const fragment = collapseLeaves(leaves);
    return replaceElement(fragment, element);
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

export function normalizeRootElements(contentEditable: HTMLElement, cursorPosition: CursorPosition = getCursorPosition()) {
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
    removeTags(contentEditable, wrapper, ["DELETED"]);

    // const initialRange = restoreRange(contentEditable, cursorPosition);
    // const parents = getSelectedParentElements(initialRange);
    // parents.forEach(parent => parent.normalize());
}

function buildElementsToReplace(replaceTo: string[]) {
    const elementsToReplace: HTMLElement[] = [];
    for (const replaceTag of replaceTo) {
        const element = document.createElement(replaceTag);
        elementsToReplace.push(element);
    }

    return elementsToReplace;
}

function replaceElement(fragment: DocumentFragment, replaceableElement: HTMLElement) {
    const cursorPosition = getCursorPosition();
    selectNode(cursorPosition, replaceableElement);
    replaceableElement.remove();
    const childNodes = fragment.firstChild?.childNodes;
    const innerFragment = new DocumentFragment();
    if (childNodes) {
        innerFragment.append(...childNodes);
    }

    const insertedNodes: Node[] = [];
    let child: Node | null = innerFragment.firstChild;
    while (child) {
        insertedNodes.push(child);
        child = child.nextSibling;
    }

    insertNode(cursorPosition, innerFragment);

    return insertedNodes;
}