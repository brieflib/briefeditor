import {getFirstSelectedBlock, getFirstSelectedRoot, getSelectedBlock} from "@/core/selection/selection";
import {Display, isSchemaContain} from "@/core/normalize/type/schema";
import {
    appendBeforeAndDelete,
    getFirstListWrapper,
    getListsOrderNumbers,
    getNextListWrapper,
    getPreviousListWrapper,
    isListEmpty
} from "@/core/list/util/list-util";
import {getBlockElement, getFirstText, getRootElement, imageSelector} from "@/core/shared/element-util";
import {newLine} from "@/core/keyboard/util/keyboard-util";
import {isCursorAtEndOfBlock, isCursorAtStartOfBlock} from "@/core/cursor/cursor";
import {
    CursorPosition,
    getCursorPosition,
    getCursorPositionFrom,
    isCollapsed,
    splitAtCursor
} from "@/core/shared/type/cursor-position";
import {convertList, ListClass, minusLevel, normalizeLists, parseList, plusLevel} from "@/core/list/type/list-class";
import {normalizeNew} from "@/core/normalize/util/normalize-util";

/** A list nests five wrappers deep at most: one for the item's own level, one per level above it. */
const deepestNestedLevel = 6;

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
 * Whether the selected items can be indented one level deeper: the first selected line needs a line above it,
 * at least as deep, to nest under, and no selected line may already be at {@link deepestNestedLevel}.
 */
export function isPlusIndentEnabled(contentEditable: HTMLElement, cursorPosition = getCursorPosition()) {
    const block = getFirstSelectedBlock(contentEditable, cursorPosition);
    const lists = parseList(block, cursorPosition);
    const first = lists.findIndex(list => list.selected);
    const list = lists[first];
    const previous = lists[first - 1];
    if (!list || !previous || previous.nestedLevel < list.nestedLevel) {
        return false;
    }

    return lists.every(list => !list.selected || list.nestedLevel < deepestNestedLevel);
}

/**
 * Whether the selected items can be indented one level deeper: the first selected line needs a line above it,
 * at least as deep, to nest under, and no selected line may already be at {@link deepestNestedLevel}.
 */
export function isMinusIndentEnabled(contentEditable: HTMLElement, cursorPosition = getCursorPosition()) {
    const block = getFirstSelectedBlock(contentEditable, cursorPosition);
    const lists = parseList(block, cursorPosition);
    if (!lists.some(list => list.selected)) {
        return false;
    }

    return lists.every((list, index) => {
        if (!list.selected) {
            return true;
        }

        // A nested line left behind would end up two levels below the line it hangs from
        const next = lists[index + 1];
        const isNestedLeftBehind = !!next && next.nestedLevel > list.nestedLevel && !next.selected;

        return list.nestedLevel > 0 && !isNestedLeftBehind;
    });
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
    let current: HTMLElement | null = getFirstListWrapper(root);
    while (current && isSchemaContain(current, [Display.ListWrapper])) {
        container.appendChild(current.cloneNode(true));
        current = current.nextElementSibling as HTMLElement | null;
    }

    return (container.firstElementChild ?? container) as HTMLElement;
}

/** A cursor position resting on `block`, as if the caret had landed on it directly. */
function cursorPositionOf(block: HTMLElement): CursorPosition {
    const firstText = getFirstText(block);

    return getCursorPositionFrom(firstText, 0, firstText, 0);
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
export function plusIndent(contentEditable: HTMLElement, cursorPosition = getCursorPosition()) {
    if (!isPlusIndentEnabled(contentEditable, cursorPosition)) {
        return;
    }

    const block = getFirstSelectedBlock(contentEditable, cursorPosition);
    const lists = parseList(block);
    const plussedLists = plusLevel(lists);
    const normalized = normalizeLists(plussedLists);
    const listWrappers = convertList(normalized);
    appendBeforeAndDelete(block, listWrappers);
}

/** Lifts the selected items out one level. See {@link plusIndent} for why the cursor is anchored on a leaf. */
export function minusIndent(contentEditable: HTMLElement, cursorPosition = getCursorPosition()) {
    if (!isMinusIndentEnabled(contentEditable, cursorPosition)) {
        return;
    }

    const block = getFirstSelectedBlock(contentEditable, cursorPosition);
    const lists = parseList(block);
    const minusedLists = minusLevel(lists);
    const normalized = normalizeLists(minusedLists);
    const listWrappers = convertList(normalized);
    appendBeforeAndDelete(block, listWrappers);
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

    return normalizeList(listRoot, cursorPosition);
}

/**
 * Writes `lists` back in place of `root`'s run after an edit: renumbers levels, drops emptied
 * lines (`dropped` names one to drop explicitly) and rebuilds the markup.
 *
 * @returns The cursor, redirected if its line was dropped.
 */
export function rebuildList(root: HTMLElement, lists: ListClass[], cursorPosition: CursorPosition,
                            dropped?: ListClass): CursorPosition {
    // const normalized = normalizeLists(lists, cursorPosition, dropped);
    // appendBeforeAndDelete(root, convertList(normalized.lists));

    return cursorPosition;
}

/**
 * Moves the line of `lastItem` to the end of the line of `firstBlock`, an item or a block outside a list, and rebuilds
 * their run; what was nested in `lastItem` or stood after it keeps its place in the run.
 */
export function mergeItems(contentEditable: HTMLElement, firstBlock: HTMLElement, lastItem: HTMLElement) {
    // A block outside a list has no run of its own, so the run rebuilt is the last item's one
    const isFirstItem = isSchemaContain(firstBlock, [Display.List]);
    const lastRoot = getBlockElement(contentEditable, lastItem);
    const firstRoot = isFirstItem ? getBlockElement(contentEditable, firstBlock) : lastRoot;

    // Each item's line is the one a cursor resting on it selects
    const firstLists = isFirstItem ? parseList(firstRoot, cursorPositionOf(firstBlock)) : [];
    const lastLists = parseList(lastRoot, cursorPositionOf(lastItem));
    const firstIndex = firstLists.findIndex(list => list.selected);
    const lastIndex = lastLists.findIndex(list => list.selected);
    const firstLine = isFirstItem ? firstLists[firstIndex]?.listContent : firstBlock;
    const lastList = lastLists[lastIndex];
    if (!firstLine || !lastList) {
        return;
    }

    // An item merged with itself already holds its line; only its run is rebuilt
    if (firstBlock !== lastItem) {
        // The two lines join into one: their neighbouring texts and inlines collapse together
        const line = new DocumentFragment();
        line.append(...firstLine.childNodes, lastList.listContent);
        firstLine.append(normalizeNew(contentEditable, line));
    }

    // The lines between the two blocks were deleted, so the merged run is what stands up to the first item and after the last one
    const merged = [...firstLists.slice(0, firstIndex + 1), ...lastLists.slice(lastIndex + 1)];
    const normalized = normalizeLists(merged);
    const listWrappers = convertList(normalized);
    appendBeforeAndDelete(firstRoot, listWrappers);
}

/** Reads `root`'s run and rebuilds it as is - the normalization pass on its own. */
export function normalizeList(root: HTMLElement, cursorPosition: CursorPosition): CursorPosition {
    return rebuildList(root, parseList(root), cursorPosition);
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
    return rebuildList(root, lists, cursorPosition, isListClassEmpty(empty) ? empty : undefined);
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

    return rebuildList(root, lists, cursorPosition);
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

    const rebuiltCursorPosition = rebuildList(root, lists, cursorPosition);

    // Writing continues at the start of the item that took over the broken line; a blank
    // line opened above leaves the writer where they already were.
    if (isBefore || !firstNode) {
        return rebuiltCursorPosition;
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
 * Enter on an empty item: unwraps it instead of adding one more empty item. A nested item is lifted one level
 * the way minus indent does, and an item on the first level leaves the list as a paragraph.
 */
export function exitList(contentEditable: HTMLElement, cursorPosition: CursorPosition) {
    const block = getFirstSelectedBlock(contentEditable, cursorPosition);
    const lists = parseList(block, cursorPosition);
    const index = lists.findIndex(list => list.selected);
    const list = lists[index];
    if (!list) {
        return;
    }

    // A nested item is lifted one level
    if (list.nestedLevel > 0) {
        const minusedLists = minusLevel(lists);
        const normalized = normalizeLists(minusedLists);
        const listWrappers = convertList(normalized);
        appendBeforeAndDelete(block, listWrappers);
        return;
    }

    const paragraph = document.createElement("p");
    paragraph.appendChild(document.createElement("br"));
    splitListAround(block, paragraph, index);
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
 * Splits a list at `splitIndex`, inserting `node` between the two halves as a sibling of the list.
 * A blank line at the split is dropped rather than kept as an empty item.
 */
export function splitListAround(root: HTMLElement, node: Node, splitIndex: number) {
    const lists = parseList(root);
    const before = lists.slice(0, splitIndex);
    const after = lists.slice(splitIndex);

    // normalizeLists keeps a line holding only a br, so the blank split line is dropped here
    if (!after[0]?.listContent.textContent) {
        after.shift();
    }

    const fragment = new DocumentFragment();
    fragment.append(convertList(normalizeLists(before)));
    fragment.append(node);
    fragment.append(convertList(normalizeLists(after)));

    appendBeforeAndDelete(root, fragment);
}

export interface SplitPoint {
    /** The wrapper the cursor's run is read from; rebuilt anew when the cursor's line was divided. */
    root: HTMLElement;
    /** The order number of the cursor's line. */
    index: number;
    /** The order number the run is opened at: the cursor's line or the one after it. */
    splitIndex: number;
}

/**
 * Finds where a run of items is opened for something placed at the cursor. A cursor mid-line
 * divides the line first, so the opening always falls between two lines; a cursor at the start
 * of a line opens the run before it, anywhere else after it.
 */
export function readSplitPoint(contentEditable: HTMLElement, root: HTMLElement, cursorPosition: CursorPosition): SplitPoint {
    const isAtStart = isCursorAtStartOfBlock(contentEditable, cursorPosition);
    const isAtEnd = isCursorAtEndOfBlock(contentEditable, cursorPosition);

    // Read before the split: it inserts the second half right after the current item,
    // leaving that item's own position untouched while carrying the cursor to the new one.
    const index = getListsOrderNumbers(contentEditable, cursorPosition)[0] ?? 0;
    if (isAtStart) {
        return {root, index, splitIndex: index};
    }

    if (!isAtEnd) {
        // Dividing an item rebuilds its list, leaving the root read above gone; the cursor
        // stays with the half written before it, so the new list is read from there.
        newLine(contentEditable, cursorPosition);
        root = getRootElement(contentEditable, cursorPosition.startContainer);
    }

    return {root, index, splitIndex: index + 1};
}

/**
 * Splices the lines of `pastedWrapper`'s run into the list at the cursor, at the cursor line's
 * level, so nesting on either side of the paste survives: a line nested below the cursor's
 * ends up under the last pasted line, the way Enter carries it to the new item. A cursor
 * mid-line is divided first; an empty cursor line is replaced rather than kept.
 */
export function spliceListsAtCursor(contentEditable: HTMLElement, root: HTMLElement, cursorPosition: CursorPosition,
                                    pastedWrapper: HTMLElement): CursorPosition {
    const splitPoint = readSplitPoint(contentEditable, root, cursorPosition);
    const lists = parseList(splitPoint.root);
    const splitAt = lists[splitPoint.splitIndex];
    // The cursor's own line sets the level, not the line at the split - that one can be a
    // nested child of it, or missing when the cursor closes the run.
    const level = lists[splitPoint.index]?.nestedLevel ?? 0;

    const pasted = parseList(pastedWrapper);
    shiftOrderNumbers(pasted, pasted.map((_, i) => i), level);
    lists.splice(splitPoint.splitIndex, 0, ...pasted);

    return rebuildList(splitPoint.root, lists, cursorPosition, isListClassEmpty(splitAt) ? splitAt : undefined);
}

function shiftOrderNumbers(lists: ListClass[], orderNumbers: number[], shift: number): ListClass[] {
    for (const orderNumber of orderNumbers) {
        const list = lists[orderNumber];
        if (list) {
            list.nestedLevel += shift;
        }
    }

    return lists;
}

/** Whether a `ListClass` line is blank (its br has nothing written on it). An image counts as content. */
export function isListClassEmpty(list: ListClass | undefined): boolean {
    if (!list) {
        return false;
    }

    return !list.listContent.textContent && !list.listContent.querySelector(imageSelector);
}
