import {getParentTags, getSelectedLeaves} from "@/core/selection/util/util";

export function getSharedTags(findTill: HTMLElement) {
    const leafNodes = getSelectedLeaves();

    const shared: string[][] = [];
    for (const leaf of leafNodes) {
        const parents = getParentTags(leaf, findTill);
        shared.push(parents);
    }

    return shared[0]?.filter(element => shared.every(arr => arr.includes(element))) ?? [];
}