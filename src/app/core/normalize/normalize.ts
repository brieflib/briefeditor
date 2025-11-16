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
import {getBlockElement, getFirstLevelElement} from "@/core/shared/element-util";

export default function normalize(contentEditable: HTMLElement, element: HTMLElement) {
    const leaves = getLeafNodes(element)
        .map(node => setLeafParents(node, contentEditable))
        .map(leaf => sortLeafParents(leaf))
        .map(leaf => removeConsecutiveDuplicates(leaf));

    replaceElement(leaves, element);
}

export function removeTag(contentEditable: HTMLElement, removeTagFrom: HTMLElement, tags: string[]) {
    const firstLevel = getFirstLevelElement(contentEditable, removeTagFrom);

    const leaves = getLeafNodes(firstLevel)
        .map(node => setLeafParents(node, contentEditable))
        .filter(leaf => filterLeafParents(leaf, removeTagFrom, tags))
        .map(leaf => sortLeafParents(leaf))
        .map(leaf => removeConsecutiveDuplicates(leaf));

    replaceElement(leaves, firstLevel);
}

export function replaceTag(contentEditable: HTMLElement, replaceTagFrom: HTMLElement, replaceFrom: string[], replaceTo: string[]) {
    const firstLevel = getFirstLevelElement(contentEditable, replaceTagFrom);
    const elementToReplace = buildElementsToReplace(replaceTo);

    const leaves = getLeafNodes(firstLevel)
        .map(node => setLeafParents(node, contentEditable))
        .filter(leaf => replaceLeafParents(leaf, replaceTagFrom, replaceFrom, elementToReplace))
        .map(leaf => sortLeafParents(leaf))
        .map(leaf => removeConsecutiveDuplicates(leaf));

    return replaceElement(leaves, firstLevel);
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