import {Display, getOfType, isSchemaContain} from "@/core/normalize/type/schema";
import {getElement, getNextNode} from "@/core/shared/element-util";
import {getFirstSelectedRoot} from "@/core/selection/selection";
import {getCursorPosition} from "@/core/shared/type/cursor-position";

const imageSelector = getOfType([Display.Image]).join(",");

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
    while (listWrapper.previousElementSibling && isSchemaContain(listWrapper.previousElementSibling, [Display.ListWrapper])) {
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

export function getDirectChildren(li: Element, display: Display[]) {
    const listWrappers: Element[] = [];

    Array.from(li.children).forEach(element => {
        if (isSchemaContain(element, display)) {
            listWrappers.push(element);
        }
    });

    return listWrappers;
}

// The line an item was written as. A nested list is the content of its own items, not of the item holding
// it, so it is left out of the line the item stands for - which is the content parseList reads into a
// ListClass. Everything that weighs an item, or writes onto its line, asks for the line here rather than
// stripping the wrappers again on its own.
export function getLine(block: Element): HTMLElement {
    const line = block.cloneNode(true) as HTMLElement;
    getDirectChildren(line, [Display.ListWrapper]).forEach(listWrapper => listWrapper.remove());

    return line;
}

// An image stands for content the way text does and keeps the item from counting as empty.
export function isListEmpty(list: Element) {
    const line = getLine(list);

    return !line.textContent && !line.querySelector(imageSelector);
}

// A list is written as a run of wrappers standing side by side, so the wrapper the run opens on is found by
// walking to the end of it and back. Anything written between two wrappers keeps them apart and ends the run
// there - but the whitespace an author leaves between tags is not writing, and the wrappers on either side
// of it are still lines of one list.
export function getNextListWrapper(wrapper: Element): Element | null {
    return getSiblingListWrapper(wrapper, node => node.nextSibling);
}

export function getPreviousListWrapper(wrapper: Element): Element | null {
    return getSiblingListWrapper(wrapper, node => node.previousSibling);
}

function getSiblingListWrapper(wrapper: Element, sibling: (node: ChildNode) => ChildNode | null): Element | null {
    let node: ChildNode | null = sibling(wrapper);
    while (node && node.nodeType === Node.TEXT_NODE && !node.textContent?.trim()) {
        node = sibling(node);
    }

    return node && isSchemaContain(node, [Display.ListWrapper]) ? node as Element : null;
}

export function getFirstListWrapper(rootWrapper: HTMLElement) {
    let firstWrapper: Element = rootWrapper;
    let next = getNextListWrapper(firstWrapper);
    while (next) {
        firstWrapper = next;
        next = getNextListWrapper(firstWrapper);
    }
    let previous = getPreviousListWrapper(firstWrapper);
    while (previous) {
        firstWrapper = previous;
        previous = getPreviousListWrapper(firstWrapper);
    }

    return firstWrapper;
}

export function appendBeforeAndDelete(rootWrapper: HTMLElement, listWrapper: DocumentFragment) {
    const firstWrapper = getFirstListWrapper(rootWrapper);
    firstWrapper.before(listWrapper);

    let current: Element | null = firstWrapper;
    while (current) {
        const next: Element | null = getNextListWrapper(current);
        current.remove();
        current = next;
    }
}

function getListPosition(listWrapper: Element | null, list: ChildNode): number {
    let offset = 0;
    while (listWrapper && isSchemaContain(listWrapper, [Display.ListWrapper])) {
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