import {Display, isSchemaContain} from "@/core/normalize/type/schema";
import {getElement, getNextNode, getRootElement} from "@/core/shared/element-util";
import {getFirstSelectedRoot} from "@/core/selection/selection";
import {getCursorPosition} from "@/core/shared/type/cursor-position";

export function getListsOrderNumbers(contentEditable: HTMLElement, cursorPosition = getCursorPosition()): number[] {
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
    while(listWrapper.previousElementSibling && isSchemaContain(listWrapper.previousElementSibling, [Display.ListWrapper])) {
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

export function getDirectChildren(li: Element, display: Display[]) {
    const listWrappers: Element[] = [];

    Array.from(li.children).forEach(element => {
        if (isSchemaContain(element, display)) {
            listWrappers.push(element);
        }
    });

    return listWrappers;
}

export function appendBeforeAndDelete(rootWrapper: HTMLElement, listWrapper: DocumentFragment) {
    let firstWrapper: Element = rootWrapper;
    while (firstWrapper.previousElementSibling && isSchemaContain(firstWrapper.previousElementSibling, [Display.ListWrapper])) {
        firstWrapper = firstWrapper.previousElementSibling;
    }
    firstWrapper.before(listWrapper);

    let current: Element | null = firstWrapper;
    while (current && isSchemaContain(current, [Display.ListWrapper])) {
        const next: Element | null = current.nextElementSibling;
        current.remove();
        current = next;
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