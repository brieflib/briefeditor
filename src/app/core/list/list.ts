import {getSelectedBlock} from "@/core/selection/selection";
import {Display, isSchemaContain} from "@/core/normalize/type/schema";
import normalize from "@/core/normalize/normalize";
import {getRootElement} from "@/core/shared/element-util";
import {countParentsWithDisplay, isChildrenContain, moveConsecutive} from "@/core/list/util/list-util";

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

    const firstLi = lists[0];
    if (!firstLi) {
        return;
    }

    for (const li of lists) {
        const listWrapper = li.parentElement;
        if (!listWrapper) {
            continue;
        }

        const maybePreviousListWrapper = listWrapper.previousElementSibling;
        if (maybePreviousListWrapper &&
            isSchemaContain(maybePreviousListWrapper, [Display.ListWrapper]) &&
            listWrapper.querySelector("li:first-child") === li) {
            const previousListWrapper = maybePreviousListWrapper;
            const newListWrapper = document.createElement(listWrapper.nodeName);
            newListWrapper.append(li);
            previousListWrapper.querySelector("li:last-child")?.appendChild(newListWrapper);
            if (!listWrapper.textContent) {
                listWrapper.remove();
            }
            continue;
        }

        const maybePreviousLi = li.previousElementSibling;
        if (!maybePreviousLi) {
            continue;
        }
        const previousLi = maybePreviousLi;

        const nestedListWrapper = li.querySelectorAll("ul, ol")[0];
        if (nestedListWrapper && nestedListWrapper.textContent && listWrapper.nodeName === nestedListWrapper.nodeName) {
            previousLi.appendChild(nestedListWrapper);
            nestedListWrapper.prepend(li);
            continue;
        }

        if (nestedListWrapper && listWrapper.nodeName !== nestedListWrapper.nodeName) {
            previousLi.appendChild(nestedListWrapper);

            const newListWrapper = document.createElement(listWrapper.nodeName);
            newListWrapper.append(li);
            nestedListWrapper.before(newListWrapper);
            continue;
        }

        const newListWrapper = document.createElement(listWrapper.nodeName);
        newListWrapper.append(li);
        previousLi.appendChild(newListWrapper);
    }

    const rootElement = getRootElement(contentEditable, firstLi);
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