import {
    filterListWrapperTag,
    getParentTags,
    getSelected,
    getSelectedLeaves,
    SelectionType
} from "@/core/selection/util/selection-util";
import {CursorPosition, getCursorPosition} from "@/core/shared/type/cursor-position";

export function getSelectedSharedTags(findTill: HTMLElement, cursorPosition = getCursorPosition()) {
    const leafNodes = getSelectedLeaves(findTill);

    if (leafNodes.length > 1 && cursorPosition.endOffset === 0) {
        leafNodes.pop();
    }

    if (leafNodes.length > 1 && cursorPosition.startContainer.textContent?.length === cursorPosition.startOffset) {
        leafNodes.shift();
    }

    const shared: string[][] = [];
    for (const leaf of leafNodes) {
        const parents = getParentTags(findTill, leaf);
        const filtered = filterListWrapperTag(parents);
        shared.push(filtered);
    }

    return shared[0]?.filter(element => shared.every(arr => arr.includes(element))) ?? [];
}

export function getSelectedRoot(findTill: HTMLElement, cursorPosition: CursorPosition = getCursorPosition()): HTMLElement[] {
    return getSelected(findTill, cursorPosition, SelectionType.Root);
}

export function getFirstSelectedRoot(contentEditable: HTMLElement, cursorPosition: CursorPosition): HTMLElement {
    const selectedRoots = getSelected(contentEditable, cursorPosition, SelectionType.Root);
    const firstSelectedRoot = selectedRoots[0];
    if (!firstSelectedRoot) {
        throw new Error("Selected root not found");
    }

    return firstSelectedRoot;
}

export function getSelectedBlock(findTill: HTMLElement, cursorPosition: CursorPosition = getCursorPosition()): HTMLElement[] {
    return getSelected(findTill, cursorPosition, SelectionType.Block);
}

export function getSelectedLink(findTill: HTMLElement, cursorPosition: CursorPosition = getCursorPosition()): HTMLElement[] {
    return getSelected(findTill, cursorPosition, SelectionType.Link);
}

export function getSelectedListWrapper(findTill: HTMLElement, cursorPosition: CursorPosition = getCursorPosition()): HTMLElement[] {
    return getSelected(findTill, cursorPosition, SelectionType.ListWrapper);
}

export function selectElement(element: HTMLElement) {
    const selection = window.getSelection();
    const range = document.createRange();

    if (!selection) {
        return;
    }

    range.selectNodeContents(element);
    selection.removeAllRanges();
    selection.addRange(range);
}