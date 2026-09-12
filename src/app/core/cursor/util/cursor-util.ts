import {
    CursorPosition,
    getCursorPositionFrom,
    isCollapsed
} from "@/core/shared/type/cursor-position";
import {Display, isSchemaContain} from "@/core/normalize/type/schema";
import {getElement, getFirstText, getLastText, getNextNode, getRootElement} from "@/core/shared/element-util";
import {Carrier} from "@/core/carrier/carrier";

export interface NodeOffset {
    readonly node: Node;
    readonly offset: number;
}

/**
 * An endpoint recorded as a place in the text rather than a node: the block holding it and
 * the offset inside that block. `index` is kept too, since a command that rebuilds the block
 * hands back a new element in the same place.
 */
interface BlockOffset {
    readonly block: HTMLElement;
    readonly index: number;
    readonly offset: number;
}

/**
 * A cursor recorded as a place in the text, so it survives a rebuild of the DOM around it.
 * `length` (the spanned text) is kept because the two ends are each measured against their
 * own block, and is the only thing that says how far the end stands from the start once a
 * rebuild collapses both blocks into one.
 */
export interface CursorAnchor {
    readonly start: BlockOffset | null;
    readonly end: BlockOffset | null;
    readonly length: number;
    readonly textLength: number;
}

export interface StrandedTable {
    table: HTMLTableElement;
    isBefore: boolean;
}

/** Where the cursor would land for a click at `(x, y)`, before the browser has placed it. */
export function getCursorPositionFromPoint(x: number, y: number): CursorPosition | null {
    const caret = document.caretPositionFromPoint(x, y);
    if (!caret) {
        return null;
    }

    return getCursorPositionFrom(caret.offsetNode, caret.offset, caret.offsetNode, caret.offset);
}

export function getCursorOffsetInElement(element: HTMLElement, cursorPosition: CursorPosition) {
    return getOffsetInElement(element, cursorPosition.endContainer, cursorPosition.endOffset);
}

/**
 * How much text of `element` precedes the point named by `container`/`offset`. Counts text
 * only, the same as {@link findNodeAndOffset}, so the two round-trip.
 */
export function getOffsetInElement(element: HTMLElement, container: Node, offset: number) {
    if (!element.contains(container)) {
        return 0;
    }

    const range = new Range();
    range.selectNodeContents(element);
    range.setEnd(container, offset);

    return range.toString().length;
}

/**
 * Whether either end of the cursor is in a table. A `closest()` climb would risk finding a
 * table of the page the editor is embedded in, so this checks the container's first-level
 * root instead. A selection merely reaching into a table from outside it still counts.
 */
export function isCursorInTable(contentEditable: HTMLElement, cursorPosition: CursorPosition) {
    return isInTable(contentEditable, cursorPosition.startContainer) ||
        isInTable(contentEditable, cursorPosition.endContainer);
}

function isInTable(contentEditable: HTMLElement, container: Node) {
    return isSchemaContain(getRootElement(contentEditable, container), [Display.Table]);
}

/** The cell holding the cursor, or `null` if it's in no cell (including outside the editor). */
export function getCursorCell(contentEditable: HTMLElement, cursorPosition: CursorPosition) {
    const element = getElement(contentEditable, cursorPosition.startContainer as HTMLElement, [Display.Cell]);
    if (!isSchemaContain(element, [Display.Cell])) {
        return null;
    }

    return element as HTMLTableCellElement;
}

export function isCursorAtStartOfCell(cell: HTMLTableCellElement, cursorPosition: CursorPosition) {
    return getCursorOffsetInElement(cell, cursorPosition) === 0;
}

export function isCursorAtEndOfCell(cell: HTMLTableCellElement, cursorPosition: CursorPosition) {
    return getCursorOffsetInElement(cell, cursorPosition) === cell.textContent.length;
}

/** The start of `element`. An empty element lands on its br, same as any empty block. */
export function atStart(element: Node) {
    const firstText = getFirstText(element);

    return getCursorPositionFrom(firstText, 0, firstText, 0);
}

export function atEnd(element: Node) {
    const lastText = getLastText(element);
    const offset = lastText.textContent.length;

    return getCursorPositionFrom(lastText, offset, lastText, offset);
}

export function getFirstCell(table: HTMLTableElement) {
    return table.rows[0]?.cells[0] ?? null;
}

export function getLastCell(table: HTMLTableElement) {
    const row = table.rows[table.rows.length - 1];
    return row?.cells[row.cells.length - 1] ?? null;
}

/**
 * The table a collapsed cursor is stranded next to, if any. Chrome allows caret positions
 * immediately before/after a table that belong to no cell and no block; typing there
 * produces bare text nodes outside any first-level block.
 */
export function getStrandedTable(cursorPosition: CursorPosition): StrandedTable | null {
    if (!isCollapsed(cursorPosition)) {
        return null;
    }

    const container = cursorPosition.startContainer;
    if (container.nodeType !== Node.ELEMENT_NODE) {
        return null;
    }

    const element = container as HTMLElement;
    if (isSchemaContain(element, [Display.Table, Display.TableSection])) {
        const table = element.closest("table");
        return table ? {table, isBefore: cursorPosition.startOffset === 0} : null;
    }

    const next = element.childNodes[cursorPosition.startOffset];
    if (isSchemaContain(next, [Display.Table])) {
        return {table: next as HTMLTableElement, isBefore: true};
    }

    const previous = element.childNodes[cursorPosition.startOffset - 1];
    if (isSchemaContain(previous, [Display.Table])) {
        return {table: previous as HTMLTableElement, isBefore: false};
    }

    return null;
}

/**
 * The text node and offset that `targetPosition` (a character offset counted over `root`'s
 * text) names.
 *
 * @param isEnd - A boundary between two text nodes answers to two offsets. A selection's end
 * should resolve to the node before the boundary (staying inside the tag it was written in);
 * its start to the node after. Pass `false` for a start endpoint.
 */
export function findNodeAndOffset(root: Node, targetPosition: number, isEnd = true): NodeOffset {
    let position = 0;
    const stack: Node[] = [root];
    while (stack.length > 0) {
        const current = stack.pop();
        if (!current) {
            break;
        }

        if (current.nodeType === Node.TEXT_NODE) {
            const textContentLength = current.textContent?.length ?? 0;
            if (textContentLength === 0) {
                continue;
            }

            if (isEnd
                ? position + textContentLength >= targetPosition
                : position + textContentLength > targetPosition) {
                return {node: current, offset: targetPosition - position};
            }
            position += textContentLength;
        } else {
            for (let i = current.childNodes.length - 1; i >= 0; i--) {
                const child = current.childNodes[i];
                if (child) {
                    stack.push(child);
                }
            }
        }
    }

    // No text at that offset: an empty block (cursor goes on its br), or less text than asked for.
    if (targetPosition <= 0) {
        return {node: getFirstText(root), offset: 0};
    }

    const lastText = getLastText(root);
    return {node: lastText, offset: lastText.textContent?.length ?? 0};
}

/** Reads the cursor as a place in the text, to be taken before a command rebuilds the document. */
export function getCursorAnchor(contentEditable: HTMLElement, cursorPosition: CursorPosition): CursorAnchor {
    return {
        start: getBlockOffset(contentEditable, cursorPosition.startContainer, cursorPosition.startOffset),
        end: getBlockOffset(contentEditable, cursorPosition.endContainer, cursorPosition.endOffset),
        length: getSelectedLength(cursorPosition),
        textLength: contentEditable.textContent.length
    };
}

/** How much text the cursor spans, counted the same way its endpoint offsets are. */
function getSelectedLength(cursorPosition: CursorPosition) {
    if (!cursorPosition.startContainer.isConnected || !cursorPosition.endContainer.isConnected) {
        return 0;
    }

    const range = new Range();
    range.setStart(cursorPosition.startContainer, cursorPosition.startOffset);
    range.setEnd(cursorPosition.endContainer, cursorPosition.endOffset);

    return range.toString().length;
}

/**
 * The endpoint's first-level block and its offset in it. Measuring against anything smaller
 * wouldn't survive a command that moves the smaller thing (e.g. indenting an item into
 * another list).
 */
function getBlockOffset(contentEditable: HTMLElement, container: Node, offset: number): BlockOffset | null {
    if (!container.isConnected) {
        return null;
    }

    const block = getRootElement(contentEditable, container);
    if (block.nodeType !== Node.ELEMENT_NODE) {
        return null;
    }

    return {
        block: block,
        // childNodes, not children: a stray text node beside the blocks is a child too, and
        // skipping it would miscount.
        index: Array.prototype.indexOf.call(contentEditable.childNodes, block),
        offset: getOffsetInElement(block, container, offset)
    };
}

/**
 * Restores the cursor after a command runs, from the anchor read before it, corrected for
 * any text the command wrote.
 *
 * @remarks
 * `cursorPosition` (the command's own return value) wins whenever it's still meaningful: on
 * an empty leaf (a br, or a text node emptied in place) that an offset-based anchor can't
 * distinguish from the end of the line above it, or - when nothing changed - as one still
 * connected to the document. Otherwise the anchor is resolved to a fresh position.
 */
export function restoreCursorPosition(contentEditable: HTMLElement, cursorAnchor: CursorAnchor,
                                      cursorPosition: CursorPosition): CursorPosition {
    // A carrier still connected keeps its claim on the cursor over anything below.
    const isCarrierConnected = Carrier.getCarrier()?.isConnected ?? false;

    if (!isCarrierConnected && isCaretOnEmptyLeaf(cursorPosition)) {
        return cursorPosition;
    }

    // Offsets read before the command are stale by however much text it wrote or removed.
    const delta = contentEditable.textContent.length - cursorAnchor.textLength;

    if (delta === 0 && !isCarrierConnected && isPositionConnected(cursorPosition)) {
        return cursorPosition;
    }

    return resolveCursorAnchor(contentEditable, cursorAnchor, delta) ?? cursorPosition;
}

function isPositionConnected(cursorPosition: CursorPosition) {
    return cursorPosition.startContainer.isConnected && cursorPosition.endContainer.isConnected;
}

function isCaretOnEmptyLeaf(cursorPosition: CursorPosition) {
    const container = cursorPosition.startContainer;
    if (!isCollapsed(cursorPosition) || !container.isConnected) {
        return false;
    }

    return isSchemaContain(container, [Display.SelfClose]) ||
        (container.nodeType === Node.TEXT_NODE && !container.textContent);
}

/**
 * Resolves an anchor back to a position, with `delta` = 0 for a rebuild that wrote no text
 * (the case every layer below a command uses to carry a cursor through its own rebuild).
 */
export function resolveCursorAnchor(contentEditable: HTMLElement, cursorAnchor: CursorAnchor,
                                    delta = 0): CursorPosition | null {
    // A collapsed cursor that was just wrapped sits in an empty text node with no offset of
    // its own to find by search, so it's named directly - otherwise the next character typed
    // would land outside the tag just applied. A carrier the last rebuild discarded has no
    // claim on the cursor.
    const carrier = Carrier.getCarrier();
    if (carrier?.isConnected) {
        return getCursorPositionFrom(carrier, 0, carrier, 0);
    }

    if (delta !== 0 || isAnchorCollapsed(cursorAnchor)) {
        const caret = resolveCaret(contentEditable, getCaretAnchor(cursorAnchor), delta);
        if (!caret) {
            return null;
        }

        return getCursorPositionFrom(caret.node, caret.offset, caret.node, caret.offset);
    }

    const end = resolveBlockOffset(contentEditable, cursorAnchor.end, delta);
    // The end resolves to the node before a boundary (staying inside the tag the selection
    // was written in); the start resolves to the node after it. See findNodeAndOffset.
    const start = resolveBlockOffset(contentEditable, cursorAnchor.start, delta, false);
    if (!start || !end) {
        return null;
    }

    return getCursorPositionFrom(start.node, start.offset, end.node, end.offset);
}

/**
 * Where the caret lands once text spanning the anchor is written over: the start, advanced
 * by the spanned length. Needed because a multi-block selection has each end measured
 * against its own block; measuring the end against its own block after the write would
 * misplace it in whatever block follows.
 */
function getCaretAnchor(cursorAnchor: CursorAnchor): BlockOffset | null {
    if (!cursorAnchor.start) {
        return cursorAnchor.end;
    }

    return {...cursorAnchor.start, offset: cursorAnchor.start.offset + cursorAnchor.length};
}

/**
 * Resolves a caret, preferring the line a just-written br opens over the end of the line
 * above it (both answer to the same text offset, since a br holds no text of its own).
 */
function resolveCaret(contentEditable: HTMLElement, blockOffset: BlockOffset | null, delta: number) {
    const caret = resolveBlockOffset(contentEditable, blockOffset, delta);
    if (!caret || caret.offset < (caret.node.textContent?.length ?? 0) ||
        !isSchemaContain(getNextNode(contentEditable, caret.node), [Display.SelfClose])) {
        return caret;
    }

    return resolveBlockOffset(contentEditable, blockOffset, delta, false);
}

/** Whether the anchor's two ends name the same place in the same block. */
function isAnchorCollapsed(cursorAnchor: CursorAnchor) {
    return cursorAnchor.start?.block === cursorAnchor.end?.block &&
        cursorAnchor.start?.offset === cursorAnchor.end?.offset;
}

function resolveBlockOffset(contentEditable: HTMLElement, blockOffset: BlockOffset | null, delta: number,
                            isEnd = true): NodeOffset | null {
    if (!blockOffset) {
        return null;
    }

    let block: Node | null = getAnchoredBlock(contentEditable, blockOffset);
    if (!block) {
        return null;
    }

    // If a rebuild split the block, the text it no longer holds moved to the blocks after
    // it, so an offset past this block's own text is counted forward into those blocks
    // (never backward, since the place is always ahead of the block it was read in).
    let offset = Math.max(blockOffset.offset + delta, 0);
    let length = block.textContent?.length ?? 0;
    while (offset > length && block.nextSibling) {
        offset -= length;
        block = block.nextSibling;
        length = block.textContent?.length ?? 0;
    }

    return findNodeAndOffset(block, offset, isEnd);
}

/**
 * The anchor's original block if still connected, or the element now standing in its place
 * (by index) if a command rebuilt it. Returns `null` if that block was removed entirely.
 */
function getAnchoredBlock(contentEditable: HTMLElement, blockOffset: BlockOffset): HTMLElement | null {
    if (blockOffset.block.isConnected) {
        return blockOffset.block;
    }

    const root = contentEditable.childNodes[blockOffset.index];

    return root && root.nodeType === Node.ELEMENT_NODE ? root as HTMLElement : null;
}
