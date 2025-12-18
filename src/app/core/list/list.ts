import {getFirstSelectedRoot, getSelectedBlock, getSelectedRoot} from "@/core/selection/selection";
import {Display, isSchemaContain} from "@/core/normalize/type/schema";
import normalize, {appendTags, normalizeRootElements, removeDistantTags, removeTags} from "@/core/normalize/normalize";
import {
    countListWrapperParents,
    isChildrenContain,
    moveListWrappersOutOfLi,
    moveListWrapperToPreviousLi
} from "@/core/list/util/list-util";
import {getSelectionOffset, restoreRange} from "@/core/cursor/cursor";
import {getRootElement} from "@/core/shared/element-util";

export function isPlusIndentEnabled(contentEditable: HTMLElement, lists: HTMLElement[] = getSelectedBlock(contentEditable)) {
    const firstList = lists[0];
    if (!firstList) {
        return false;
    }

    const previousListWrapper = firstList.parentElement?.previousElementSibling;
    if (previousListWrapper && previousListWrapper && isSchemaContain(previousListWrapper, [Display.ListWrapper])) {
        return true;
    }

    if (!firstList.previousElementSibling || !isSchemaContain(firstList.previousElementSibling, [Display.List, Display.ListWrapper])) {
        return false;
    }

    for (const list of lists) {
        if (!isSchemaContain(list, [Display.List])) {
            return false;
        }

        if (countListWrapperParents(list) >= 5) {
            return false;
        }
    }

    return true;
}

export function plusIndent(contentEditable: HTMLElement, lists: HTMLElement[] = getSelectedBlock(contentEditable)) {
    if (!isPlusIndentEnabled(contentEditable, lists)) {
        return;
    }

    const initialCursorPosition = getSelectionOffset(contentEditable);
    if (!initialCursorPosition) {
        return;
    }

    for (let i = 0; i < lists.length; i++) {
        const initialRange = restoreRange(contentEditable, initialCursorPosition);
        const li = getSelectedBlock(contentEditable, initialRange)[i];
        if (!li) {
            continue;
        }

        const listWrapper = li.parentElement;
        if (!listWrapper) {
            continue;
        }

        appendTags(contentEditable, li, [listWrapper.nodeName]);
    }

    const initialRange = restoreRange(contentEditable, initialCursorPosition);
    const rootElements = getSelectedRoot(contentEditable, initialRange);
    for (const rootElement of rootElements) {
        moveListWrapperToPreviousLi(rootElement);
    }
    normalizeRootElements(contentEditable, initialCursorPosition);
}

export function isMinusIndentEnabled(contentEditable: HTMLElement) {
    const lists = getSelectedBlock(contentEditable);
    for (const list of lists) {
        if (!list) {
            return false;
        }

        if (!isSchemaContain(list, [Display.List])) {
            return false;
        }

        const listNesting = countListWrapperParents(list);
        if (listNesting === 1) {
            return false;
        }

        const nextList = list.querySelectorAll("ul, ol")[0];
        if (!nextList) {
            continue;
        }

        if (!isChildrenContain(lists, nextList.children) && isSchemaContain(nextList, [Display.ListWrapper])) {
            return false;
        }
    }

    return true;
}

export function minusIndent(contentEditable: HTMLElement, lists: HTMLElement[] = getSelectedBlock(contentEditable)) {
    if (!isMinusIndentEnabled(contentEditable)) {
        return;
    }

    const initialCursorPosition = getSelectionOffset(contentEditable);
    if (!initialCursorPosition) {
        return;
    }

    let firstRootElement = getFirstSelectedRoot(contentEditable, initialCursorPosition);
    removeDistantTags(contentEditable, firstRootElement, lists,[firstRootElement.nodeName, "LI"]);
    firstRootElement = getFirstSelectedRoot(contentEditable, initialCursorPosition);
    moveListWrappersOutOfLi(firstRootElement, contentEditable);
    normalizeRootElements(contentEditable, initialCursorPosition);
}