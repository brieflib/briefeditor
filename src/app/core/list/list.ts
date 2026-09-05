import {getFirstSelectedRoot, getSelectedBlock} from "@/core/selection/selection";
import {Display, isSchemaContain} from "@/core/normalize/type/schema";
import {
    appendBeforeAndDelete,
    countListWrapperParents,
    getDirectChildren, getFirstListWrapper,
    getListsOrderNumbers,
    isChildrenContain,
    isListEmpty
} from "@/core/list/util/list-util";
import {getFirstText, getNextNode} from "@/core/shared/element-util";
import {CursorPosition, getCursorPosition, getCursorPositionFrom, isCollapsed} from "@/core/shared/type/cursor-position";
import {
    convertList,
    ListClass,
    minusOrderNumbers,
    normalizeLists,
    parseList,
    plusOrderNumbers
} from "@/core/list/type/list-class";

export function isNextListNested(contentEditable: HTMLElement, lists: HTMLElement[] = getSelectedBlock(contentEditable)) {
    const lastList = lists[lists.length - 1];
    if (!lastList) {
        return false;
    }
    if (!isSchemaContain(lastList, [Display.List])) {
        return false;
    }
    const listWrapperChildren = getDirectChildren(lastList, [Display.ListWrapper]);
    if (listWrapperChildren.length) {
        return true;
    }
    const maybeNextList = getNextNode(contentEditable, lastList);
    if (!maybeNextList) {
        return false;
    }
    const nestedLevel = countListWrapperParents(contentEditable, maybeNextList as HTMLElement);
    if (isSchemaContain(maybeNextList, [Display.List])) {
        return nestedLevel !== 1;
    }
    if (isSchemaContain(maybeNextList, [Display.ListWrapper])) {
        return nestedLevel !== 0;
    }

    return false;
}

export function isPlusIndentEnabled(contentEditable: HTMLElement, lists: HTMLElement[] = getSelectedBlock(contentEditable)) {
    const firstList = lists[0];
    if (!firstList) {
        return false;
    }

    const previousListWrapper = firstList.parentElement?.previousElementSibling;
    if (previousListWrapper && previousListWrapper && isSchemaContain(previousListWrapper, [Display.ListWrapper])) {
        return true;
    }

    if (!firstList.previousElementSibling || !isSchemaContain(firstList.previousElementSibling, [Display.List, Display.ListWrapper])) {
        return false;
    }

    for (const list of lists) {
        if (!isSchemaContain(list, [Display.List])) {
            return false;
        }

        if (countListWrapperParents(contentEditable, list) >= 5) {
            return false;
        }
    }

    return true;
}

export function plusIndent(contentEditable: HTMLElement) {
    if (!isPlusIndentEnabled(contentEditable, getSelectedBlock(contentEditable))) {
        return;
    }

    const cursorPosition = getCursorPosition();
    const firstListWrapper = getFirstSelectedRoot(contentEditable, cursorPosition);
    const listsOrderNumbers = getListsOrderNumbers(contentEditable, cursorPosition);
    const lists = parseList(firstListWrapper);
    const plussedLists = plusOrderNumbers(lists, listsOrderNumbers);
    const listWrappers = convertList(plussedLists);
    appendBeforeAndDelete(firstListWrapper, listWrappers);
}

export function isMinusIndentEnabled(contentEditable: HTMLElement) {
    const lists = getSelectedBlock(contentEditable);
    for (const list of lists) {
        if (!list) {
            return false;
        }

        if (!isSchemaContain(list, [Display.List])) {
            return false;
        }

        const listNesting = countListWrapperParents(contentEditable, list);
        if (listNesting === 1) {
            return false;
        }

        const nextList = list.querySelectorAll("ul, ol")[0];
        if (!nextList) {
            continue;
        }

        if (!isChildrenContain(nextList.children, lists) && isSchemaContain(nextList, [Display.ListWrapper])) {
            return false;
        }
    }

    return true;
}

export function minusIndent(contentEditable: HTMLElement) {
    if (!isMinusIndentEnabled(contentEditable)) {
        return;
    }

    const cursorPosition = getCursorPosition();
    const firstListWrapper = getFirstSelectedRoot(contentEditable, cursorPosition);
    const listsOrderNumbers = getListsOrderNumbers(contentEditable);
    const lists = parseList(firstListWrapper);
    const minusLists = minusOrderNumbers(lists, listsOrderNumbers);
    const listWrappers = convertList(minusLists);
    appendBeforeAndDelete(firstListWrapper, listWrappers);
}

export function maybeInsertLists(contentEditable: HTMLElement, cursorPosition: CursorPosition): CursorPosition {
    const firstRoot = getFirstSelectedRoot(contentEditable, cursorPosition);
    const firstListWrapper = getFirstListWrapper(firstRoot);
    if (!isSchemaContain(firstListWrapper, [Display.ListWrapper])) {
        return cursorPosition;
    }

    const lists = parseList(firstRoot);
    const normalized = normalizeLists(lists, cursorPosition);
    const listWrappers = convertList(normalized.lists);
    appendBeforeAndDelete(firstRoot, listWrappers);

    return normalized.cursorPosition;
}

export function isCursorInEmptyList(contentEditable: HTMLElement, cursorPosition: CursorPosition) {
    if (!isCollapsed(cursorPosition)) {
        return false;
    }

    const block = getSelectedBlock(contentEditable, cursorPosition)[0];
    if (!block || !isSchemaContain(block, [Display.List])) {
        return false;
    }

    return isListEmpty(block);
}

// An empty item has nothing left to break, so a new line unwraps it instead of growing the list by one more
// empty item. A nested item is lifted one level, the way the minus indent button lifts it, and the items that
// followed it stay on the level they were on, which turns them into its children. An item on the first level
// has nowhere left to be lifted to and leaves the list instead.
export function exitList(contentEditable: HTMLElement, cursorPosition: CursorPosition): CursorPosition {
    const root = getFirstSelectedRoot(contentEditable, cursorPosition);
    const orderNumber = getListsOrderNumbers(contentEditable, cursorPosition)[0] ?? 0;
    const block = getSelectedBlock(contentEditable, cursorPosition)[0];

    if (block && countListWrapperParents(contentEditable, block) > 1) {
        return minusIndentList(root, cursorPosition, orderNumber);
    }

    const paragraph = document.createElement("p");
    paragraph.appendChild(document.createElement("br"));
    splitListAround(root, cursorPosition, paragraph, orderNumber);

    const firstText = getFirstText(paragraph);
    return getCursorPositionFrom(firstText, 0, firstText, 0);
}

// The item is lifted together with the items nested inside it: left where they are they would jump two levels
// below the lifted item, and a list two levels apart is built as an item inside an item. The br standing in for
// the content of the item is moved into the rebuilt list rather than made anew, so the cursor keeps to it.
function minusIndentList(root: HTMLElement, cursorPosition: CursorPosition, orderNumber: number): CursorPosition {
    const lists = parseList(root);
    const minusLists = minusOrderNumbers(lists, withNested(lists, orderNumber));
    appendBeforeAndDelete(root, convertList(minusLists));

    return getCursorPositionFrom(cursorPosition.startContainer, cursorPosition.startOffset,
        cursorPosition.endContainer, cursorPosition.endOffset);
}

// The items nested inside the one at the order number are the ones following it until the level it sits on is
// reached again. Read before the levels are changed, as the minus writes them back in place.
function withNested(lists: ListClass[], orderNumber: number): number[] {
    const list = lists[orderNumber];
    if (!list) {
        return [orderNumber];
    }

    const orderNumbers = [orderNumber];
    for (let i = orderNumber + 1; i < lists.length; i++) {
        const nested = lists[i];
        if (!nested || nested.nestedLevel <= list.nestedLevel) {
            break;
        }
        orderNumbers.push(i);
    }

    return orderNumbers;
}

// A list wrapper holds nothing but its items, so a node cannot be placed inside one. The list is parsed into
// its items instead, and the two sides of the split are converted back into a list of their own, with the node
// between them. Both sides are normalized first, which rebases the nesting of a side that starts inside a
// nested list and drops the item left empty by the split.
export function splitListAround(root: HTMLElement, cursorPosition: CursorPosition, node: Node, splitIndex: number) {
    const lists = parseList(root);
    const fragment = new DocumentFragment();
    fragment.append(convertList(normalizeLists(lists.slice(0, splitIndex), cursorPosition).lists));
    fragment.append(node);
    fragment.append(convertList(normalizeLists(lists.slice(splitIndex), cursorPosition).lists));

    appendBeforeAndDelete(root, fragment);
}
