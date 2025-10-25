import {getParentTags, getSelectedLeaves} from "@/core/selection/util/util";
import {getBlockElement} from "@/core/shared/element-util";

export function getSelectedSharedTags(findTill: HTMLElement) {
    const leafNodes = getSelectedLeaves();

    const shared: string[][] = [];
    for (const leaf of leafNodes) {
        const parents = getParentTags(leaf, findTill);
        shared.push(parents);
    }

    return shared[0]?.filter(element => shared.every(arr => arr.includes(element))) ?? [];
}

export function getSelectedBlocks(findTill: HTMLElement): HTMLElement[] {
    const selected: HTMLElement[] = [];
    const leafNodes = getSelectedLeaves();

    for (const leafNode of leafNodes) {
        const block = getBlockElement(findTill, leafNode as HTMLElement);
        if (!selected.includes(block)) {
            selected.push(block);
        }
    }

    return selected;
}