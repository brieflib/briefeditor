import {getSelectedBlock, getSelectedRoot} from "@/core/selection/selection";
import {Display, isSchemaContain} from "@/core/normalize/type/schema";
import normalize, {appendTags} from "@/core/normalize/normalize";
import {getRootElement} from "@/core/shared/element-util";
import {
    countParentsWithDisplay,
    isChildrenContain,
    moveConsecutive,
    moveListWrapperToPreviousLi
} from "@/core/list/util/list-util";
import {getSelectionOffset, restoreRange} from "@/core/cursor/cursor";

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

        if (countParentsWithDisplay(list, [Display.ListWrapper]) >= 5) {
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
        const block = getSelectedBlock(contentEditable, initialRange)[i];
        if (!block) {
            continue;
        }

        const parentElement = block.parentElement;
        if (!parentElement) {
            continue;
        }

        appendTags(contentEditable, block, [parentElement.nodeName]);
    }

    const initialRange = restoreRange(contentEditable, initialCursorPosition);
    const rootElements = getSelectedRoot(contentEditable, initialRange);
    for (const rootElement of rootElements) {
        moveListWrapperToPreviousLi(rootElement);
        normalize(contentEditable, rootElement);
    }
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

        const listNesting = countParentsWithDisplay(list, [Display.ListWrapper]);
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

export function minusIndent(contentEditable: HTMLElement) {
    if (!isMinusIndentEnabled(contentEditable)) {
        return;
    }

    const lists = getSelectedBlock(contentEditable);
    const firstList = lists[0];
    if (!firstList) {
        return;
    }

    const listsToPlusIndent: HTMLElement[] = [];
    const nestedLists = firstList.querySelectorAll("ul > li, ol > li");
    for (const nestedList of nestedLists) {
        listsToPlusIndent.push(nestedList as HTMLElement);
    }

    for (const list of lists) {
        moveConsecutive(list);
    }

    plusIndent(contentEditable, listsToPlusIndent);

    if (!listsToPlusIndent.length) {
        const rootElement = getRootElement(contentEditable, firstList);
        normalize(contentEditable, rootElement);
    }
}