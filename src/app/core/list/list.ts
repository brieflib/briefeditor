import {getFirstSelectedRoot, getSelectedBlock} from "@/core/selection/selection";
import {Display, isSchemaContain} from "@/core/normalize/type/schema";
import {
    appendBeforeAndDelete,
    countListWrapperParents,
    getDirectChildren,
    getListsOrderNumbers,
    isChildrenContain
} from "@/core/list/util/list-util";
import {getNextNode} from "@/core/shared/element-util";
import {getCursorPosition} from "@/core/shared/type/cursor-position";
import {convertList, minusOrderNumbers, parseList, plusOrderNumbers} from "@/core/list/type/list-class";

export function isNextListNested(contentEditable: HTMLElement, lists: HTMLElement[] = getSelectedBlock(contentEditable)) {
    const lastList = lists[lists.length - 1];
    if (!lastList) {
        return false;
    }
    if (!isSchemaContain(lastList, [Display.List])) {
        return false;
    }
    const listWrapperChildren = getDirectChildren(lastList, [Display.ListWrapper]);
    if (listWrapperChildren.length) {
        return true;
    }
    const maybeNextList = getNextNode(contentEditable, lastList);
    if (!maybeNextList) {
        return false;
    }
    const nestedLevel = countListWrapperParents(contentEditable, maybeNextList as HTMLElement);
    if (isSchemaContain(maybeNextList, [Display.List])) {
        return nestedLevel !== 1;
    }
    if (isSchemaContain(maybeNextList, [Display.ListWrapper])) {
        return nestedLevel !== 0;
    }

    return false;
}

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

        if (countListWrapperParents(contentEditable, list) >= 5) {
            return false;
        }
    }

    return true;
}

export function plusIndent(contentEditable: HTMLElement) {
    if (!isPlusIndentEnabled(contentEditable, getSelectedBlock(contentEditable))) {
        return;
    }

    const cursorPosition = getCursorPosition();
    const firstListWrapper = getFirstSelectedRoot(contentEditable, cursorPosition);
    const listsOrderNumbers = getListsOrderNumbers(contentEditable, cursorPosition);
    const lists = parseList(firstListWrapper);
    const plussedLists = plusOrderNumbers(lists, listsOrderNumbers);
    const listWrappers = convertList(plussedLists);
    appendBeforeAndDelete(firstListWrapper, listWrappers);
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

        const listNesting = countListWrapperParents(contentEditable, list);
        if (listNesting === 1) {
            return false;
        }

        const nextList = list.querySelectorAll("ul, ol")[0];
        if (!nextList) {
            continue;
        }

        if (!isChildrenContain(nextList.children, lists) && isSchemaContain(nextList, [Display.ListWrapper])) {
            return false;
        }
    }

    return true;
}

export function minusIndent(contentEditable: HTMLElement) {
    if (!isMinusIndentEnabled(contentEditable)) {
        return;
    }

    const cursorPosition = getCursorPosition();
    const firstListWrapper = getFirstSelectedRoot(contentEditable, cursorPosition);
    const listsOrderNumbers = getListsOrderNumbers(contentEditable);
    const lists = parseList(firstListWrapper);
    const minusLists = minusOrderNumbers(lists, listsOrderNumbers);
    const listWrappers = convertList(minusLists);
    appendBeforeAndDelete(firstListWrapper, listWrappers);
}