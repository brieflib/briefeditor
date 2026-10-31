import {
    CursorPosition,
    getCursorPosition,
    getCursorPositionFrom,
    isCollapsed
} from "@/core/shared/type/cursor-position";
import {Display, isSchemaContain} from "@/core/normalize/type/schema";
import {
    charLengthAfter,
    charLengthBefore,
    countPreviousSelfClose,
    getBlockElement,
    getElement,
    getFirstText,
    getFirstTextNew,
    getLastNode,
    getLastNonEmptyTextNew,
    getLastText,
    getNextNodeNew,
    getPreviousNode,
    getRootElement,
    isImageBlock,
    isPrintableKey
} from "@/core/shared/element-util";
import {Action, Command} from "@/core/command/type/command";
import {getLine} from "@/core/list/util/list-util";

export interface NodeOffset {
    readonly node: Node;
    readonly offset: number;
}

export interface CursorAnchor {
    // The block the offsets count from with two blocks on each side: [previous.previous, previous, block, next, next.next].
    readonly blocks: readonly (Node | null)[];
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

/**
 * Finds the node holding `targetPosition` of text, counted from the start of `root` the same as
 * {@link getOffsetInElement}. A self-close tag is a stop at its own offset, and the walk goes on into the blocks
 * after `root` while the offset runs past their text.
 */
export function findNodeAndOffset(root: Node, targetPosition: number): NodeOffset {
    let position = 0;
    let lastBlock = root;
    for (let block: Node | null = root; block; block = block.nextSibling) {
        lastBlock = block;
        const stack: Node[] = [block];
        while (stack.length > 0) {
            const current = stack.pop();
            if (!current) {
                break;
            }

            if (current instanceof Text) {
                const textContentLength = current.data.length;
                if (textContentLength === 0) {
                    continue;
                }

                if (position + textContentLength >= targetPosition) {
                    return {node: current, offset: targetPosition - position};
                }
                position += textContentLength;
            } else if (isSchemaContain(current, [Display.SelfClose])) {
                // No text before the tag reached the offset, so the point stands on the tag; the anchor's isAfter
                // decides whether the caret steps past it.
                if (position === targetPosition) {
                    return {node: current, offset: 0};
                }
            } else {
                for (let i = current.childNodes.length - 1; i >= 0; i--) {
                    const child = current.childNodes[i];
                    if (child) {
                        stack.push(child);
                    }
                }
            }
        }
    }

    // No node at that offset: an element without children, or less text than asked for in every block.
    if (targetPosition <= 0) {
        return {node: getFirstText(root), offset: 0};
    }

    const lastText = getLastText(lastBlock);
    return {node: lastText, offset: lastText.textContent?.length ?? 0};
}


/**
 * Reads the cursor as a place in the text, moved to where `command` leaves the caret. Take it before the command
 * rebuilds the document.
 */
export function getCursorAnchor(contentEditable: HTMLElement,
                                cursorPosition = getCursorPosition(),
                                command?: Command): CursorAnchor {
    // Both ends count from the block the selection starts in.
    const block = getBlockElement(contentEditable, cursorPosition.startContainer);
    const start = getOffsetFromBlock(block, cursorPosition.startContainer, cursorPosition.startOffset);
    const end = getOffsetFromBlock(block, cursorPosition.endContainer, cursorPosition.endOffset);
    const cursorAnchor = {
        blocks: getAnchorBlocks(contentEditable, block),
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
        // At the start of the block no text stands before the new tag, so the point is in it already.
        const isAfter = cursorAnchor.start > 0;
        return {...cursorAnchor, startIsAfter: isAfter, endIsAfter: isCarrier || cursorAnchor.endIsAfter};
    }

    const event = command?.event;
    if (command?.action === Action.Keyboard && event instanceof KeyboardEvent) {
        if (isPrintableKey(event)) {
            // The typed text replaces the selection and the caret stands right after it, on the same line.
            return collapseAnchor(cursorAnchor.blocks, cursorAnchor.start + event.key.length, 0);
        }

        if (event.key === "Backspace") {
            return stepBackOneCharacter(contentEditable, cursorAnchor, cursorPosition);
        }

        if (event.key === "Delete") {
            return stayBeforeNextCharacter(contentEditable, cursorAnchor, cursorPosition);
        }

        if (event.key === "Enter" && event.shiftKey) {
            // The caret stands right after the br the break puts in its line.
            return breakLine(contentEditable, cursorAnchor, cursorPosition);
        }

        if (event.key === "Enter") {
            // The caret stands at the start of the line the break opens.
            return openNewLine(contentEditable, cursorAnchor, cursorPosition);
        }

        return cursorAnchor;
    }

    return cursorAnchor;
}

/**
 * Moves a collapsed cursor to the start of the line Enter opens. The self-close tags before the cursor stay on the
 * first line, so the cursor steps over them and over the break.
 */
function openNewLine(contentEditable: HTMLElement, cursorAnchor: CursorAnchor, cursorPosition: CursorPosition) {
    const container = cursorPosition.startContainer;
    const offset = cursorPosition.startOffset;
    // The line before the break gets a br, and the caret steps over it into the new line.
    if (isAtLineStart(contentEditable, container, offset)) {
        return collapseAnchor(cursorAnchor.blocks, cursorAnchor.start, true);
    }

    // The break divides the text, so the caret stands at the start of the text after it.
    if (container instanceof Text && offset !== 0) {
        return collapseAnchor(cursorAnchor.blocks, cursorAnchor.start, true);
    }

    // Text stands before the caret in its line, so the count stops inside the line.
    const selfCloseBefore = countPreviousSelfClose(contentEditable, getLastNode(getPreviousNode(contentEditable, container)));
    return collapseAnchor(cursorAnchor.blocks, cursorAnchor.start, selfCloseBefore + 1);
}

/**
 * Moves a collapsed cursor right after the br Shift+Enter puts at it. A br holds no text, so the offset stays and
 * the caret steps over the br together with the self-close tags before it.
 */
function breakLine(contentEditable: HTMLElement, cursorAnchor: CursorAnchor, cursorPosition: CursorPosition) {
    const container = cursorPosition.startContainer;
    const offset = cursorPosition.startOffset;
    // The offset resolves onto the first node of the line, which is the new br, so one step goes past it.
    if (isAtLineStart(contentEditable, container, offset)) {
        return collapseAnchor(cursorAnchor.blocks, cursorAnchor.start, 1);
    }

    // The offset resolves onto the end of the text before the br, so the caret steps over the br into the next node.
    if (container instanceof Text && offset !== 0) {
        return collapseAnchor(cursorAnchor.blocks, cursorAnchor.start, 2);
    }

    // The self-close tags before the caret stand between that text end and the new br.
    const selfCloseBefore = countPreviousSelfClose(contentEditable, getLastNode(getPreviousNode(contentEditable, container)));
    return collapseAnchor(cursorAnchor.blocks, cursorAnchor.start, selfCloseBefore + 2);
}

/**
 * The blocks an anchor counts from: `block` with two blocks on each side, so the block standing in its place is found
 * after a command rebuilds or removes them. Empty when `block` is contentEditable itself.
 */
function getAnchorBlocks(contentEditable: HTMLElement, block: Node): (Node | null)[] {
    if (block === contentEditable) {
        return [];
    }

    const previous = block.previousSibling;
    const next = block.nextSibling;
    return [previous?.previousSibling ?? null, previous, block, next, next?.nextSibling ?? null];
}

/** The anchor as a caret at `start`, counted from the middle block of `blocks`. */
function collapseAnchor(blocks: readonly (Node | null)[],
                        start: number,
                        startIsAfter: number | boolean): CursorAnchor {
    return {
        blocks: blocks,
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
        return collapseAnchor(cursorAnchor.blocks, 0, 0);
    }

    const selfCloseBefore = countPreviousSelfClose(contentEditable, getLastNode(previous));

    // Backspace joins the line into the line above, so the caret stands at the end of the line above
    if (isAtLineStart(contentEditable, container, 0)) {
        const previousLineBlock = getBlockElement(contentEditable, previousText);
        // Last br of previousLineBlock has been removed, so the caret steps past the brs left before its text.
        if (isSchemaContain(previousLineBlock.firstChild, [Display.SelfClose])) {
            // An empty line stays apart from the line above, so the caret stays on its own br.
            if (isAtLineEnd(contentEditable, container, offset)) {
                return collapseAnchor(cursorAnchor.blocks, 0, 0);
            }

            return collapseAnchor(cursorAnchor.blocks, 0, selfCloseBefore - 1);
        }
        // The caret's line joins previousLineBlock, so the anchor counts from it.
        const start = getOffsetFromBlock(previousLineBlock, previousText, previousText.textContent?.length ?? 0);
        const blocks = getAnchorBlocks(contentEditable, previousLineBlock);

        // The line above holds no text, only its tags, and they stand until Backspace removes them, so the caret
        // steps past all of them onto its own line.
        if (isSchemaContain(previousText, [Display.SelfClose])) {
            return collapseAnchor(blocks, start, selfCloseBefore);
        }

        return collapseAnchor(blocks, start, selfCloseBefore === 0 ? 0 : selfCloseBefore - 1);
    }

    // The character before the caret is the last one of the text before it.
    if (selfCloseBefore === 0 && previousText instanceof Text) {
        return removeCharacterBefore(contentEditable, cursorAnchor, previousText, previousText.data.length);
    }

    // Backspace removes selfClose.
    if (selfCloseBefore === 1) {
        return collapseAnchor(cursorAnchor.blocks, cursorAnchor.start, 0);
    }

    // A self-close tag holds no text, so removing it keeps the offset.
    return collapseAnchor(cursorAnchor.blocks, cursorAnchor.start, selfCloseBefore);
}

/**
 * Keeps a collapsed cursor in place the way Delete does: the character after it goes, so its offset stays. The
 * anchor only has to keep the caret on its own side of the nodes Delete removes or joins after it.
 */
function stayBeforeNextCharacter(contentEditable: HTMLElement, cursorAnchor: CursorAnchor, cursorPosition: CursorPosition) {
    const container = cursorPosition.startContainer;
    const offset = cursorPosition.startOffset;
    // The start of the line and the end of the line above count to the same offset, so the caret steps after it.
    if (isAtLineStart(contentEditable, container, offset)) {
        return collapseAnchor(cursorAnchor.blocks, cursorAnchor.start, cursorAnchor.start > 0);
    }

    // The caret stands after a character of its own text.
    if (container instanceof Text && offset !== 0) {
        return collapseAnchor(cursorAnchor.blocks, cursorAnchor.start, 0);
    }

    // Self-close tags hold no text, so the caret counts them and its own place to stay after the ones before it.
    if (container instanceof Text) {
        const selfCloseBefore = countPreviousSelfClose(contentEditable, getLastNode(getPreviousNode(contentEditable, container)));
        return collapseAnchor(cursorAnchor.blocks, cursorAnchor.start, selfCloseBefore + 1);
    }

    return collapseAnchor(cursorAnchor.blocks, cursorAnchor.start, countPreviousSelfClose(contentEditable, container));
}

/**
 * The anchor at the end of the character Delete removes after a collapsed cursor. At the end of its line Delete joins
 * the next line, so the anchor stands at that line's start.
 */
export function getNextCharacterAnchor(contentEditable: HTMLElement, cursorPosition: CursorPosition): CursorAnchor {
    const cursorAnchor = getCursorAnchor(contentEditable, cursorPosition);
    const container = cursorPosition.startContainer;
    const offset = cursorPosition.startOffset;

    // The end of the line and the start of the next one count to the same offset, so the anchor steps after it.
    if (isAtLineEnd(contentEditable, container, offset)) {
        return collapseAnchor(cursorAnchor.blocks, cursorAnchor.start, true);
    }

    // The character after the caret is in its own text, where a surrogate pair counts as one character.
    if (container instanceof Text && offset < container.data.length) {
        return collapseAnchor(cursorAnchor.blocks, cursorAnchor.start + charLengthAfter(container.data, offset), 0);
    }

    // A self-close tag after the caret is what Delete removes; it holds no text, so the offset stays and the anchor
    // steps onto the tag
    const nextLeaf = getFirstTextNew(getNextNodeNew(contentEditable, container));
    if (container instanceof Text && isSchemaContain(nextLeaf, [Display.SelfClose])) {
        return collapseAnchor(cursorAnchor.blocks, cursorAnchor.start, 1);
    }

    // The character after the caret opens the next text in the line, behind an inline tag.
    return collapseAnchor(cursorAnchor.blocks, cursorAnchor.start + 1, 0);
}

/** The anchor after Backspace removes the character before `offset` in `text`. */
function removeCharacterBefore(contentEditable: HTMLElement, cursorAnchor: CursorAnchor, text: Text, offset: number) {
    const deletedLength = charLengthBefore(text.data, offset);
    const start = cursorAnchor.start - deletedLength;
    // The emptied line and the end of the line above count to the same offset, so the caret steps after it.
    const isAfterTag = start > 0 && isAtLineStart(contentEditable, text, offset - deletedLength);
    return collapseAnchor(cursorAnchor.blocks, start, isAfterTag);
}

/** Whether the point stands at the start of its line: the closest paragraph, heading or list item. */
function isAtLineStart(contentEditable: HTMLElement, container: Node, offset: number) {
    const line = getElement(contentEditable, container as HTMLElement, [Display.Line, Display.List]);
    return line !== null && getOffsetInElement(container, line, offset) === 0;
}

/** Whether the point stands at the end of its line: the closest paragraph, heading or list item, without nested lists. */
function isAtLineEnd(contentEditable: HTMLElement, container: Node, offset: number) {
    const line = getElement(contentEditable, container as HTMLElement, [Display.Line, Display.List]);
    if (!line) {
        return false;
    }

    // A nested list is its own items' text, not the item's line.
    const lineText = isSchemaContain(line, [Display.List]) ? getLine(line).textContent : line.textContent;
    return getOffsetInElement(container, line, offset) === lineText.length;
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
        cursorAnchor.blocks,
        cursorAnchor.start,
        cursorAnchor.startIsAfter);
    const end = resolveBlockOffset(contentEditable,
        cursorAnchor.blocks,
        cursorAnchor.end,
        cursorAnchor.endIsAfter);
    return getCursorPositionFrom(start.node, start.offset, end.node, end.offset);
}

/**
 * Finds the endpoint again by counting its offset from the anchor's block, walking on to the next blocks while the
 * offset runs past them. Without blocks it counts from the start of contentEditable.
 *
 * @param cursorAfterTagsCount - A point at the end of a node goes to the start of the node after it.
 */
function resolveBlockOffset(contentEditable: HTMLElement,
                            blocks: readonly (Node | null)[],
                            offset: number,
                            cursorAfterTagsCount: number | boolean): NodeOffset {
    // FixMe: make previousBlock not null, rename to block
    // ToDo: change contentEditable.firstChild
    const block = findAnchorBlock(contentEditable, blocks);
    if (!block) {
        return {node: contentEditable, offset: 0};
    }

    return enterNextNode(block, findNodeAndOffset(block, offset), cursorAfterTagsCount);
}

/**
 * The first block standing in the place of the anchor's block. A command may insert blocks before the anchor's block
 * or rebuild it, so the place starts right after the nearest kept block before it.
 */
function findAnchorBlock(contentEditable: HTMLElement, blocks: readonly (Node | null)[]) {
    const [previousPrevious, previous, current, next, nextNext] = blocks;
    if (current?.isConnected) {
        return current;
    }

    if (previous?.isConnected) {
        return previous.nextSibling;
    }

    // The first block had no block before it, so its place starts at the start of contentEditable.
    if (previous === null) {
        return contentEditable.firstChild;
    }

    // The block was rebuilt or removed, so the one now in its place stands right before a kept block after it or
    // right after a kept block further before it.
    if (next?.isConnected) {
        return next.previousSibling;
    }

    if (previousPrevious?.isConnected) {
        return previousPrevious.nextSibling;
    }

    if (nextNext?.isConnected) {
        return nextNext.previousSibling;
    }

    // An anchor without blocks counts from the first block.
    return contentEditable.firstChild;
}

/** Finds the block that holds the offset, walking on from `block` to the next blocks while the offset runs past them. */
function findStartBlock(block: Node, offset: number): NodeOffset {
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
 * parents up to the block, so the next node may be the next block.
 */
function enterNextNode(block: Node,
                       nodeOffset: NodeOffset,
                       cursorAfterTagsCount: number | boolean): NodeOffset {
    // A point inside its text, or at its start, is not at the end of a node, so nothing after it is entered.
    if (nodeOffset.node instanceof Text && nodeOffset.offset < nodeOffset.node.data.length) {
        return nodeOffset;
    }

    let offset = 0;
    let next: Node | null = nodeOffset.node;

    if (cursorAfterTagsCount === true) {
        next = getFirstTextNew(getNextNodeNew(block, next));
    }

    if (typeof cursorAfterTagsCount === "number") {
        for (let i = 0; i < cursorAfterTagsCount && next; i++) {
            next = getFirstTextNew(getNextNodeNew(block, next));
        }
    }

    if (cursorAfterTagsCount === false || cursorAfterTagsCount === 0) {
        offset = nodeOffset.offset;
    }

    return next ? {node: next, offset: offset} : nodeOffset;
}

/** Whether the cursor spans whole lines: it starts at the start of its first line and ends at the end of its last one. */
export function isCursorOnWholeLines(contentEditable: HTMLElement, cursorPosition: CursorPosition) {
    return isAtLineStart(contentEditable, cursorPosition.startContainer, cursorPosition.startOffset) &&
        isAtLineEnd(contentEditable, cursorPosition.endContainer, cursorPosition.endOffset);
}

