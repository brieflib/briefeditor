import {Display, isSchemaContain} from "@/core/normalize/type/schema";
import {getElement, getNextNode, getRootElement} from "@/core/shared/element-util";
import {getFirstSelectedRoot} from "@/core/selection/selection";
import {getCursorPosition} from "@/core/shared/type/cursor-position";

export function listsOrderNumbers(contentEditable: HTMLElement): number[] {
    const cursorPosition = getCursorPosition();
    const rootListElement = getFirstSelectedRoot(contentEditable, cursorPosition);
    const startListElement = getStartListWrapper(rootListElement);

    const startList = getElement(contentEditable, cursorPosition.startContainer as HTMLElement, [Display.List]);
    const endList = getElement(contentEditable, cursorPosition.endContainer as HTMLElement, [Display.List]);

    const orderNumbers: number[] = [];
    let current: ChildNode | null = startList;
    while (current) {
        if (isSchemaContain(current, [Display.List])) {
            orderNumbers.push(getListPosition(startListElement, current));
        }
        if (current === endList) {
            break;
        }
        if (isSchemaContain(current, [Display.List, Display.ListWrapper])) {
            current = current.firstChild;
            continue;
        }
        current = getNextNode(contentEditable, current);
    }

    return orderNumbers;
}

function getStartListWrapper(listWrapper: Element) {
    while(listWrapper.previousElementSibling && isSchemaContain(listWrapper, [Display.ListWrapper])) {
        listWrapper = listWrapper.previousElementSibling;
    }

    return listWrapper as HTMLElement;
}

export function countListWrapperParents(findTill: HTMLElement, element: Element) {
    let count = 0;
    let current = element.parentElement;

    while (current && current !== findTill) {
        if (isSchemaContain(current, [Display.ListWrapper])) {
            count++;
        }
        current = current.parentElement;
    }

    return count;
}

export function isChildrenContain(children: HTMLCollection, containIn: HTMLElement[]) {
    for (const child of children) {
        if (containIn.includes(child as HTMLElement)) {
            return true;
        }
    }

    return false;
}

export function moveListWrapperToPreviousLi(rootElement: HTMLElement) {
    const listWrappers = rootElement.querySelectorAll("ul, ol");

    for (const listWrapper of listWrappers) {
        moveToPreviousLi(listWrapper);
    }

    for (const listWrapper of listWrappers) {
        moveToPreviousListWrapper(listWrapper);
        moveToPreviousLi(listWrapper);
    }
}

export function getLisWithFirstChildListWrapper(contentEditable: HTMLElement, element: HTMLElement) {
    const lis: HTMLElement[] = [];

    fillLisWithFirstChildListWrapper(element, lis);

    let nextElement = getRootElement(contentEditable, element).nextElementSibling;
    while (nextElement && isSchemaContain(nextElement, [Display.ListWrapper])) {
        fillLisWithFirstChildListWrapper(nextElement as HTMLElement, lis);
        nextElement = nextElement.nextElementSibling;
    }

    return lis;
}

export function moveListWrappersOutOfLi(contentEditable: HTMLElement, element: HTMLElement) {
    const lis = getLisWithFirstChildListWrapper(contentEditable, element);

    for (let i = lis.length; i >= 0; i--) {
        const li = lis[i];
        if (!li) {
            continue;
        }
        const previousLi = getPreviousLi(li, lis[i - 1]);

        const listWrappers = getDirectChildren(li, [Display.ListWrapper]);
        if (previousLi && countListWrapperParents(contentEditable, li) > countListWrapperParents(contentEditable, previousLi)) {
            const liToAppend = getLiAtNestingLevel(contentEditable, li, previousLi);
            listWrappers.forEach(listWrapper => liToAppend?.appendChild(listWrapper));
            continue;
        }

        if (previousLi) {
            listWrappers.forEach(listWrapper => previousLi?.appendChild(listWrapper));
            continue;
        }

        listWrappers.forEach(listWrapper => li.before(listWrapper));
    }
}

export function getDirectChildren(li: Element, display: Display[]) {
    const listWrappers: Element[] = [];

    Array.from(li.children).forEach(element => {
        if (isSchemaContain(element, display)) {
            listWrappers.push(element);
        }
    });

    return listWrappers;
}

function getLiAtNestingLevel(contentEditable: HTMLElement, li: Element, previousLi: Element | null) {
    while (previousLi && countListWrapperParents(contentEditable, li) !== countListWrapperParents(contentEditable, previousLi)) {
        previousLi = previousLi.querySelector(":scope li:nth-last-child(1)");
    }

    return previousLi;
}

function getPreviousLi(li: Element, previousLi?: Element): Element | null | undefined {
    if (previousLi) {
        return previousLi;
    }

    if (li.previousElementSibling) {
        return li.previousElementSibling;
    }

    if (li.parentElement) {
        return getPreviousLi(li.parentElement);
    }

    return null;
}

function moveToPreviousLi(listWrapper: Element) {
    const previousLi = listWrapper.previousElementSibling;
    if (previousLi && isSchemaContain(previousLi, [Display.List])) {
        previousLi.appendChild(listWrapper);
    }
}

function moveToPreviousListWrapper(listWrapper: Element) {
    const parent = listWrapper.parentElement;
    const previousListWrapper = parent?.previousElementSibling;
    if (previousListWrapper && isSchemaContain(previousListWrapper, [Display.ListWrapper])) {
        previousListWrapper.appendChild(listWrapper);
        if (!parent.textContent) {
            parent.remove();
        }
    }
}

function fillLisWithFirstChildListWrapper(element: HTMLElement, lis: HTMLElement[]) {
    const nestedLis = element.querySelectorAll("li");
    const lisWithFirstChild = Array.from(nestedLis).filter(isLiWithFirstChildListWrapper);
    lis.push(...lisWithFirstChild);
}

function isLiWithFirstChildListWrapper(element: HTMLElement) {
    const maybeListWrapper = element.firstChild;
    const maybeText = maybeListWrapper?.firstChild?.firstChild;

    return isSchemaContain(element, [Display.List]) &&
        isSchemaContain(maybeListWrapper, [Display.ListWrapper]) &&
        maybeText?.nodeType === Node.TEXT_NODE;
}

function getListPosition(listWrapper: Element | null, list: ChildNode): number {
    let offset = 0;
    while(listWrapper && isSchemaContain(listWrapper, [Display.ListWrapper])) {
        const allLists = listWrapper.querySelectorAll("li");
        for (let i = 0; i < allLists.length; i++) {
            if (allLists[i] === list) {
                return i + offset;
            }
        }
        offset += allLists.length;
        listWrapper = listWrapper.nextElementSibling;
    }

    return 0;
}