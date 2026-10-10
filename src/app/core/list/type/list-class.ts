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
    selected!: boolean
}

/**
 * Flattens the run of list wrappers that `listWrapper` belongs to, in order, into one `ListClass` per line.
 */
export function parseList(listWrapper: HTMLElement, cursorPosition = getCursorPosition()): ListClass[] {
    const result: ListClass[] = [];

    for (const wrapper of getListWrappers(listWrapper)) {
        parseListWrapper(wrapper, 0, result, cursorPosition);
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
            const parent = wrappers[list.nestedLevel - 1]?.lastElementChild ?? fragment;
            parent.appendChild(wrapper);
            wrappers.push(wrapper);
        }

        const li = document.createElement("li");
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

function parseListWrapper(wrapper: HTMLElement, level: number, result: ListClass[], cursorPosition: CursorPosition) {
    const wrapperType = toWrapperType(wrapper);
    for (const child of Array.from(wrapper.children) as HTMLElement[]) {
        if (isList(child)) {
            parseListItem(child, wrapperType, level, result, cursorPosition);
        } else if (isSchemaContain(child, [Display.ListWrapper])) {
            parseListWrapper(child, level + 1, result, cursorPosition);
        }
    }
}

/** Reads an item's own line, then walks into any lists nested in it, each a level deeper. */
function parseListItem(item: HTMLElement, wrapperType: ListWrapper, level: number, result: ListClass[], cursorPosition: CursorPosition) {
    const listClass = new ListClass();
    listClass.nestedLevel = level;
    listClass.listWrapper = wrapperType;
    listClass.listContent = getChildFragment(item);
    listClass.selected = isLineSelected(item, cursorPosition);
    result.push(listClass);

    for (const child of Array.from(item.children) as HTMLElement[]) {
        if (isSchemaContain(child, [Display.ListWrapper])) {
            parseListWrapper(child, level + 1, result, cursorPosition);
        }
    }
}

function isList(element: HTMLElement): boolean {
    return element.nodeName === "LI";
}

function toWrapperType(element: HTMLElement): ListWrapper {
    return element.nodeName === "UL" ? ListWrapper.UL : ListWrapper.OL;
}

/** Whether the cursor touches the item's own line; a nested list inside the item doesn't count. */
function isLineSelected(item: HTMLElement, cursorPosition: CursorPosition): boolean {
    const childNodes = Array.from(item.childNodes);

    return childNodes.some((node, index) => {
        if (isSchemaContain(node, [Display.ListWrapper])) {
            return false;
        }

        // A cursor in an empty item rests on the item beside its br, so it intersects no node
        if (isSchemaContain(node, [Display.SelfClose])) {
            const isBefore = cursorPosition.range.isPointInRange(item, index);
            const isAfter = cursorPosition.range.isPointInRange(item, index + 1);
            if (isBefore || isAfter) {
                return true;
            }
        }

        return intersectsNode(cursorPosition, node);
    });
}


function getChildFragment(child: Element) {
    const fragment = new DocumentFragment();
    for (const node of Array.from(child.childNodes)) {
        if (!isSchemaContain(node, [Display.ListWrapper])) {
            fragment.appendChild(node.cloneNode(true));
        }
    }

    return fragment;
}