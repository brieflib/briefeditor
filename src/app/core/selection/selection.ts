import {GetElementsBetween, getParentTags, getSelectedLeaves} from "@/core/selection/util/util";
import {getRange} from "@/core/shared/range-util";
import {getFirstLevelElement} from "@/core/shared/element-util";

export function getSharedTags(findTill: HTMLElement) {
    const leafNodes = getSelectedLeaves();

    const shared: string[][] = [];
    for (const leaf of leafNodes) {
        const parents = getParentTags(leaf, findTill);
        shared.push(parents);
    }

    return shared[0]?.filter(element => shared.every(arr => arr.includes(element))) ?? [];
}

export function getSelectedFirstLevels(findTill: HTMLElement): HTMLElement[] {
    const range = getRange();

    const startFirstLevel = getFirstLevelElement(findTill, range.startContainer as HTMLElement);
    const endFirstLevel = getFirstLevelElement(findTill, range.endContainer as HTMLElement);

    return GetElementsBetween(startFirstLevel, endFirstLevel);
}