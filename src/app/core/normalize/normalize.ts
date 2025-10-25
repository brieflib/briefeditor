import {
    collapseLeaves,
    filterLeafParents,
    getLeafNodes,
    removeConsecutiveDuplicates,
    setLeafParents,
    sortLeafParents
} from "@/core/normalize/util/util";
import {Leaf} from "@/core/normalize/type/leaf";
import {getRange} from "@/core/shared/range-util";

export default function normalize(contentEditable: HTMLElement, parentElement: HTMLElement) {
    const leaves = getLeafNodes(parentElement)
        .map(node => setLeafParents(node, contentEditable, new Leaf(node)))
        .filter(leaf => leaf?.isLeafPresent())
        .map(leaf => sortLeafParents(leaf))
        .map(leaf => removeConsecutiveDuplicates(leaf));

    replaceElement(leaves, parentElement);
}

export function removeTag(contentEditable: HTMLElement, removeTagFrom: Node, parentElement: HTMLElement, tags: string[]) {
    const leaves = getLeafNodes(parentElement)
        .map(node => setLeafParents(node, contentEditable, new Leaf(node)))
        .filter(leaf => filterLeafParents(leaf, removeTagFrom, tags))
        .filter(leaf => leaf?.isLeafPresent())
        .map(leaf => sortLeafParents(leaf))
        .map(leaf => removeConsecutiveDuplicates(leaf));

    replaceElement(leaves, parentElement);
}

function replaceElement(leaves: Leaf[], parentElement: HTMLElement) {
    const fragment = document.createDocumentFragment();
    const range = getRange();
    range.selectNode(parentElement);
    parentElement.remove();
    collapseLeaves(leaves, fragment);
    range.insertNode(fragment);
}