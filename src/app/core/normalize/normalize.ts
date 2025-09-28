import {collapseLeaves, filterLeafParents, getLeafNodes, setLeafParents, sortLeafParents} from "@/core/normalize/util/util";
import {Leaf} from "@/core/normalize/type/leaf";

export default function normalize(normalizeFrom: HTMLElement) {
    const leaves = getLeafNodes(normalizeFrom)
        .map(node => setLeafParents(node, normalizeFrom, new Leaf(node)))
        .filter(leaf => leaf?.isLeafPresent())
        .map(leaf => sortLeafParents(leaf));

    return collapseLeaves(leaves) as HTMLElement;
}

export function removeTag(container: HTMLElement, element: Node, tag: string) {
    const leaves = getLeafNodes(container)
        .map(node => setLeafParents(node, container, new Leaf(node)))
        .filter(leaf => filterLeafParents(leaf, element, [tag, "DELETED"]))
        .filter(leaf => leaf?.isLeafPresent())
        .map(leaf => sortLeafParents(leaf));

    return collapseLeaves(leaves) as HTMLElement;
}