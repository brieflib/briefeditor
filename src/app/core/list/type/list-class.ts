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

/**
 * Flattens a list run into a `ListClass` per line, in document order.
 *
 * @remarks
 * An item standing outside any wrapper (pasted markup can hold one; the editor never writes
 * one) has no wrapper to take its type from and is read as an unordered line at that level.
 * A wrapper found right after such an item is read as its nested list, one level under it.
 */
export function parseList(rootWrapper: HTMLElement): ListClass[] {
    const result: ListClass[] = [];

    let afterItem = false;
    let current: Element | null = getFirstListWrapper(rootWrapper);
    while (current && isSchemaContain(current, [Display.ListWrapper, Display.List])) {
        if (isList(current)) {
            parseListItem(current, ListWrapper.UL, 0, result);
            afterItem = true;
        } else {
            parseListWrapper(current as HTMLElement, toListWrapper(current), afterItem ? 1 : 0, result);
        }
        current = getNextListWrapper(current);
    }

    return result;
}

/** Rebuilds a flat `ListClass[]` (the inverse of {@link parseList}) into nested list markup. */
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

            // A line in the other type doesn't belong to the wrapper the climb landed in, so
            // it closes that wrapper and opens one of its own beside it.
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

/**
 * Renumbers nesting levels after a list is edited and drops items with no content - an
 * empty wrapper the parse walked through, or an item an edit emptied out. `dropped` names
 * an item to drop explicitly (e.g. the one line a modification replaces).
 *
 * @returns The cleaned-up list plus the cursor position, redirected if it was orphaned by a
 * dropped item.
 */
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

/** Whether a `ListClass` line holds no content (nested lists don't count, per `listContent`). */
function isWithoutContent(list: ListClass): boolean {
    return !list.listContent.textContent && !list.listContent.firstElementChild;
}

/** Whether a `ListClass` line is blank (its br has nothing written on it). An image counts as content. */
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
            parseListItem(child, wrapperType, level, result);
        } else if (isSchemaContain(child, [Display.ListWrapper])) {
            parseListWrapper(child as HTMLElement, toListWrapper(child), level + 1, result);
        }
    }
}

/** Reads an item's own line, then walks into any lists nested in it, each a level deeper. */
function parseListItem(item: Element, wrapperType: ListWrapper, level: number, result: ListClass[]) {
    const listClass = new ListClass();
    listClass.nestedLevel = level;
    listClass.listWrapper = wrapperType;
    listClass.listContent = getChildFragment(item);
    result.push(listClass);

    for (const child of Array.from(item.children)) {
        if (isSchemaContain(child, [Display.ListWrapper])) {
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