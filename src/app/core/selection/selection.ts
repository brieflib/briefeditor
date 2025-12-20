import {getParentTags, getSelectedLeaves} from "@/core/selection/util/selection-util";
import {getBlockElement, getListWrapperElement, getRootElement} from "@/core/shared/element-util";
import {getRange} from "@/core/shared/range-util";
import {CursorPosition} from "@/core/cursor/type/cursor-position";
import {restoreRange} from "@/core/cursor/cursor";

enum SelectionType {
    Root = "Root",
    Block = "Block",
    Element = "Element",
    ListWrapper = "ListWrapper",
}

export function getSelectedSharedTags(findTill: HTMLElement) {
    const leafNodes = getSelectedLeaves();

    const shared: string[][] = [];
    for (const leaf of leafNodes) {
        const parents = getParentTags(findTill, leaf);
        shared.push(parents);
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

function getSelected(findTill: HTMLElement | null, range: Range, type: SelectionType) {
    const selected: HTMLElement[] = [];
    const leafNodes = getSelectedLeaves(range);

    for (const leafNode of leafNodes) {
        let block;
        switch (type) {
            case SelectionType.Element:
                block = leafNode.parentElement as HTMLElement;
                break;
            case SelectionType.Root:
                if (!findTill) {
                    return [];
                }
                block = getRootElement(findTill, leafNode as HTMLElement);
                break;
            case SelectionType.Block:
                if (!findTill) {
                    return [];
                }
                block = getBlockElement(findTill, leafNode as HTMLElement);
                break;
            case SelectionType.ListWrapper:
                if (!findTill) {
                    return [];
                }
                block = getListWrapperElement(findTill, leafNode as HTMLElement);
                break;
        }
        if (!selected.includes(block)) {
            selected.push(block);
        }
    }

    return selected;
}