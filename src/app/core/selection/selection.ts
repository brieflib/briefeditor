import {
    filterListWrapperTag,
    getParentTags,
    getSelected,
    getSelectedLeaves, SelectionType
} from "@/core/selection/util/selection-util";
import {getRange} from "@/core/shared/range-util";
import {CursorPosition} from "@/core/cursor/type/cursor-position";
import {restoreRange} from "@/core/cursor/cursor";

export function getSelectedSharedTags(findTill: HTMLElement) {
    const leafNodes = getSelectedLeaves();

    const shared: string[][] = [];
    for (const leaf of leafNodes) {
        const parents = getParentTags(findTill, leaf);
        const filtered = filterListWrapperTag(parents);
        shared.push(filtered);
    }

    return shared[0]?.filter(element => shared.every(arr => arr.includes(element))) ?? [];
}

export function getSelectedRoot(findTill: HTMLElement, range: Range = getRange()): HTMLElement[] {
    return getSelected(findTill, range, SelectionType.Root);
}

export function getFirstSelectedRoot(contentEditable: HTMLElement, cursorPosition: CursorPosition): HTMLElement {
    const range = restoreRange(contentEditable, cursorPosition);
    const selectedRoots = getSelected(contentEditable, range, SelectionType.Root);
    const firstSelectedRoot = selectedRoots[0];
    if (!firstSelectedRoot) {
        throw new Error("Selected root not found");
    }

    return firstSelectedRoot;
}

export function getSelectedBlock(findTill: HTMLElement, range: Range = getRange()): HTMLElement[] {
    return getSelected(findTill, range, SelectionType.Block);
}

export function getSelectedLink(findTill: HTMLElement, range: Range = getRange()): HTMLElement[] {
    return getSelected(findTill, range, SelectionType.Link);
}

export function getSelectedListWrapper(findTill: HTMLElement, range: Range = getRange()): HTMLElement[] {
    return getSelected(findTill, range, SelectionType.ListWrapper);
}

export function getSelectedElements(range: Range) {
    return getSelected(null, range, SelectionType.Element);
}

export function getInitialBlocks(contentEditable: HTMLElement, initialCursorPosition: CursorPosition) {
    const initialRange = restoreRange(contentEditable, initialCursorPosition);
    return getSelectedBlock(contentEditable, initialRange);
}