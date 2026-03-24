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
    parseListWrapper(rootWrapper, toListWrapper(rootWrapper), 0, result);
    return result;
}

export function convertList(lists: ListClass[]): HTMLElement | undefined {
    const wrappers: HTMLElement[] = [];
    let lastLi: HTMLElement | null = null;
    let currentLevel = -1;

    for (let i = 0; i < lists.length; i++) {
        const item = lists[i];
        if (!item) {
            return;
        }

        if (item.nestedLevel > currentLevel) {
            const wrapper = document.createElement(item.listWrapper);

            if (currentLevel < 0) {
                wrappers[item.nestedLevel] = wrapper;
            } else if (hasItemsAtLevel(lists, i, currentLevel)) {
                lastLi?.appendChild(wrapper);
            } else {
                wrappers[currentLevel]?.appendChild(wrapper);
            }

            wrappers[item.nestedLevel] = wrapper;
        }

        currentLevel = item.nestedLevel;

        const li = document.createElement("li");
        li.appendChild(item.listContent);
        wrappers[currentLevel]?.appendChild(li);
        lastLi = li;
    }

    return wrappers[0];
}

function hasItemsAtLevel(lists: ListClass[], fromIndex: number, level: number): boolean {
    for (let i = fromIndex; i < lists.length; i++) {
        const list = lists[i];
        if (list && list.nestedLevel === level) {
            return true;
        }
        if (list && list?.nestedLevel < level) {
            return false;
        }
    }
    return false;
}

function parseListWrapper(wrapper: HTMLElement, wrapperType: ListWrapper, level: number, result: ListClass[]) {
    for (const child of Array.from(wrapper.children)) {
        if (isList(child)) {
            const clone = child.cloneNode(true) as HTMLElement;
            clone.querySelectorAll("ul, ol").forEach(el => el.remove());

            const fragment = new DocumentFragment();
            for (const node of Array.from(clone.childNodes)) {
                fragment.appendChild(node);
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

function isListWrapper(element: Element): boolean {
    return element.nodeName === "UL" || element.nodeName === "OL";
}

function toListWrapper(element: Element): ListWrapper {
    return element.nodeName === "UL" ? ListWrapper.UL : ListWrapper.OL;
}