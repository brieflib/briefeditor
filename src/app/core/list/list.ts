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
import {anchorCursorOnLeaf} from "@/core/normalize/util/normalize-util";
import {CursorPosition, getCursorPosition, getCursorPositionFrom, isCollapsed} from "@/core/shared/type/cursor-position";
import {
    convertList,
    isListClassEmpty,
    ListClass,
    minusOrderNumbers,
    normalizeLists,
    parseList,
    plusOrderNumbers,
    shiftOrderNumbers
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

// The list is rebuilt from the content of its items, so a cursor anchored on an item is left pointing at a
// node the rebuild threw away. An empty item is where the browser leaves it: the item has no text of its own
// to hold the cursor. Anchoring it on the br standing in for that content up front keeps it valid, and the
// caller restores the position handed back to it.
export function plusIndent(contentEditable: HTMLElement): CursorPosition {
    const cursorPosition = anchorCursorOnLeaf(getCursorPosition());
    if (!isPlusIndentEnabled(contentEditable, getSelectedBlock(contentEditable, cursorPosition))) {
        return cursorPosition;
    }

    const firstListWrapper = getFirstSelectedRoot(contentEditable, cursorPosition);
    const listsOrderNumbers = getListsOrderNumbers(contentEditable, cursorPosition);
    const lists = parseList(firstListWrapper);
    const plussedLists = plusOrderNumbers(lists, listsOrderNumbers);
    const listWrappers = convertList(plussedLists);
    appendBeforeAndDelete(firstListWrapper, listWrappers);
    return cursorPosition;
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

// The cursor is anchored on a leaf for the same reason as the plus indent above, which rebuilds the list the
// same way.
export function minusIndent(contentEditable: HTMLElement): CursorPosition {
    const cursorPosition = anchorCursorOnLeaf(getCursorPosition());
    if (!isMinusIndentEnabled(contentEditable)) {
        return cursorPosition;
    }

    const firstListWrapper = getFirstSelectedRoot(contentEditable, cursorPosition);
    const listsOrderNumbers = getListsOrderNumbers(contentEditable, cursorPosition);
    const lists = parseList(firstListWrapper);
    const minusLists = minusOrderNumbers(lists, listsOrderNumbers);
    const listWrappers = convertList(minusLists);
    appendBeforeAndDelete(firstListWrapper, listWrappers);

    return cursorPosition;
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

// Backspace at the start of an item merges it into the item above it. An item above that stands empty holds no
// content to merge into: the cursor is in the item that merges, and the empty one is the entry before it. The
// item the cursor is in is the one that survives, so it is written as it stands.
export function mergeIntoPreviousEmptyItem(contentEditable: HTMLElement, cursorPosition: CursorPosition): CursorPosition {
    const orderNumber = getListsOrderNumbers(contentEditable, cursorPosition)[0] ?? 0;

    return mergeIntoEmptyItem(contentEditable, cursorPosition, orderNumber - 1, false);
}

// Delete at the end of an empty item joins the same two lines from the other side: the cursor is in the empty
// item itself, and the item merging into it is the one written after it. The empty line is the one the cursor
// stands on, so it is the line that survives and the item merging in is written onto it.
export function mergeNextIntoEmptyItem(contentEditable: HTMLElement, cursorPosition: CursorPosition): CursorPosition {
    const orderNumber = getListsOrderNumbers(contentEditable, cursorPosition)[0] ?? 0;

    return mergeIntoEmptyItem(contentEditable, cursorPosition, orderNumber, true);
}

// An empty item is the line the merge lands on, so it is dropped, and the item merging into it is named to the
// rebuild below: the line it stood on is the one blank line that goes. Which of the two the cursor is in says
// what becomes of the item merging in. Standing on the empty line, the writer deletes forward onto the line
// itself, and the item is written onto it: it takes the level the line stood on, whichever level it came from.
// Standing in the item, the writer deletes the line above it, and the item is left as it was written - pushed
// down only onto a line nested deeper than it, which the rebuild cannot do on its own, lowering the levels it
// finds but never deepening one. The items nested inside it come along either way, or they would be left two
// levels below it. Both the order numbers and the parse walk the wrappers in the order the items are written
// in, so the item merging into the empty one is always the entry after it, whichever of the two the cursor is
// in.
function mergeIntoEmptyItem(contentEditable: HTMLElement, cursorPosition: CursorPosition, emptyOrderNumber: number,
                            isCursorOnEmptyLine: boolean): CursorPosition {
    const root = getFirstSelectedRoot(contentEditable, cursorPosition);
    const lists = parseList(root);
    const empty = lists[emptyOrderNumber];
    const merged = lists[emptyOrderNumber + 1];
    if (empty && merged && (isCursorOnEmptyLine || merged.nestedLevel < empty.nestedLevel)) {
        // Read before the levels are changed, as withNested reads them to tell the nested items apart.
        const nested = withNested(lists, emptyOrderNumber + 1);
        shiftOrderNumbers(lists, nested, empty.nestedLevel - merged.nestedLevel);

        // The line the item is written onto belongs to the wrapper it was written in, and a wrapper ending at
        // that line goes with it. The item takes it over rather than letting it go: a list does not change its
        // type because a line was deleted from it.
        if (isCursorOnEmptyLine && !hasLineBelow(lists, emptyOrderNumber, nested)) {
            merged.listWrapper = empty.listWrapper;
        }
    }

    // The parse moves the content of every item into a fragment of its own, the cursor's text node with it, and
    // the convert moves it back into the rebuilt item, so the cursor is left pointing at a node that is still
    // there. A cursor on the br of the empty item is the one node thrown away, and normalizeLists carries it
    // over to the item that took its line. A line holding content is never the one dropped, whatever the order
    // number says.
    const normalized = normalizeLists(lists, cursorPosition, isListClassEmpty(empty) ? empty : undefined);
    appendBeforeAndDelete(root, convertList(normalized.lists));

    return normalized.cursorPosition;
}

// Backspace at the start of an item opening the document has no line above it to merge into. An empty item
// holds no content to keep, so it is dropped and the list is left standing on the item written below it. The
// only item of a list is left where it is: dropped it would take the list with it, and leaving the list is
// what a new line in an empty item is for.
export function removeEmptyItem(contentEditable: HTMLElement, cursorPosition: CursorPosition): CursorPosition {
    // The item is empty, so the browser anchors the cursor on the item itself, and the item is one of the
    // nodes the rebuild throws away. The br standing in for its content is carried over instead.
    cursorPosition = anchorCursorOnLeaf(cursorPosition);
    const root = getFirstSelectedRoot(contentEditable, cursorPosition);
    const orderNumber = getListsOrderNumbers(contentEditable, cursorPosition)[0] ?? 0;
    const lists = parseList(root);
    const empty = lists[orderNumber];
    if (lists.length < 2 || !isListClassEmpty(empty)) {
        return cursorPosition;
    }

    const normalized = normalizeLists(lists, cursorPosition, empty);
    appendBeforeAndDelete(root, convertList(normalized.lists));

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
    // The item is empty, so the browser anchors the cursor on the item itself, and the item is one of the
    // nodes the rebuild below throws away. The br standing in for its content is carried over instead.
    cursorPosition = anchorCursorOnLeaf(cursorPosition);
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

// A wrapper is written top down, so it goes on below the line only when another of its own lines follows.
// Standing for those it keeps the type it was written as, and the item merging in - written where the line
// stood, above them - opens a list of its own instead. The lines written above the empty one hold no wrapper
// of their own open: the item takes their wrapper over and is written as one more of their lines. The search
// starts after the items nested inside the one merging in, which come along with it, and walks past items
// nested deeper, each a line of a list of its own; the first item written on the level of the empty line
// either shares its wrapper or opens a list of another type below it.
function hasLineBelow(lists: ListClass[], emptyOrderNumber: number, nested: number[]): boolean {
    const empty = lists[emptyOrderNumber];
    if (!empty) {
        return false;
    }

    for (let i = (nested[nested.length - 1] ?? emptyOrderNumber) + 1; i < lists.length; i++) {
        const list = lists[i];
        if (!list || list.nestedLevel < empty.nestedLevel) {
            return false;
        }

        if (list.nestedLevel === empty.nestedLevel) {
            return list.listWrapper === empty.listWrapper;
        }
    }

    return false;
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
// nested list. The node takes the place of the line the split opens the second side on when that line stands
// blank, so it is the item named to the normalize; a line holding content is kept and written below the node.
export function splitListAround(root: HTMLElement, cursorPosition: CursorPosition, node: Node, splitIndex: number) {
    const lists = parseList(root);
    const splitAt = lists[splitIndex];
    const fragment = new DocumentFragment();
    fragment.append(convertList(normalizeLists(lists.slice(0, splitIndex), cursorPosition).lists));
    fragment.append(node);
    fragment.append(convertList(normalizeLists(lists.slice(splitIndex), cursorPosition,
        isListClassEmpty(splitAt) ? splitAt : undefined).lists));

    appendBeforeAndDelete(root, fragment);
}
