import {
    CursorPosition,
    getCursorPosition,
    getCursorPositionFrom,
    isCollapsed
} from "@/core/shared/type/cursor-position";
import {Display, isSchemaContain} from "@/core/normalize/type/schema";
import {
    charLengthBefore,
    countPreviousSelfClose,
    getBlockElement,
    getElement,
    getFirstText,
    getFirstTextNew,
    getLastNode,
    getLastNonEmptyTextNew,
    getLastText,
    getNextNode,
    getPreviousNode,
    getRootElement,
    isImageBlock,
    isPrintableKey
} from "@/core/shared/element-util";
import {Action, Command} from "@/core/command/type/command";

export interface NodeOffset {
    readonly node: Node;
    readonly offset: number;
}

export interface CursorAnchor {
    readonly previousBlock: Node | null;
    readonly start: number;
    readonly end: number;
    readonly startIsAfter: number | boolean;
    readonly endIsAfter: number | boolean;
    // FixMe: return start === end
    readonly length: number;
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
    return getOffsetInElement(cursorPosition.endContainer, element, cursorPosition.endOffset);
}

/**
 * How much text of `element` precedes the point named by `container`/`offset`. Counts text
 * only, the same as {@link findNodeAndOffset}, so the two round-trip.
 */
export function getOffsetInElement(container: Node, element: Node, offset: number) {
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

/** The edge of the block beside `element` the cursor lands on when carried past it, or `null` if there is none. */
export function getSiblingTarget(element: HTMLElement, isBefore: boolean) {
    const sibling = isBefore ? element.previousElementSibling : element.nextElementSibling;
    if (!sibling || !isSchemaContain(sibling, [Display.FirstLevel, Display.List, Display.Table])) {
        return null;
    }

    return isBefore ? atEnd(sibling) : atStart(sibling);
}

/**
 * Moves a collapsed cursor left in an image block to the start of the block after it - an
 * image block never holds the cursor. A paragraph is opened after the image when nothing
 * follows it, so the cursor always has a line to go to.
 */
export function escapeImageBlock(contentEditable: HTMLElement, cursorPosition: CursorPosition): CursorPosition {
    if (!isCollapsed(cursorPosition) || !contentEditable.contains(cursorPosition.startContainer)) {
        return cursorPosition;
    }

    const root = getRootElement(contentEditable, cursorPosition.startContainer);
    if (!isImageBlock(root)) {
        return cursorPosition;
    }

    if (!root.nextSibling) {
        const paragraph = document.createElement("p");
        paragraph.appendChild(document.createElement("br"));
        root.after(paragraph);
    }

    return atStart(root.nextSibling as Node);
}

/**
 * Whether a vertical move would carry the cursor out of its root: the cursor stands in the
 * block holding the root's first (or last) leaf, on that block's first (or last) visual line.
 *
 * @remarks
 * The line is read from the caret's client rect against the block's. A caret resting on an
 * element (the br of an empty block) has no rect of its own, so the element's is used; a
 * block without layout (no rects at all) is read as a single line.
 */
export function isOnEdgeLine(root: HTMLElement, block: HTMLElement, cursorPosition: CursorPosition, isBefore: boolean) {
    const edgeLeaf = isBefore ? getFirstText(root) : getLastText(root);
    if (!block.contains(edgeLeaf)) {
        return false;
    }

    // The block is read first: one without layout has no lines to tell apart.
    const blockRect = block.getBoundingClientRect();
    if (!blockRect.height) {
        return true;
    }

    const caretRect = getCaretRect(cursorPosition);
    if (!caretRect) {
        return true;
    }

    const lineHeight = parseFloat(getComputedStyle(block).lineHeight) || caretRect.height;

    return isBefore
        ? caretRect.top - blockRect.top < lineHeight
        : blockRect.bottom - caretRect.bottom < lineHeight;
}

function getCaretRect(cursorPosition: CursorPosition): DOMRect | null {
    const rect = cursorPosition.range.getClientRects()[0];
    if (rect && rect.height) {
        return rect;
    }

    const container = cursorPosition.startContainer;
    const element = container.nodeType === Node.ELEMENT_NODE
        ? container as HTMLElement
        : container.parentElement;
    const elementRect = element?.getBoundingClientRect();

    return elementRect && elementRect.height ? elementRect : null;
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

export function findNodeAndOffset(root: Node, targetPosition: number): NodeOffset {
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

            if (position + textContentLength >= targetPosition) {
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

/**
 * Reads the cursor as a place in the text, moved to where `command` leaves the caret. Take it before the command
 * rebuilds the document.
 */
export function getCursorAnchor(contentEditable: HTMLElement,
                                cursorPosition = getCursorPosition(),
                                command?: Command): CursorAnchor {
    // Both ends count from the block the selection starts in: the command may rebuild it and every block after it,
    // so only the block before it is sure to stay.
    const block = getBlockElement(contentEditable, cursorPosition.startContainer);
    const start = getOffsetFromBlock(block, cursorPosition.startContainer, cursorPosition.startOffset);
    const end = getOffsetFromBlock(block, cursorPosition.endContainer, cursorPosition.endOffset);
    const cursorAnchor = {
        // A start on the editor itself counts from the editor's start: the editor's own sibling is outside of it.
        previousBlock: block === contentEditable ? null : block.previousSibling,
        start: start,
        end: end,
        startIsAfter: cursorPosition.startOffset === 0 && !!cursorPosition.startContainer.parentElement?.previousSibling,
        endIsAfter: cursorPosition.endOffset === 0 && !!cursorPosition.endContainer.parentElement?.previousSibling,
        // FixMe: Change to isCollapsed
        length: getSelectedLength(cursorPosition)
    };

    // A tag toggled on a caret takes the caret into the new tag.
    if (command?.action === Action.Tag) {
        const isCarrier = cursorAnchor.length === 0;
        return {...cursorAnchor, startIsAfter: true, endIsAfter: isCarrier};
    }

    const event = command?.event;
    if (command?.action === Action.Keyboard && event instanceof KeyboardEvent) {
        if (isPrintableKey(event)) {
            // The typed text replaces the selection and the caret stands right after it, on the same line.
            return collapseAnchor(cursorAnchor.previousBlock, cursorAnchor.start + event.key.length, 0);
        }

        if (event.key === "Backspace") {
            return stepBackOneCharacter(contentEditable, cursorAnchor, cursorPosition);
        }

        return cursorAnchor;
    }

    return cursorAnchor;
}

/** The anchor as a caret at `start`, counted from the block after `previousBlock`. */
function collapseAnchor(previousBlock: Node | null,
                        start: number,
                        startIsAfter: number | boolean): CursorAnchor {
    return {
        previousBlock: previousBlock,
        start: start,
        end: start,
        startIsAfter: startIsAfter,
        endIsAfter: startIsAfter,
        length: 0
    };
}

/**
 * Steps back one character from a collapsed cursor the way Backspace does: within its text, then over the nodes
 * before it in its line. Once the line runs out of characters Backspace joins it into the previous line instead.
 */
function stepBackOneCharacter(contentEditable: HTMLElement, cursorAnchor: CursorAnchor, cursorPosition: CursorPosition) {
    const container = cursorPosition.startContainer;
    const offset = cursorPosition.startOffset;
    // A caret on a self-close tag stands before it, the same place as a text at its start.
    if (!(container instanceof Text) && !isSchemaContain(container, [Display.SelfClose])) {
        throw Error("Collapsed selection is not in text or on a self-close tag");
    }

    // The character before the caret is in its own text.
    if (container instanceof Text && offset !== 0) {
        return removeCharacterBefore(contentEditable, cursorAnchor, container, offset);
    }

    const previous = getPreviousNode(contentEditable, container);
    const previousText = getLastNonEmptyTextNew(previous);
    // Nothing stands before the caret, so Backspace has nothing to remove.
    if (!previous || !previousText) {
        return collapseAnchor(cursorAnchor.previousBlock, 0, 0);
    }

    const selfCloseBefore = countPreviousSelfClose(contentEditable, getLastNode(previous));

    // Backspace joins the line into the line above, so the caret stands at the end of the line above.
    // if (isAtLineStart(contentEditable, container, 0)) {
    //     const previousLineBlock = getBlockElement(contentEditable, previousText);
    //     const start = getOffsetFromBlock(previousLineBlock, previousText, previousText.textContent?.length ?? 0);
    //     return collapseAnchor(previousLineBlock.previousSibling, start, selfCloseBefore);
    // }

    // Backspace joins the line into the line above, so the caret stands at the end of the line above.
    if (isAtLineStart(contentEditable, container, 0)) {
        const previousLineBlock = getBlockElement(contentEditable, previousText);
        // An empty line of another kind only loses a br, so the caret counts from the block before its own,
        // which falls back to the editor's start once the emptied line is gone.

        if (isEmptyLine(previousLineBlock, getBlockElement(contentEditable, container))) {
            return collapseAnchor(cursorAnchor.previousBlock, 0, false);
        }

        const start = getOffsetFromBlock(previousLineBlock, previousText, previousText.textContent?.length ?? 0);
        return collapseAnchor(previousLineBlock.previousSibling, start, selfCloseBefore);
    }

    // The character before the caret is the last one of the text before it.
    if (selfCloseBefore === 0 && previousText instanceof Text) {
        return removeCharacterBefore(contentEditable, cursorAnchor, previousText, previousText.data.length);
    }

    // A self-close tag holds no text, so removing it keeps the offset.
    return collapseAnchor(cursorAnchor.previousBlock, cursorAnchor.start, selfCloseBefore);
}

/** Whether `block` is an empty line other than `caretBlock`: Backspace removes one of its brs, not the block after it. */
export function isEmptyLine(block: Node | null, caretBlock: Node) {
    return block instanceof HTMLElement && block !== caretBlock && block.hasChildNodes() &&
        Array.from(block.childNodes).every(child => child.nodeName === "BR");
}



/** The anchor after Backspace removes the character before `offset` in `text`. */
function removeCharacterBefore(contentEditable: HTMLElement, cursorAnchor: CursorAnchor, text: Text, offset: number) {
    const deletedLength = charLengthBefore(text.data, offset);
    const start = cursorAnchor.start - deletedLength;
    // The emptied line and the end of the line above count to the same offset, so the caret steps after it.
    const isAfterTag = start > 0 && isAtLineStart(contentEditable, text, offset - deletedLength);
    return collapseAnchor(cursorAnchor.previousBlock, start, isAfterTag);
}

/** Whether the point stands at the start of its line: the closest paragraph, heading or list item. */
function isAtLineStart(contentEditable: HTMLElement, container: Node, offset: number) {
    const line = getElement(contentEditable, container as HTMLElement, [Display.Line, Display.List]);
    return line !== null && getOffsetInElement(container, line, offset) === 0;
}

/** How much text the cursor spans, counted the same way its endpoint offsets are. */
function getSelectedLength(cursorPosition: CursorPosition) {
    return cursorPosition.range.toString().length;
}

/** How much text stands from the start of `block` up to the point, which may lie in a block after it. */
function getOffsetFromBlock(block: Node, container: Node, offset: number) {
    const range = new Range();
    range.setStart(block, 0);
    range.setEnd(container, offset);

    return range.toString().length;
}

export function resolveCursorAnchor(contentEditable: HTMLElement, cursorAnchor: CursorAnchor): CursorPosition {
    const start = resolveBlockOffset(contentEditable,
        cursorAnchor.previousBlock,
        cursorAnchor.start,
        cursorAnchor.startIsAfter);
    const end = resolveBlockOffset(contentEditable,
        cursorAnchor.previousBlock,
        cursorAnchor.end,
        cursorAnchor.endIsAfter);
    return getCursorPositionFrom(start.node, start.offset, end.node, end.offset);
}

/**
 * Finds the endpoint again by counting its offset from the block after `previousBlock`, walking on to the next
 * blocks while the offset runs past them. Without a previous block it counts from the start of contentEditable.
 *
 * @param cursorAfterTagsCount - A point at the end of a node goes to the start of the node after it.
 */
function resolveBlockOffset(contentEditable: HTMLElement,
                            previousBlock: Node | null,
                            offset: number,
                            cursorAfterTagsCount: number | boolean): NodeOffset {
    // FixMe: make previousBlock not null
    const block = previousBlock?.isConnected ? previousBlock.nextSibling : contentEditable.firstChild;
    if (!block) {
        return {node: contentEditable, offset: 0};
    }

    const blockOffset = maybeNextBlockAndOffset(block, offset);
    return enterNextNode(blockOffset.node as HTMLElement, findNodeAndOffset(blockOffset.node, blockOffset.offset),
        cursorAfterTagsCount);
}

/** Finds the block that holds the offset, walking on from `block` to the next blocks while the offset runs past them. */
function maybeNextBlockAndOffset(block: Node, offset: number): NodeOffset {
    let length = block.textContent?.length ?? 0;
    // A line start at the end of a block's text belongs to the next block; an empty block holds it already.
    while (offset > length && block.nextSibling) {
        offset -= length;
        block = block.nextSibling;
        length = block.textContent?.length ?? 0;
    }

    return {node: block, offset: offset};
}

/**
 * Moves a point standing at the end of its text to the start of the node after it, climbing out of the node's
 * parents up to the block, so the next node may be the next block. A point on a br stays: it is an empty line.
 */
function enterNextNode(block: HTMLElement,
                       nodeOffset: NodeOffset,
                       cursorAfterTagsCount: number | boolean): NodeOffset {
    if (cursorAfterTagsCount === 0 || !(nodeOffset.node instanceof Text)) {
        return nodeOffset;
    }

    // Only a point at the end of its text has a node after it to enter.
    const isAtNodeEnd = nodeOffset.offset === nodeOffset.node.data.length;
    if (!isAtNodeEnd) {
        return nodeOffset;
    }

    let offset = 0;
    let next: Node | null = nodeOffset.node;
    if (cursorAfterTagsCount === true) {
        next = getFirstTextNew(getNextNode(block, next));
    }
    if (typeof cursorAfterTagsCount === "number") {
        const count = cursorAfterTagsCount === 1 ? 2 : cursorAfterTagsCount;
        for (let i = 0; i < count && next; i++) {
            next = getFirstTextNew(getNextNode(block, next));
        }
    }
    if (cursorAfterTagsCount === false || cursorAfterTagsCount === 0) {
        offset = nodeOffset.offset;
    }
    if (!next) {
        return nodeOffset;
    }

    return {node: next, offset: offset};
}
