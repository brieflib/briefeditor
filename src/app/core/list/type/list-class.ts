import {Display, isSchemaContain} from "@/core/normalize/type/schema";

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

    let firstWrapper: Element = rootWrapper;
    while (firstWrapper.previousElementSibling && isSchemaContain(firstWrapper.previousElementSibling, [Display.ListWrapper])) {
        firstWrapper = firstWrapper.previousElementSibling;
    }

    let current: Element | null = firstWrapper;
    while (current && isSchemaContain(current, [Display.ListWrapper])) {
        parseListWrapper(current as HTMLElement, toListWrapper(current), 0, result);
        current = current.nextElementSibling;
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

        if (list.nestedLevel + 1  === nextList.nestedLevel) {
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
    for (const orderNumber of orderNumbers) {
        const list = lists[orderNumber];
        if (list) {
            list.nestedLevel++;
        }
    }

    return lists;
}

export function minusOrderNumbers(lists: ListClass[], orderNumbers: number[]): ListClass[] {
    for (const orderNumber of orderNumbers) {
        const list = lists[orderNumber];
        if (list) {
            list.nestedLevel--;
        }
    }

    return lists;
}

export function getListsPreparedToDelete(lists: ListClass[], orderNumbers: number[]): ListClass[] {
    let currentNestedLevel = 0
    for (let i = 0; i < lists.length; i++) {
        if (orderNumbers.includes(i)) {
            continue;
        }
        const list = lists[i];
        if (list) {
            list.nestedLevel = currentNestedLevel;
        }
        const nextList = lists[i + 1];
        if (!nextList) {
            continue;
        }
        if (nextList.nestedLevel > currentNestedLevel) {
            currentNestedLevel++;
        }
        if (nextList.nestedLevel < currentNestedLevel) {
            currentNestedLevel = nextList.nestedLevel;
        }
    }

    return lists;
}

function parseListWrapper(wrapper: HTMLElement, wrapperType: ListWrapper, level: number, result: ListClass[]) {
    for (const child of Array.from(wrapper.children)) {
        if (isList(child)) {
            const fragment = new DocumentFragment();
            for (const node of Array.from(child.childNodes)) {
                if (!isSchemaContain(node, [Display.ListWrapper])) {
                    fragment.appendChild(node);
                }
            }

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