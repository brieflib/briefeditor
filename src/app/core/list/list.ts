import {getSelectedBlock} from "@/core/selection/selection";
import {Display, isSchemaContain} from "@/core/normalize/type/schema";
import normalize from "@/core/normalize/normalize";
import {getRootElement} from "@/core/shared/element-util";
import {countParentsWithDisplay, isChildrenContain} from "@/core/list/util/list-util";

export function isPlusIndentEnabled(contentEditable: HTMLElement) {
    const lists = getSelectedBlock(contentEditable);
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
        const parentElement = list.parentElement;

        if (!parentElement) {
            continue;
        }

        const previousListWrapper = parentElement.previousElementSibling;
        if (previousListWrapper && isSchemaContain(previousListWrapper, [Display.ListWrapper])) {
            const listWrapper = document.createElement(parentElement.nodeName);
            listWrapper.append(list);
            previousListWrapper.querySelector("li:last-child")?.appendChild(listWrapper);
            if (parentElement.textContent.length === 0) {
                parentElement.remove();
            }
            continue;
        }

        const previousList = list.previousElementSibling;
        const nestedListWrapper = list.querySelectorAll("ul, ol")[0];
        if (nestedListWrapper && previousList && parentElement.nodeName === nestedListWrapper.nodeName) {
            previousList.appendChild(nestedListWrapper);
            nestedListWrapper.prepend(list);
            continue;
        }

        if (nestedListWrapper && previousList && parentElement.nodeName !== nestedListWrapper.nodeName) {
            previousList.appendChild(nestedListWrapper);

            const listWrapper = document.createElement(parentElement.nodeName);
            listWrapper.append(list);
            nestedListWrapper.before(listWrapper);
            continue;
        }

        if (previousList) {
            const listWrapper = document.createElement(parentElement.nodeName);
            listWrapper.append(list);
            previousList.appendChild(listWrapper);
        }
    }

    const rootElement = getRootElement(contentEditable, firstList);
    normalize(contentEditable, rootElement);
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
    for (let i = 0; i < lists.length; i++) {
        const list = lists[i];
        if (!list) {
            continue;
        }

        const listWrapper = list.parentElement;
        const parentList = listWrapper?.parentElement;

        if (!listWrapper || !parentList) {
            continue;
        }

        const childLists = listWrapper.querySelectorAll("li").length;
        if (childLists === 1 && i !== 0) {
            continue;
        }

        if (parentList.parentElement?.nodeName === listWrapper.nodeName) {
            parentList.after(listWrapper);
            listWrapper.before(list);
            list.appendChild(listWrapper);
        }
    }

    const rootElement = getRootElement(contentEditable, lists[0] as HTMLElement);
    normalize(contentEditable, rootElement);
}