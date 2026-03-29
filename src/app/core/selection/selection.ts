import {
    filterListWrapperTag,
    getParentTags,
    getSelected,
    getSelectedLeaves,
    SelectionType
} from "@/core/selection/util/selection-util";
import {CursorPosition, getCursorPosition, getCursorPositionFrom} from "@/core/shared/type/cursor-position";
import {Display, isSchemaContain} from "@/core/normalize/type/schema";
import {getFirstText, getLastText} from "@/core/shared/element-util";

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

export function getSelectedListWrappers(contentEditable: HTMLElement): CursorPosition[] {
    const cursorPositions: CursorPosition[] = [];

    const cursorPosition = getCursorPosition();
    const listWrappers = getSelectedRoot(contentEditable, cursorPosition);
    const startContainer = cursorPosition.startContainer;
    const startOffset = cursorPosition.startOffset;
    const endContainer = cursorPosition.endContainer;
    const endOffset = cursorPosition.endOffset;

    for (const listWrapper of listWrappers) {
        if (!isSchemaContain(listWrapper, [Display.ListWrapper])) {
            continue;
        }

        let cursorPositionInsideListWrapper = cursorPosition;
        if (listWrapper.contains(startContainer) && !listWrapper.contains(endContainer)) {
            const lastText = getLastText(listWrapper);
            cursorPositionInsideListWrapper = getCursorPositionFrom(startContainer, startOffset, lastText, lastText.textContent?.length ?? 0);
        }
        if (!listWrapper.contains(startContainer) && listWrapper.contains(endContainer)) {
            const firstText = getFirstText(listWrapper);
            cursorPositionInsideListWrapper = getCursorPositionFrom(firstText, firstText.textContent?.length ?? 0, endContainer, endOffset);
        }

        cursorPositions.push(cursorPositionInsideListWrapper);
    }

    return cursorPositions;
}