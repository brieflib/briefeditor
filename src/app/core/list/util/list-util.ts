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

/**
 * The line an item was written as, with any nested list wrappers stripped out - the same
 * content {@link parseList} reads into a `ListClass`. Anything that inspects or writes onto
 * an item's line should go through this rather than stripping wrappers on its own.
 */
export function getLine(block: Element): HTMLElement {
    const line = block.cloneNode(true) as HTMLElement;
    getDirectChildren(line, [Display.ListWrapper]).forEach(listWrapper => listWrapper.remove());

    return line;
}

/** Whether a list item's line is empty. An image counts as content, the same as text does. */
export function isListEmpty(list: Element) {
    const line = getLine(list);

    return !line.textContent && !line.querySelector(imageSelector);
}

/**
 * The next list wrapper or item in the same run, skipping over insignificant whitespace
 * text nodes. An item standing outside any wrapper (pasted markup can hold one) still
 * counts as part of the run.
 */
export function getNextListWrapper(wrapper: Element): Element | null {
    return getSiblingListWrapper(wrapper, node => node.nextSibling);
}

/** The previous list wrapper or item in the same run. See {@link getNextListWrapper}. */
export function getPreviousListWrapper(wrapper: Element): Element | null {
    return getSiblingListWrapper(wrapper, node => node.previousSibling);
}

function getSiblingListWrapper(wrapper: Element, sibling: (node: ChildNode) => ChildNode | null): Element | null {
    let node: ChildNode | null = sibling(wrapper);
    while (node && node.nodeType === Node.TEXT_NODE && !node.textContent?.trim()) {
        node = sibling(node);
    }

    return node && isSchemaContain(node, [Display.ListWrapper, Display.List]) ? node as Element : null;
}

/**
 * The wrapper (or item) that opens the run `rootWrapper` belongs to. Returns `rootWrapper`
 * unchanged if it's neither a wrapper nor an item, since a root outside the run (e.g. a
 * paragraph standing next to a list) must not be read as one of its lines.
 */
export function getFirstListWrapper(rootWrapper: HTMLElement) {
    if (!isSchemaContain(rootWrapper, [Display.ListWrapper, Display.List])) {
        return rootWrapper;
    }

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