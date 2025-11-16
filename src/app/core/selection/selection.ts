import {getParentTags, getSelectedLeaves} from "@/core/selection/util/selection-util";
import {getBlockElement, getFirstLevelElement} from "@/core/shared/element-util";
import {getRange} from "@/core/shared/range-util";

export function getSelectedSharedTags(findTill: HTMLElement) {
    const leafNodes = getSelectedLeaves();

    const shared: string[][] = [];
    for (const leaf of leafNodes) {
        const parents = getParentTags(leaf, findTill);
        shared.push(parents);
    }

    return shared[0]?.filter(element => shared.every(arr => arr.includes(element))) ?? [];
}

export function getSelectedFirstLevels(findTill: HTMLElement): HTMLElement[] {
    const selected: HTMLElement[] = [];
    const leafNodes = getSelectedLeaves();

    for (const leafNode of leafNodes) {
        const block = getFirstLevelElement(findTill, leafNode as HTMLElement);
        if (!selected.includes(block)) {
            selected.push(block);
        }
    }

    return selected;
}

export function getSelectedBlock(findTill: HTMLElement, range: Range = getRange()): HTMLElement[] {
    const selected: HTMLElement[] = [];
    const leafNodes = getSelectedLeaves(range);

    for (const leafNode of leafNodes) {
        const block = getBlockElement(findTill, leafNode as HTMLElement);
        if (!selected.includes(block)) {
            selected.push(block);
        }
    }

    return selected;
}

export function getSelectedElements(range: Range) {
    const parents: HTMLElement[] = [];

    for (const leafElement of getSelectedLeaves(range)) {
        const parent = leafElement.parentElement as HTMLElement;
        if (!parents.includes(parent)) {
            parents.push(parent);
        }
    }

    return parents;
}