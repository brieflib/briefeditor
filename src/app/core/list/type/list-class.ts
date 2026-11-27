import {Display, isSchemaContain} from "@/core/normalize/type/schema";
import {CursorPosition, getCursorPosition, intersectsNode} from "@/core/shared/type/cursor-position";

export enum ListWrapper {
    UL = "UL",
    OL = "OL"
}

export class ListClass {
    nestedLevel!: number;
    listWrapper!: ListWrapper;
    listContent!: DocumentFragment;
    selected!: boolean;
    attributes!: [string, string][];
    wrapperAttributes!: [string, string][];
}

/**
 * Flattens the run of list wrappers that `listWrapper` belongs to into one `ListClass` per line.
 * Each item's line is moved into its `ListClass`, leaving the item empty, unless `isClone` asks for a copy.
 */
export function parseList(listWrapper: HTMLElement, cursorPosition = getCursorPosition(), isClone = false): ListClass[] {
    const result: ListClass[] = [];

    for (const wrapper of getListWrappers(listWrapper)) {
        parseListWrapper(wrapper, 0, result, cursorPosition, isClone);
    }

    return result;
}

/**
 * The list wrappers from the first one to the last one.
 */
function getListWrappers(listWrapper: HTMLElement): HTMLElement[] {
    if (!isSchemaContain(listWrapper, [Display.ListWrapper])) {
        return [];
    }

    let first: Element = listWrapper;
    while (first.previousElementSibling && isSchemaContain(first.previousElementSibling, [Display.ListWrapper])) {
        first = first.previousElementSibling;
    }

    const wrappers: HTMLElement[] = [];
    let current: Element | null = first;
    while (current && isSchemaContain(current, [Display.ListWrapper])) {
        wrappers.push(current as HTMLElement);
        current = current.nextElementSibling;
    }

    return wrappers;
}

/**
 * Rebuilds a flat `ListClass[]` (the inverse of {@link parseList}) into nested list markup.
 * Expects lists cleaned up by {@link normalizeLists}: starting at level 0 and going at most one level deeper per line.
 */
export function convertList(lists: ListClass[]): DocumentFragment {
    const fragment = new DocumentFragment();
    const wrappers: HTMLElement[] = [];

    for (const list of lists) {
        // Close the wrappers deeper than this line
        wrappers.length = Math.min(wrappers.length, list.nestedLevel + 1);

        // A line of the other type closes the wrapper of its level and opens one of its own beside it
        if (wrappers[list.nestedLevel]?.nodeName !== list.listWrapper) {
            wrappers.length = list.nestedLevel;
            const wrapper = document.createElement(list.listWrapper);
            for (const [name, value] of list.wrapperAttributes) {
                wrapper.setAttribute(name, value);
            }
            const parent = wrappers[list.nestedLevel - 1]?.lastElementChild ?? fragment;
            parent.appendChild(wrapper);
            wrappers.push(wrapper);
        }

        const li = document.createElement("li");
        for (const [name, value] of list.attributes) {
            li.setAttribute(name, value);
        }
        li.appendChild(list.listContent);
        wrappers[list.nestedLevel]?.appendChild(li);
    }

    return fragment;
}

/**
 * Renumbers nesting levels and drops items with no content - an empty wrapper the parse walked through.
 *
 * @returns The cleaned-up list.
 */
export function normalizeLists(lists: ListClass[]): ListClass[] {
    const result: ListClass[] = [];
    const levelMap = new Map<number, number>();

    for (const list of lists) {
        if (isWithoutContent(list)) {
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

    return result;
}

/** Moves every selected line one level deeper. */
export function plusLevel(lists: ListClass[]): ListClass[] {
    for (const list of lists) {
        if (list.selected) {
            list.nestedLevel += 1;
        }
    }

    return lists;
}

/** Moves every selected line one level shallower. */
export function minusLevel(lists: ListClass[]): ListClass[] {
    for (const list of lists) {
        if (list.selected) {
            list.nestedLevel -= 1;
        }
    }

    return lists;
}

/** Whether a `ListClass` line holds no content (nested lists don't count, per `listContent`). */
function isWithoutContent(list: ListClass): boolean {
    return !list.listContent.textContent && !list.listContent.firstElementChild;
}

function parseListWrapper(wrapper: HTMLElement, level: number, result: ListClass[], cursorPosition: CursorPosition,
                          isClone: boolean) {
    for (const child of Array.from(wrapper.children) as HTMLElement[]) {
        if (isList(child)) {
            parseListItem(child, wrapper, level, result, cursorPosition, isClone);
        } else if (isSchemaContain(child, [Display.ListWrapper])) {
            parseListWrapper(child, level + 1, result, cursorPosition, isClone);
        }
    }
}

/** Reads an item's own line, then walks into any lists nested in it, each a level deeper. */
function parseListItem(item: HTMLElement, wrapper: HTMLElement, level: number, result: ListClass[],
                       cursorPosition: CursorPosition, isClone: boolean) {
    const listClass = new ListClass();
    listClass.nestedLevel = level;
    listClass.listWrapper = toWrapperType(wrapper);
    listClass.attributes = getAttributes(item);
    listClass.wrapperAttributes = getAttributes(wrapper);
    // Read before the line is moved out, since the cursor's nodes leave the item with it
    listClass.selected = isLineSelected(item, cursorPosition);
    listClass.listContent = getChildFragment(item, isClone);
    result.push(listClass);

    for (const child of Array.from(item.children) as HTMLElement[]) {
        if (isSchemaContain(child, [Display.ListWrapper])) {
            parseListWrapper(child, level + 1, result, cursorPosition, isClone);
        }
    }
}

/** Copies `element`'s attributes into name/value pairs that outlive the DOM node. */
function getAttributes(element: Element): [string, string][] {
    return Array.from(element.attributes)
        .map(attribute => [attribute.name, attribute.value] as [string, string]);
}

function isList(element: HTMLElement): boolean {
    return element.nodeName === "LI";
}

function toWrapperType(element: HTMLElement): ListWrapper {
    return element.nodeName === "UL" ? ListWrapper.UL : ListWrapper.OL;
}

/**
 * Whether the cursor touches the item's own line; a nested list inside the item doesn't count.
 * An item without a line of its own, such as an empty one, is selected by a cursor resting on the item before its nested list.
 */
function isLineSelected(item: HTMLElement, cursorPosition: CursorPosition): boolean {
    const childNodes = Array.from(item.childNodes);
    const firstListIndex = childNodes.findIndex(node => isSchemaContain(node, [Display.ListWrapper]));
    const lineEnd = firstListIndex === -1 ? childNodes.length : firstListIndex;

    // A cursor resting on the item itself, beside a br or in an item with no line of its own, intersects no node
    for (let offset = 0; offset <= lineEnd; offset++) {
        if (cursorPosition.range.isPointInRange(item, offset)) {
            return true;
        }
    }

    return childNodes.some(node => {
        if (isSchemaContain(node, [Display.ListWrapper])) {
            return false;
        }

        return intersectsNode(cursorPosition, node);
    });
}


/** Moves the item's own line (everything but nested list wrappers) into a fragment, or copies it when `isClone` is set. */
function getChildFragment(child: Element, isClone: boolean) {
    const fragment = new DocumentFragment();
    for (const node of Array.from(child.childNodes)) {
        if (!isSchemaContain(node, [Display.ListWrapper])) {
            fragment.appendChild(isClone ? node.cloneNode(true) : node);
        }
    }

    return fragment;
}
