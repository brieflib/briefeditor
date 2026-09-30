import {
    CursorPosition,
    getCursorPosition,
    getCursorPositionFrom,
    isCollapsed
} from "@/core/shared/type/cursor-position";
import {Display, isSchemaContain} from "@/core/normalize/type/schema";
import {
    getElement,
    getFirstText,
    getLastText,
    getNextNode,
    getPreviousNode,
    getRootElement,
    isImageBlock
} from "@/core/shared/element-util";
import {LinePosition} from "@/core/cursor/type/line-position";

export interface NodeOffset {
    readonly node: Node;
    readonly offset: number;
}

export interface CursorAnchor {
    readonly previousBlock: Node | null;
    readonly start: number;
    readonly end: number;
    readonly endLinePosition: LinePosition;
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

export function findNodeAndOffset(root: Node, targetPosition: number, isEnd: boolean): NodeOffset {
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
export function getCursorAnchor(contentEditable: HTMLElement, cursorPosition = getCursorPosition()): CursorAnchor {
    // Both ends count from the block the selection starts in: the command may rebuild it and every block after it,
    // so only the block before it is sure to stay.
    const block = getRootElement(contentEditable, cursorPosition.startContainer);

    return {
        // A start on the editor itself counts from the editor's start: the editor's own sibling is outside of it.
        previousBlock: block === contentEditable ? null : block.previousSibling,
        start: getOffsetFromBlock(block, cursorPosition.startContainer, cursorPosition.startOffset),
        end: getOffsetFromBlock(block, cursorPosition.endContainer, cursorPosition.endOffset),
        endLinePosition: getLinePosition(contentEditable, cursorPosition.endContainer, cursorPosition.endOffset),
        length: getSelectedLength(cursorPosition)
    };
}

/**
 * Whether the point stands before any text of its line. Such a point and the end of the line before it count to
 * the same offset, and only this tells them apart.
 */
function getLinePosition(contentEditable: HTMLElement, container: Node, offset: number) {
    const line = getElement(contentEditable, container as HTMLElement, [Display.Line, Display.List]);
    if (line && getOffsetInElement(line, container, offset) === 0) {
        return LinePosition.CursorAtStart;
    }

    return LinePosition.CursorAtEnd;
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
    // The start counts from its own block, so it never stands on a boundary between blocks.
    const start = resolveBlockOffset(contentEditable, cursorAnchor.previousBlock, cursorAnchor.start, false,
        LinePosition.CursorAtEnd);

    // A caret is one place: resolved on its own, its end would fall on the text before a boundary between two texts.
    if (cursorAnchor.length === 0) {
        return getCursorPositionFrom(start.node, start.offset, start.node, start.offset);
    }

    const end = resolveBlockOffset(contentEditable, cursorAnchor.previousBlock, cursorAnchor.end, true,
        cursorAnchor.endLinePosition);

    return getCursorPositionFrom(start.node, start.offset, end.node, end.offset);
}

/**
 * Finds the endpoint again by counting its offset from the block after `previousBlock`, walking on to the next
 * blocks while the offset runs past them. Without a previous block it counts from the start of contentEditable.
 *
 * @param linePosition - A point that stood at the start of its line goes to the text after a boundary.
 */
function resolveBlockOffset(contentEditable: HTMLElement, previousBlock: Node | null, offset: number, isEnd: boolean,
                            linePosition: LinePosition): NodeOffset {
    const isLineStart = linePosition === LinePosition.CursorAtStart;
    let block = previousBlock?.isConnected ? previousBlock.nextSibling : contentEditable.firstChild;
    if (!block) {
        return {node: contentEditable, offset: 0};
    }

    let length = block.textContent?.length ?? 0;
    // A line start at the end of a block's text belongs to the next block; an empty block holds it already.
    while ((offset > length || (isLineStart && offset === length && length > 0)) && block.nextSibling) {
        offset -= length;
        block = block.nextSibling;
        length = block.textContent?.length ?? 0;
    }

    return enterEmptyTag(block as HTMLElement, findNodeAndOffset(block, offset, isEnd && !isLineStart));
}

/**
 * Moves the point into an empty tag standing right beside it, since such a tag holds no text to be found by
 * offset. Only a tag inside `block` is taken.
 */
function enterEmptyTag(block: HTMLElement, nodeOffset: NodeOffset): NodeOffset {
    const node = nodeOffset.node;
    if (!(node instanceof Text)) {
        return nodeOffset;
    }

    let emptyText: Node | null = null;
    if (nodeOffset.offset === node.data.length) {
        const next = getNextNode(block, node);
        emptyText = next ? getFirstText(next) : null;
    } else if (nodeOffset.offset === 0) {
        const previous = getPreviousNode(block, node);
        emptyText = previous ? getLastText(previous) : null;
    }

    // The sibling search climbs to the block itself and could hand back a node from the block beside it.
    if (emptyText && block.contains(emptyText) && emptyText instanceof Text && !emptyText.data) {
        return {node: emptyText, offset: 0};
    }

    return nodeOffset;
}