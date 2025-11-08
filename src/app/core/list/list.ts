import {getSelectedBlock} from "@/core/selection/selection";
import {Display, isSchemaContain} from "@/core/normalize/type/schema";
import normalize from "@/core/normalize/normalize";
import {getFirstLevelElement} from "@/core/shared/element-util";
import {countParentsWithDisplay, isChildrenContain} from "@/core/list/util/list-util";

export function isPlusIndentEnabled(contentEditable: HTMLElement) {
    const blocks = getSelectedBlock(contentEditable);
    const firstBlock = blocks[0];

    if (!firstBlock) {
        return false;
    }

    if (!firstBlock.previousElementSibling || !isSchemaContain(firstBlock.previousElementSibling, [Display.List, Display.ListWrapper])) {
        return false;
    }

    for (const block of blocks) {
        if (!isSchemaContain(block, [Display.List])) {
            return false;
        }

        if (countParentsWithDisplay(block, [Display.ListWrapper]) >= 5) {
            return false;
        }
    }

    return true;
}

export function plusIndent(contentEditable: HTMLElement) {
    if (!isPlusIndentEnabled(contentEditable)) {
        return;
    }

    const lists = getSelectedBlock(contentEditable);
    const firstList = lists[0];
    if (!firstList) {
        return;
    }

    for (const list of lists) {
        const nextList = list.nextElementSibling;
        const parentElement = list.parentElement;

        if (!parentElement) {
            continue;
        }

        if (nextList && isSchemaContain(nextList, [Display.ListWrapper])) {
            nextList.prepend(list);
            continue;
        }

        const previousList = list.previousElementSibling;
        const listWrapper = document.createElement(parentElement.nodeName);
        listWrapper.append(list);

        if (listWrapper && previousList) {
            previousList.after(listWrapper);
        }
    }

    const firstLevel = getFirstLevelElement(contentEditable, firstList);
    normalize(contentEditable, firstLevel);
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

        const nextList = list.nextElementSibling;
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
    for (const list of lists) {
        const listWrapper = list.parentElement;
        listWrapper?.parentElement?.insertBefore(list, listWrapper);
    }

    const firstLevel = getFirstLevelElement(contentEditable, lists[0] as HTMLElement);
    normalize(contentEditable, firstLevel);
}