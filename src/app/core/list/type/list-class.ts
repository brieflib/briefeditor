
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
    while (firstWrapper.previousElementSibling && isListWrapper(firstWrapper.previousElementSibling)) {
        firstWrapper = firstWrapper.previousElementSibling;
    }

    let current: Element | null = firstWrapper;
    while (current && isListWrapper(current)) {
        parseListWrapper(current as HTMLElement, toListWrapper(current), 0, result);
        current = current.nextElementSibling;
    }

    return result;
}

export function convertList(lists: ListClass[]): HTMLElement | null {
    const list = lists[0];
    if (!list) {
        return null;
    }

    const rootWrapper: HTMLElement = document.createElement(list.listWrapper);
    let currentLi: HTMLElement | null | undefined = document.createElement("li");
    currentLi.appendChild(list.listContent);
    rootWrapper.appendChild(currentLi);

    for (let i = 0; i <= lists.length; i++) {
        const list = lists[i];
        if (!list) {
            return rootWrapper;
        }

        const nextList = lists[i + 1];
        if (!nextList) {
            return rootWrapper;
        }

        if (list.nestedLevel + 1  === nextList.nestedLevel) {
            const nextWrapper = document.createElement(nextList.listWrapper);
            currentLi?.appendChild(nextWrapper);
            currentLi = nextWrapper;
        }

        if (list.nestedLevel === nextList.nestedLevel + 1 && list.listWrapper === nextList.listWrapper) {
            currentLi = currentLi?.parentElement?.parentElement?.parentElement;
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

    return rootWrapper;
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

function parseListWrapper(wrapper: HTMLElement, wrapperType: ListWrapper, level: number, result: ListClass[]) {
    for (const child of Array.from(wrapper.children)) {
        if (isList(child)) {
            const fragment = new DocumentFragment();
            for (const node of Array.from(child.childNodes)) {
                if (!isListWrapper(node)) {
                    fragment.appendChild(node);
                }
            }

            const listClass = new ListClass();
            listClass.nestedLevel = level;
            listClass.listWrapper = wrapperType;
            listClass.listContent = fragment;
            result.push(listClass);

            for (const liChild of Array.from(child.children)) {
                if (isListWrapper(liChild)) {
                    parseListWrapper(liChild as HTMLElement, toListWrapper(liChild), level + 1, result);
                }
            }
        } else if (isListWrapper(child)) {
            parseListWrapper(child as HTMLElement, toListWrapper(child), level + 1, result);
        }
    }
}

function isList(element: Element): boolean {
    return element.nodeName === "LI";
}

function isListWrapper(element: ChildNode): boolean {
    return element.nodeName === "UL" || element.nodeName === "OL";
}

function toListWrapper(element: Element): ListWrapper {
    return element.nodeName === "UL" ? ListWrapper.UL : ListWrapper.OL;
}