import {Display, isSchemaContain} from "@/core/normalize/type/schema";
import {getChildFragment, imageSelector} from "@/core/shared/element-util";
import {CursorPosition, getCursorPositionFrom} from "@/core/shared/type/cursor-position";
import {getFirstListWrapper, getNextListWrapper} from "@/core/list/util/list-util";

export enum ListWrapper {
    UL = "UL",
    OL = "OL"
}

export class ListClass {
    nestedLevel!: number;
    listWrapper!: ListWrapper;
    listContent!: DocumentFragment;
}

export function parseList(rootWrapper: HTMLElement): ListClass[] {
    const result: ListClass[] = [];

    let current: Element | null = getFirstListWrapper(rootWrapper);
    while (current && isSchemaContain(current, [Display.ListWrapper])) {
        parseListWrapper(current as HTMLElement, toListWrapper(current), 0, result);
        current = getNextListWrapper(current);
    }

    return result;
}

export function convertList(lists: ListClass[]): DocumentFragment {
    const fragment = new DocumentFragment();
    const list = lists[0];
    if (!list) {
        return fragment;
    }

    const rootWrapper: HTMLElement = document.createElement(list.listWrapper);
    let currentLi: HTMLElement | null | undefined = document.createElement("li");
    currentLi.appendChild(list.listContent);
    rootWrapper.appendChild(currentLi);
    const rootWrappers: HTMLElement[] = [rootWrapper];

    for (let i = 0; i <= lists.length; i++) {
        const list = lists[i];
        if (!list) {
            return appendToFragment(fragment, rootWrappers);
        }

        const nextList = lists[i + 1];
        if (!nextList) {
            return appendToFragment(fragment, rootWrappers);
        }

        const lastRootWrapper = rootWrappers[rootWrappers.length - 1];
        if (lastRootWrapper && nextList.nestedLevel === 0 && nextList.listWrapper !== lastRootWrapper.nodeName) {
            const newWrapper: HTMLElement = document.createElement(nextList.listWrapper);
            rootWrappers.push(newWrapper);
            const li = document.createElement("li");
            li.appendChild(nextList.listContent);
            newWrapper.appendChild(li);
            currentLi = li;
            continue;
        }

        if (list.nestedLevel + 1 === nextList.nestedLevel) {
            const nextWrapper = document.createElement(nextList.listWrapper);
            currentLi?.appendChild(nextWrapper);
            currentLi = nextWrapper;
        }

        if (list.nestedLevel > nextList.nestedLevel) {
            let nestedLevel = list.nestedLevel;
            while (nestedLevel > nextList.nestedLevel) {
                nestedLevel--;
                currentLi = currentLi?.parentElement?.parentElement;
            }
            currentLi = currentLi?.parentElement;

            // The wrapper the climb lands in was opened for the lines written above it. A line written in the
            // other type is not one of them: it closes that wrapper and opens one of its own beside it, the
            // way a line changing type on the level it already stands on does.
            if (currentLi && currentLi.nodeName !== nextList.listWrapper) {
                const nextWrapper = document.createElement(nextList.listWrapper);
                currentLi.parentElement?.appendChild(nextWrapper);
                currentLi = nextWrapper;
            }
        }

        if (list.nestedLevel === nextList.nestedLevel && list.listWrapper !== nextList.listWrapper) {
            currentLi = currentLi?.parentElement?.parentElement;
            const nextWrapper = document.createElement(nextList.listWrapper);
            currentLi?.appendChild(nextWrapper);
            currentLi = nextWrapper;
        }

        if (list.nestedLevel === nextList.nestedLevel && list.listWrapper === nextList.listWrapper) {
            currentLi = currentLi?.parentElement;
        }

        const li = document.createElement("li");
        li.appendChild(nextList.listContent);
        currentLi?.appendChild(li);
        currentLi = li;
    }

    return appendToFragment(fragment, rootWrappers);
}

function appendToFragment(fragment: DocumentFragment, rootWrappers: HTMLElement[]) {
    const firstWrapper = rootWrappers[0];
    if (!firstWrapper) {
        return fragment;
    }

    fragment.appendChild(firstWrapper);
    for (let i = 1; i < rootWrappers.length; i++) {
        const rootWrapper = rootWrappers[i];
        if (rootWrapper) {
            fragment.appendChild(rootWrapper);
        }
    }

    return fragment;
}

export function plusOrderNumbers(lists: ListClass[], orderNumbers: number[]): ListClass[] {
    return shiftOrderNumbers(lists, orderNumbers, 1);
}

export function minusOrderNumbers(lists: ListClass[], orderNumbers: number[]): ListClass[] {
    return shiftOrderNumbers(lists, orderNumbers, -1);
}

export function shiftOrderNumbers(lists: ListClass[], orderNumbers: number[], shift: number): ListClass[] {
    for (const orderNumber of orderNumbers) {
        const list = lists[orderNumber];
        if (list) {
            list.nestedLevel += shift;
        }
    }

    return lists;
}

export interface NormalizeListsResult {
    lists: ListClass[];
    cursorPosition: CursorPosition;
}

// A line the writer left open stands in the list the way a written one does, so the rebuild keeps it. What it
// drops on its own is an item holding no content at all: a wrapper the parse walked through, or one an edit
// emptied of everything it had. The item a modification takes the place of is named by the caller, which is
// the one blank line that goes.
export function normalizeLists(lists: ListClass[], cursorPosition: CursorPosition, dropped?: ListClass): NormalizeListsResult {
    const result: ListClass[] = [];
    const levelMap = new Map<number, number>();
    const cursorOrphaned = isCursorOrphaned(cursorPosition, lists);
    let updatedCursorPosition: CursorPosition = cursorPosition;
    let redirected = false;

    for (let i = 0; i < lists.length; i++) {
        const list = lists[i];
        if (!list || list === dropped || isWithoutContent(list)) {
            if (!redirected && list &&
                (cursorOrphaned || list.listContent.contains(cursorPosition.startContainer))) {
                const found = findCursorInNextNonEmpty(lists, i + 1);
                if (found) {
                    updatedCursorPosition = found;
                    redirected = true;
                }
            }
            continue;
        }

        const origLevel = list.nestedLevel;

        if (result.length === 0) {
            list.nestedLevel = 0;
        } else if (levelMap.has(origLevel)) {
            list.nestedLevel = levelMap.get(origLevel) ?? origLevel;
        } else {
            const prev = result[result.length - 1];
            if (prev && list.nestedLevel > prev.nestedLevel + 1) {
                list.nestedLevel = prev.nestedLevel + 1;
            }
        }

        if (list.nestedLevel !== origLevel && result.length > 0) {
            levelMap.set(origLevel, list.nestedLevel);
        }

        result.push(list);
    }

    return {lists: result, cursorPosition: updatedCursorPosition};
}

// An item holds the line it was written as, and a nested list is the content of its own items rather than of
// the item holding it, so it is left out of the content the parse reads. What is left of an item standing for
// no line at all is nothing.
function isWithoutContent(list: ListClass): boolean {
    return !list.listContent.textContent && !list.listContent.firstElementChild;
}

// A blank line is an item with nothing written on it, which is the br standing in for the line it holds. An
// image stands for content the way text does and keeps the item from reading as a blank line.
export function isListClassEmpty(list: ListClass | undefined): boolean {
    if (!list) {
        return false;
    }

    return !list.listContent.textContent && !list.listContent.querySelector(imageSelector);
}

function isCursorOrphaned(cursorPosition: CursorPosition, lists: ListClass[]): boolean {
    return !cursorPosition.startContainer.isConnected &&
        !lists.some(l => l?.listContent.contains(cursorPosition.startContainer));
}

function findCursorInNextNonEmpty(lists: ListClass[], startIndex: number): CursorPosition | undefined {
    for (let i = startIndex; i < lists.length; i++) {
        const firstNode = lists[i]?.listContent.textContent ? lists[i]?.listContent.firstChild : null;
        if (firstNode) {
            return getCursorPositionFrom(firstNode, 0, firstNode, 0, false);
        }
    }
    return undefined;
}

function parseListWrapper(wrapper: HTMLElement, wrapperType: ListWrapper, level: number, result: ListClass[]) {
    for (const child of Array.from(wrapper.children)) {
        if (isList(child)) {
            const fragment = getChildFragment(child);

            const listClass = new ListClass();
            listClass.nestedLevel = level;
            listClass.listWrapper = wrapperType;
            listClass.listContent = fragment;
            result.push(listClass);

            for (const liChild of Array.from(child.children)) {
                if (isSchemaContain(liChild, [Display.ListWrapper])) {
                    parseListWrapper(liChild as HTMLElement, toListWrapper(liChild), level + 1, result);
                }
            }
        } else if (isSchemaContain(child, [Display.ListWrapper])) {
            parseListWrapper(child as HTMLElement, toListWrapper(child), level + 1, result);
        }
    }
}

function isList(element: Element): boolean {
    return element.nodeName === "LI";
}

function toListWrapper(element: Element): ListWrapper {
    return element.nodeName === "UL" ? ListWrapper.UL : ListWrapper.OL;
}