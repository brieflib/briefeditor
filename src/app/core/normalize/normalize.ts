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
        .map(node => setLeafParents(node, contentEditable))
        .map(leaf => sortLeafParents(leaf))
        .map(leaf => removeConsecutiveDuplicates(leaf));

    replaceElement(leaves, parentElement);
}

export function removeTag(contentEditable: HTMLElement, removeTagFrom: Node, parentElement: HTMLElement, tags: string[]) {
    const leaves = getLeafNodes(parentElement)
        .map(node => setLeafParents(node, contentEditable))
        .filter(leaf => filterLeafParents(leaf, removeTagFrom, tags))
        .map(leaf => sortLeafParents(leaf))
        .map(leaf => removeConsecutiveDuplicates(leaf));

    replaceElement(leaves, parentElement);
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