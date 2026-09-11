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

// Where an endpoint stood, written as a place in the text rather than as a node: the block holding it and
// the offset of the endpoint inside that block. The block is kept by name as well as by reference, since a
// command that rebuilds it hands back an element of its own in the same place.
interface BlockOffset {
    readonly block: HTMLElement;
    readonly index: number;
    readonly offset: number;
}

export interface CursorAnchor {
    readonly start: BlockOffset | null;
    readonly end: BlockOffset | null;
    readonly textLength: number;
}

export interface StrandedTable {
    table: HTMLTableElement;
    isBefore: boolean;
}

// Where the cursor would be placed by a click, before the browser has placed it.
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

// How much text of the element is written before the point the container and offset name. Only text is
// counted, which is the same thing findNodeAndOffset counts back, so the two round trip.
export function getOffsetInElement(element: HTMLElement, container: Node, offset: number) {
    if (!element.contains(container)) {
        return 0;
    }

    const range = new Range();
    range.selectNodeContents(element);
    range.setEnd(container, offset);

    return range.toString().length;
}

// A table is always a first level element, so the root of the cursor's container answers this. A climb of
// closest would carry on past the editor and find a table of the page the editor is embedded in.
// A selection reaching into a table from a block outside of it counts as being in one, so an edit is
// judged by the whole of what it touches.
export function isCursorInTable(contentEditable: HTMLElement, cursorPosition: CursorPosition) {
    return isInTable(contentEditable, cursorPosition.startContainer) ||
        isInTable(contentEditable, cursorPosition.endContainer);
}

function isInTable(contentEditable: HTMLElement, container: Node) {
    return isSchemaContain(getRootElement(contentEditable, container), [Display.Table]);
}

// The cell holding the cursor, or null when it sits in no cell at all. The climb stops at the editor, so
// its two misses, a block in no table and a container outside the editor, both come back as something
// that is not a cell.
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

// An empty element holds a br and no text of its own, so the collapsed position lands on the br itself,
// the spot a cursor takes in any other empty block.
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

// Chrome keeps caret positions immediately before and after a table that belong to no cell and no block.
// Typing there produces bare text nodes outside of any first level block.
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

// The node and offset a character offset counted over the text of root names. A boundary between two text
// nodes answers to two offsets - the end of the node before it and the start of the node after - and the
// two ends of a selection want opposite answers: the end of a selection belongs to the node before the
// boundary, so it stays inside the tag the selection was written in, and the start to the node after it.
// A node holding no text of its own is no place to stand, since the offsets on either side of it are the
// same offset and a rebuild drops it; the carrier is the one such node a cursor belongs on, and it is
// named directly rather than searched for.
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

    // No text to stand in at that offset: the element holds none of its own - an empty block, where the
    // cursor goes on the br standing in for its line - or less than the offset asks for.
    if (targetPosition <= 0) {
        return {node: getFirstText(root), offset: 0};
    }

    const lastText = getLastText(root);
    return {node: lastText, offset: lastText.textContent?.length ?? 0};
}

// The cursor read as a place in the text, before the command that is about to rebuild the document runs.
export function getCursorAnchor(contentEditable: HTMLElement, cursorPosition: CursorPosition): CursorAnchor {
    return {
        start: getBlockOffset(contentEditable, cursorPosition.startContainer, cursorPosition.startOffset),
        end: getBlockOffset(contentEditable, cursorPosition.endContainer, cursorPosition.endOffset),
        textLength: contentEditable.textContent.length
    };
}

// The first level element the endpoint stands in, which is the whole of what a command rebuilds: an
// offset measured against anything smaller does not survive a command that moves the smaller thing, the way
// indenting moves an item from one list into another.
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
        // childNodes rather than children: a stray text node left beside the blocks is a child too, and
        // counting without it would name the wrong element.
        index: Array.prototype.indexOf.call(contentEditable.childNodes, block),
        offset: getOffsetInElement(block, container, offset)
    };
}

// The cursor written back from the anchor it was read at, corrected for whatever text the command wrote.
// Where the anchor names nothing that is left in the document the command's own position is handed back,
// since there is nothing better to say.
export function restoreCursorPosition(contentEditable: HTMLElement, cursorAnchor: CursorAnchor,
                                      cursorPosition: CursorPosition): CursorPosition {
    // An offset counted over text cannot name a leaf that holds none: the br standing in for an empty line,
    // or the text node a deletion emptied in place, answers to the same offset as the end of the line written
    // above it, and an item of a list is measured against the whole list, so the anchor would put the caret
    // at the end of the item above. A command that hands back a caret standing on such a leaf, one still in
    // the document, is the only thing that can say which of the two is meant. The carrier is such a leaf too,
    // and one still in the document keeps its claim on the cursor the way it does below.
    if (!Carrier.getCarrier()?.isConnected && isCaretOnEmptyLeaf(cursorPosition)) {
        return cursorPosition;
    }

    // Text was written or taken out, so the offsets read before the command are that much out of date, and
    // whatever the cursor spanned is gone. What is left is a cursor standing after what was written.
    const delta = contentEditable.textContent.length - cursorAnchor.textLength;

    return resolveCursorAnchor(contentEditable, cursorAnchor, delta) ?? cursorPosition;
}

function isCaretOnEmptyLeaf(cursorPosition: CursorPosition) {
    const container = cursorPosition.startContainer;
    if (!isCollapsed(cursorPosition) || !container.isConnected) {
        return false;
    }

    return isSchemaContain(container, [Display.SelfClose]) ||
        (container.nodeType === Node.TEXT_NODE && !container.textContent);
}

// The anchor read back as a position. A rebuild writes no text of its own, so it asks for no correction and
// this is what every layer below the command uses to carry a cursor through one.
export function resolveCursorAnchor(contentEditable: HTMLElement, cursorAnchor: CursorAnchor,
                                    delta = 0): CursorPosition | null {
    // A collapsed cursor that was wrapped stands in the empty text node the wrap leaves inside the new tag,
    // and an empty node holds no offset of its own to be found by. It is named directly instead - without
    // it the next character typed lands outside the tag that was just asked for. A carrier the last rebuild
    // threw away is no longer in the document, and one of those has no claim on the cursor.
    const carrier = Carrier.getCarrier();
    if (carrier?.isConnected) {
        return getCursorPositionFrom(carrier, 0, carrier, 0);
    }

    // A caret standing on its own is one place, and it belongs where a caret always does: at the end of
    // what was written before it, unless what was written next is a line of its own.
    if (delta !== 0 || isAnchorCollapsed(cursorAnchor)) {
        const caret = resolveCaret(contentEditable, cursorAnchor.end, delta);
        if (!caret) {
            return null;
        }

        return getCursorPositionFrom(caret.node, caret.offset, caret.node, caret.offset);
    }

    const end = resolveBlockOffset(contentEditable, cursorAnchor.end, delta);
    // A boundary between two text nodes answers to two offsets, and the two ends of a selection want
    // opposite ones: the end belongs to the node before it, so it stays inside the tag the selection was
    // written in, and the start to the node after it, on the content the selection covers.
    const start = resolveBlockOffset(contentEditable, cursorAnchor.start, delta, false);
    if (!start || !end) {
        return null;
    }

    return getCursorPositionFrom(start.node, start.offset, end.node, end.offset);
}

// A br holds no text of its own, so the offsets on either side of it are the same offset and only the br
// says which of the two is meant. A caret standing where one was written belongs on the line it opens
// rather than at the end of the line above it.
function resolveCaret(contentEditable: HTMLElement, blockOffset: BlockOffset | null, delta: number) {
    const caret = resolveBlockOffset(contentEditable, blockOffset, delta);
    if (!caret || caret.offset < (caret.node.textContent?.length ?? 0) ||
        !isSchemaContain(getNextNode(contentEditable, caret.node), [Display.SelfClose])) {
        return caret;
    }

    return resolveBlockOffset(contentEditable, blockOffset, delta, false);
}

// The anchor names one place when both ends were measured to the same place in the same block. The offsets
// are measured over text, so a boundary that two nodes answer to is one place here, as it should be.
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

    // The block still holds the place the offset names, so it answers for it. Where it does not, a rebuild
    // divided it: the text the block no longer holds is the text the blocks after it took, so what is left
    // of the offset once this block's text is spent is that same place counted into the block that follows.
    // The place is only ever ahead of the block it was read in, so the blocks before it are never read.
    let offset = Math.max(blockOffset.offset + delta, 0);
    let length = block.textContent?.length ?? 0;
    while (offset > length && block.nextSibling) {
        offset -= length;
        block = block.nextSibling;
        length = block.textContent?.length ?? 0;
    }

    return findNodeAndOffset(block, offset, isEnd);
}

// The block the anchor was measured against while it is still in the document, or the element standing in
// its place once the command rebuilt it. A block that was written away altogether leaves nothing to measure
// against and the anchor is dropped.
function getAnchoredBlock(contentEditable: HTMLElement, blockOffset: BlockOffset): HTMLElement | null {
    if (blockOffset.block.isConnected) {
        return blockOffset.block;
    }

    const root = contentEditable.childNodes[blockOffset.index];

    return root && root.nodeType === Node.ELEMENT_NODE ? root as HTMLElement : null;
}
