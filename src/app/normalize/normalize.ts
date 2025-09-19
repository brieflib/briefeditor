import {collapseLeaves, findLeafParents, findLeaves, sortTags} from "@/normalize/util/util";
import {Leaf} from "@/normalize/type/leaf";

export default function normalize(normalizeFrom: HTMLElement) {
    const leaves = findLeaves(normalizeFrom)
        .map(leaf => findLeafParents(leaf, normalizeFrom))
        .map(leaf => (new Leaf(leaf?.text, sortTags(leaf?.parents))));

    return collapseLeaves(leaves) as HTMLElement;
}