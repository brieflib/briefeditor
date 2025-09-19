import {collapseLeaves, findLeafParents, findLeaves, sortTags} from "@/normalize/util/util";

export default function normalize(normalizeFrom: HTMLElement) {
    const leaves = findLeaves(normalizeFrom)
        .map(leaf => findLeafParents(leaf, normalizeFrom))
        .map(leaf => ({text: leaf.text, parents: sortTags(leaf.parents)}));

    return collapseLeaves(leaves) as HTMLElement;
}