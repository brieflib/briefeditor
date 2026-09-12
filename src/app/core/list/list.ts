import {getFirstSelectedRoot, getSelectedBlock} from "@/core/selection/selection";
import {Display, isSchemaContain} from "@/core/normalize/type/schema";
import {
    appendBeforeAndDelete,
    countListWrapperParents,
    getFirstListWrapper,
    getListsOrderNumbers,
    getNextListWrapper,
    getPreviousListWrapper,
    isListEmpty
} from "@/core/list/util/list-util";
import {getFirstText} from "@/core/shared/element-util";
import {isCursorAtEndOfBlock, isCursorAtStartOfBlock} from "@/core/cursor/cursor";
import {anchorCursorOnLeaf} from "@/core/normalize/util/normalize-util";
import {
    CursorPosition,
    getCursorPosition,
    getCursorPositionFrom,
    isCollapsed,
    splitAtCursor
} from "@/core/shared/type/cursor-position";
import {
    convertList,
    isListClassEmpty,
    ListClass,
    ListWrapper,
    minusOrderNumbers,
    normalizeLists,
    parseList,
    plusOrderNumbers,
    shiftOrderNumbers
} from "@/core/list/type/list-class";

/** A list nests five wrappers deep at most: one for the item's own level, one per level above it. */
const deepestNestedLevel = 4;

/**
 * Whether the line after the selection's last item opens a list nested deeper than it.
 */
export function isNextListNested(contentEditable: HTMLElement, cursorPosition: CursorPosition = getCursorPosition()) {
    const blocks = getSelectedBlock(contentEditable, cursorPosition);
    const lastBlock = blocks[blocks.length - 1];
    if (!lastBlock || !isSchemaContain(lastBlock, [Display.List])) {
        return false;
    }

    // Only the last item of the selection is asked about, so anchor the parse there directly.
    const parsed = parseSelectedList(contentEditable, cursorPositionOf(lastBlock));
    if (!parsed) {
        return false;
    }

    const orderNumber = parsed.orderNumbers[0] ?? 0;
    const list = parsed.lists[orderNumber];
    const next = parsed.lists[orderNumber + 1];

    return !!list && !!next && next.nestedLevel > list.nestedLevel;
}

/**
 * Whether the item can leave the list without cost.
 *
 * @remarks
 * Leaving the list writes the item as a block of its own, dividing the list around it: the
 * lines below get rebased onto the first level, ending up at a level they were never
 * written at. So an item can only leave when nothing follows it, or what follows is already
 * on the first level.
 */
export function isLeavingListEnabled(contentEditable: HTMLElement, cursorPosition: CursorPosition = getCursorPosition()) {
    const parsed = parseSelectedList(contentEditable, cursorPosition);
    if (!parsed) {
        return true;
    }

    const {lists, orderNumbers} = parsed;
    const next = lists[(orderNumbers[orderNumbers.length - 1] ?? 0) + 1];

    return !next || next.nestedLevel === 0;
}

/**
 * Whether the selected items can be indented one level deeper: there must be a line above at
 * least as deep to nest under, a list doesn't go past {@link deepestNestedLevel}, and no
 * selected item may already be at that depth.
 */
export function isPlusIndentEnabled(contentEditable: HTMLElement, cursorPosition: CursorPosition = getCursorPosition()) {
    const parsed = parseSelectedList(contentEditable, cursorPosition);
    if (!parsed) {
        return false;
    }

    const {lists, orderNumbers} = parsed;
    const first = orderNumbers[0] ?? 0;
    const list = lists[first];
    const previous = lists[first - 1];
    if (!list || !previous || previous.nestedLevel < list.nestedLevel) {
        return false;
    }

    return orderNumbers.every(orderNumber => (lists[orderNumber]?.nestedLevel ?? deepestNestedLevel) < deepestNestedLevel);
}

/**
 * Whether the selected items can be lifted out one level. An item's nested list comes along
 * with it, so this fails if a nested list would be left two levels below the item it hangs
 * from (a gap a list can't represent) - i.e. a nested item is selected without its parent.
 */
export function isMinusIndentEnabled(contentEditable: HTMLElement, cursorPosition: CursorPosition = getCursorPosition()) {
    const parsed = parseSelectedList(contentEditable, cursorPosition);
    if (!parsed) {
        return false;
    }

    const {lists, orderNumbers} = parsed;
    for (const orderNumber of orderNumbers) {
        const list = lists[orderNumber];
        if (!list || list.nestedLevel === 0) {
            return false;
        }

        const nested = lists[orderNumber + 1];
        if (nested && nested.nestedLevel > list.nestedLevel && !orderNumbers.includes(orderNumber + 1)) {
            return false;
        }
    }

    return true;
}

/**
 * Parses the list run the selection is in, or `undefined` if the selection reaches outside
 * a list. Order numbers and the parsed list both walk items in document order, so an order
 * number indexes the parsed list directly.
 */
function parseSelectedList(contentEditable: HTMLElement, cursorPosition: CursorPosition) {
    const blocks = getSelectedBlock(contentEditable, cursorPosition);
    if (!blocks.length || blocks.some(block => !isSchemaContain(block, [Display.List]))) {
        return undefined;
    }

    // Read the order numbers off the live document first, since parsing below empties items.
    const orderNumbers = getListsOrderNumbers(contentEditable, cursorPosition);
    const lists = parseList(copyListRun(getFirstSelectedRoot(contentEditable, cursorPosition)));

    return {lists, orderNumbers};
}

/**
 * Clones the whole list run (not just one wrapper) so a read-only question can be asked of
 * {@link parseList} without emptying the writer's own items - parseList moves each item's
 * content into a fragment. The whole run is needed since order numbers count across it.
 */
function copyListRun(root: HTMLElement): HTMLElement {
    const container = document.createElement("div");
    let current: Element | null = getFirstListWrapper(root);
    while (current && isSchemaContain(current, [Display.ListWrapper])) {
        container.appendChild(current.cloneNode(true));
        current = current.nextElementSibling;
    }

    return (container.firstElementChild ?? container) as HTMLElement;
}

/** A cursor position resting on `block`, as if the caret had landed on it directly. */
function cursorPositionOf(block: HTMLElement): CursorPosition {
    const firstText = getFirstText(block);

    return getCursorPositionFrom(firstText, 0, firstText, 0, false);
}

/**
 * Indents the selected items one level deeper.
 *
 * @remarks
 * The list is rebuilt from the content of its items, so a cursor left anchored on an empty
 * item (where the browser puts it, having no text of its own) would point at a node the
 * rebuild discards. It's anchored on the item's br up front instead, and the returned
 * position should be restored by the caller.
 */
export function plusIndent(contentEditable: HTMLElement): CursorPosition {
    const cursorPosition = anchorCursorOnLeaf(getCursorPosition());
    if (!isPlusIndentEnabled(contentEditable, cursorPosition)) {
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

/** Lifts the selected items out one level. See {@link plusIndent} for why the cursor is anchored on a leaf. */
export function minusIndent(contentEditable: HTMLElement): CursorPosition {
    const cursorPosition = anchorCursorOnLeaf(getCursorPosition());
    if (!isMinusIndentEnabled(contentEditable, cursorPosition)) {
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

/**
 * Renormalizes the list at the cursor, or the list next to it if the cursor sits on a
 * non-list block - the case when a selection deleted from a block into the list below it
 * leaves the cursor on the block, with the list still holding what the delete left behind.
 */
export function maybeInsertLists(contentEditable: HTMLElement, cursorPosition: CursorPosition): CursorPosition {
    const firstRoot = getFirstSelectedRoot(contentEditable, cursorPosition);
    const listRoot = isSchemaContain(firstRoot, [Display.ListWrapper])
        ? firstRoot
        : (getNextListWrapper(firstRoot) ?? getPreviousListWrapper(firstRoot)) as HTMLElement | null;
    if (!listRoot) {
        return cursorPosition;
    }

    const lists = parseList(listRoot);
    const normalized = normalizeLists(lists, cursorPosition);
    const listWrappers = convertList(normalized.lists);
    appendBeforeAndDelete(listRoot, listWrappers);

    return normalized.cursorPosition;
}

/**
 * Switches the selected items to `tagName`'s list type (UL/OL).
 *
 * @remarks
 * The type is stored per item, not per wrapper, so this changes the items and lets
 * `convertList` rebuild the wrappers around them - a selected item changing type inside an
 * unselected wrapper splits that wrapper around it.
 */
export function changeListWrapper(contentEditable: HTMLElement, tagName: string): CursorPosition {
    const cursorPosition = anchorCursorOnLeaf(getCursorPosition());
    const root = getFirstSelectedRoot(contentEditable, cursorPosition);
    if (!isSchemaContain(getFirstListWrapper(root), [Display.ListWrapper])) {
        return cursorPosition;
    }

    // Read before parseList empties the items the order numbers need to count against.
    const orderNumbers = getListsOrderNumbers(contentEditable, cursorPosition);
    const listWrapper = tagName === ListWrapper.OL ? ListWrapper.OL : ListWrapper.UL;
    const lists = parseList(root);
    for (const orderNumber of orderNumbers) {
        const list = lists[orderNumber];
        if (list) {
            list.listWrapper = listWrapper;
        }
    }

    const normalized = normalizeLists(lists, cursorPosition);
    appendBeforeAndDelete(root, convertList(normalized.lists));

    return normalized.cursorPosition;
}

/** Backspace at the start of an item: merges it into the empty item above it (if any). */
export function mergeIntoPreviousEmptyItem(contentEditable: HTMLElement, cursorPosition: CursorPosition): CursorPosition {
    const orderNumber = getListsOrderNumbers(contentEditable, cursorPosition)[0] ?? 0;

    return mergeIntoEmptyItem(contentEditable, cursorPosition, orderNumber - 1, false);
}

/** Delete at the end of an empty item: merges the following item into it. */
export function mergeNextIntoEmptyItem(contentEditable: HTMLElement, cursorPosition: CursorPosition): CursorPosition {
    const orderNumber = getListsOrderNumbers(contentEditable, cursorPosition)[0] ?? 0;

    return mergeIntoEmptyItem(contentEditable, cursorPosition, orderNumber, true);
}

/**
 * Drops the empty item at `emptyOrderNumber` and merges the item after it into its place.
 *
 * @remarks
 * `isCursorOnEmptyLine` says which item survives with which content: deleting forward from
 * the empty line (cursor on it) keeps the empty line's level for the merged-in item; deleting
 * backward from the next item (cursor there) keeps that item's own level - the rebuild can
 * only lower levels it finds, never deepen one, so nested children are shifted along either
 * way to avoid ending up two levels below their parent.
 */
function mergeIntoEmptyItem(contentEditable: HTMLElement, cursorPosition: CursorPosition, emptyOrderNumber: number,
                            isCursorOnEmptyLine: boolean): CursorPosition {
    const root = getFirstSelectedRoot(contentEditable, cursorPosition);
    const lists = parseList(root);
    const empty = lists[emptyOrderNumber];
    const merged = lists[emptyOrderNumber + 1];
    if (empty && merged && (isCursorOnEmptyLine || merged.nestedLevel < empty.nestedLevel)) {
        // Read before levels change, since withNested tells nested items apart by level.
        const nested = withNested(lists, emptyOrderNumber + 1);
        shiftOrderNumbers(lists, nested, empty.nestedLevel - merged.nestedLevel);

        // A wrapper ending at the dropped line is taken over by the merged item rather than
        // lost - a list doesn't change type just because a line was deleted from it.
        if (isCursorOnEmptyLine && !hasLineBelow(lists, emptyOrderNumber, nested)) {
            merged.listWrapper = empty.listWrapper;
        }
    }

    // A cursor on the empty item's br is the one node the rebuild discards; normalizeLists
    // carries it over to the item that took its line.
    const normalized = normalizeLists(lists, cursorPosition, isListClassEmpty(empty) ? empty : undefined);
    appendBeforeAndDelete(root, convertList(normalized.lists));

    return normalized.cursorPosition;
}

/**
 * Backspace at the start of an empty item: drops it, letting its nested items settle onto
 * the line above.
 *
 * @remarks
 * The cursor here must be as the browser reports it (on the item or its br), not anchored on
 * a leaf - an empty item has no leaf of its own, and the nearest one belongs to its nested
 * list, naming the wrong item.
 */
export function removeEmptyItem(contentEditable: HTMLElement, cursorPosition: CursorPosition): CursorPosition {
    const root = getFirstSelectedRoot(contentEditable, cursorPosition);
    const orderNumber = getListsOrderNumbers(contentEditable, cursorPosition)[0] ?? 0;
    const lists = parseList(root);
    if (isListClassEmpty(lists[orderNumber])) {
        lists.splice(orderNumber, 1);
    }

    const normalized = normalizeLists(lists, cursorPosition);
    appendBeforeAndDelete(root, convertList(normalized.lists));

    return normalized.cursorPosition;
}

/**
 * Enter inside an item: splits it into two items at the cursor. The new item is inserted
 * into the parsed list right after the current one, so any nested list already following it
 * naturally ends up under the new item once the rebuild reads it back.
 */
export function splitItem(contentEditable: HTMLElement, cursorPosition: CursorPosition): CursorPosition {
    const isAtEnd = isCursorAtEndOfBlock(contentEditable, cursorPosition);
    const isAtStart = isCursorAtStartOfBlock(contentEditable, cursorPosition);

    const root = getFirstSelectedRoot(contentEditable, cursorPosition);
    const orderNumber = getListsOrderNumbers(contentEditable, cursorPosition)[0] ?? 0;
    const lists = parseList(root);
    const current = lists[orderNumber];
    if (!current) {
        return cursorPosition;
    }

    // An item holding only an image is at its end and start at once (no text to stand in),
    // so it's read as an end-of-line break like any other.
    const isBefore = isAtStart && !isAtEnd;
    // Breaking at either end opens a blank line (a br); breaking mid-line hands over
    // everything after the cursor.
    const content = isAtEnd || isAtStart ? placeholderContent() : splitAtCursor(current.listContent, cursorPosition);
    // Read before convertList moves these nodes into the rebuilt item, emptying the fragment.
    const firstNode = content.firstChild;
    lists.splice(isBefore ? orderNumber : orderNumber + 1, 0, newList(current, content));
    // A selection deleted right at the break can leave the current item with no content at
    // all, which the rebuild would read as a dropped line - give it back its br.
    keepLine(current);

    const normalized = normalizeLists(lists, cursorPosition);
    appendBeforeAndDelete(root, convertList(normalized.lists));

    // Writing continues at the start of the item that took over the broken line; a blank
    // line opened above leaves the writer where they already were.
    if (isBefore || !firstNode) {
        return normalized.cursorPosition;
    }

    const firstText = getFirstText(firstNode);
    return getCursorPositionFrom(firstText, 0, firstText, 0);
}

function newList(current: ListClass, listContent: DocumentFragment): ListClass {
    const list = new ListClass();
    list.nestedLevel = current.nestedLevel;
    list.listWrapper = current.listWrapper;
    list.listContent = listContent;

    return list;
}

function keepLine(list: ListClass) {
    if (!list.listContent.textContent && !list.listContent.firstElementChild) {
        list.listContent.appendChild(document.createElement("br"));
    }
}

function placeholderContent(): DocumentFragment {
    const content = new DocumentFragment();
    content.appendChild(document.createElement("br"));

    return content;
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

/**
 * Enter on an empty item: unwraps it instead of adding one more empty item. A nested item is
 * lifted one level, the way minus-indent does (its former siblings become its children); an
 * item already on the first level leaves the list entirely, becoming a paragraph.
 */
export function exitList(contentEditable: HTMLElement, cursorPosition: CursorPosition): CursorPosition {
    // The browser anchors the cursor on the (empty) item itself, a node the rebuild discards;
    // anchor on its br instead so the position survives.
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

/**
 * Lifts the item at `orderNumber` out one level along with everything nested inside it, so
 * none of it ends up two levels below the item it hangs from.
 */
function minusIndentList(root: HTMLElement, cursorPosition: CursorPosition, orderNumber: number): CursorPosition {
    const lists = parseList(root);
    const minusLists = minusOrderNumbers(lists, withNested(lists, orderNumber));
    appendBeforeAndDelete(root, convertList(minusLists));

    return getCursorPositionFrom(cursorPosition.startContainer, cursorPosition.startOffset,
        cursorPosition.endContainer, cursorPosition.endOffset);
}

/**
 * Whether the empty item's wrapper continues below it - i.e. whether a later item at the
 * same level shares its list type. Used to decide whether the merged-in item should take
 * over the empty item's wrapper or keep its own.
 */
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

/** The order numbers of `orderNumber`'s item plus everything nested inside it. Read levels before they change. */
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

/**
 * Splits a list at `splitIndex`, inserting `node` between the two halves as a sibling of the
 * list (a list wrapper holds only items, so `node` can't go inside one). Both halves are
 * renormalized; a blank split line is dropped rather than kept as an empty item.
 */
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
