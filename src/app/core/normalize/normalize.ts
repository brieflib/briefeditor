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

export default function normalize(normalizeFrom: HTMLElement, elementToReplace: HTMLElement) {
    const leaves = getLeafNodes(normalizeFrom)
        .map(node => setLeafParents(node, normalizeFrom, new Leaf(node)))
        .filter(leaf => leaf?.isLeafPresent())
        .map(leaf => sortLeafParents(leaf))
        .map(leaf => removeConsecutiveDuplicates(leaf));

    replaceElement(leaves, elementToReplace);
}

export function removeTag(findFrom: HTMLElement, removeTagFrom: Node, elementToReplace: HTMLElement, tags: string[]) {
    const leaves = getLeafNodes(findFrom)
        .map(node => setLeafParents(node, findFrom, new Leaf(node)))
        .filter(leaf => filterLeafParents(leaf, removeTagFrom, tags))
        .filter(leaf => leaf?.isLeafPresent())
        .map(leaf => sortLeafParents(leaf))
        .map(leaf => removeConsecutiveDuplicates(leaf));

    replaceElement(leaves, elementToReplace);
}

function replaceElement(leaves: Leaf[], elementToReplace: HTMLElement) {
    const fragment = document.createDocumentFragment();
    const range = getRange();
    range.selectNode(elementToReplace);
    elementToReplace.remove();
    collapseLeaves(leaves, fragment);
    range.insertNode(fragment);
}