import {
    collapseLeaves,
    filterLeafParents,
    getLeafNodes,
    removeConsecutiveDuplicates,
    replaceLeafParents,
    setLeafParents,
    sortLeafParents
} from "@/core/normalize/util/normalize-util";
import {Leaf} from "@/core/normalize/type/leaf";
import {getRange} from "@/core/shared/range-util";
import {getRootElement} from "@/core/shared/element-util";

export default function normalize(contentEditable: HTMLElement, element: HTMLElement) {
    const leaves = getLeafNodes(element)
        .map(node => setLeafParents(node, contentEditable))
        .map(leaf => sortLeafParents(leaf))
        .map(leaf => removeConsecutiveDuplicates(leaf));

    replaceElement(leaves, element);
}

export function removeTag(contentEditable: HTMLElement, removeTagFrom: HTMLElement, tags: string[]) {
    const rootElement = getRootElement(contentEditable, removeTagFrom);

    const leaves = getLeafNodes(rootElement)
        .map(node => setLeafParents(node, contentEditable))
        .filter(leaf => filterLeafParents(leaf, removeTagFrom, tags))
        .map(leaf => sortLeafParents(leaf))
        .map(leaf => removeConsecutiveDuplicates(leaf));

    replaceElement(leaves, rootElement);
}

export function replaceTag(contentEditable: HTMLElement, replaceTagFrom: HTMLElement, replaceFrom: string[], replaceTo: string[]) {
    const rootElement = getRootElement(contentEditable, replaceTagFrom);
    const elementToReplace = buildElementsToReplace(replaceTo);

    const leaves = getLeafNodes(rootElement)
        .map(node => setLeafParents(node, contentEditable))
        .filter(leaf => replaceLeafParents(leaf, replaceTagFrom, replaceFrom, elementToReplace))
        .map(leaf => sortLeafParents(leaf))
        .map(leaf => removeConsecutiveDuplicates(leaf));

    return replaceElement(leaves, rootElement);
}

export function replaceClosestTag(wrapper: HTMLElement, list: HTMLElement, replaceFrom: string[], replaceTo: string[]) {
    const elementToReplace = buildElementsToReplace(replaceTo);

    const leaves = getLeafNodes(wrapper)
        .map(node => setLeafParents(node, wrapper.parentElement as HTMLElement))
        .filter(leaf => replaceLeafParents(leaf, list, replaceFrom, elementToReplace))
        .map(leaf => sortLeafParents(leaf))
        .map(leaf => removeConsecutiveDuplicates(leaf));

    return replaceElement(leaves, wrapper);
}

function buildElementsToReplace(replaceTo: string[]) {
    const elementsToReplace: HTMLElement[] = [];
    for (const replaceTag of replaceTo) {
        const element = document.createElement(replaceTag);
        elementsToReplace.push(element);
    }

    return elementsToReplace;
}

function replaceElement(leaves: Leaf[], parentElement: HTMLElement) {
    const range = getRange();
    range.selectNode(parentElement);
    parentElement.remove();
    const fragment = collapseLeaves(leaves);
    const childNodes = fragment.firstChild?.childNodes;
    const innerFragment = new DocumentFragment();
    if (childNodes) {
        innerFragment.append(...childNodes);
    }
    range.insertNode(innerFragment);
}