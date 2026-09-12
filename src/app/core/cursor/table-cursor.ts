import {
    atEnd,
    atStart,
    getStrandedTable,
    getFirstCell,
    getLastCell,
    isCursorAtEndOfCell,
    isCursorAtStartOfCell,
    getCursorOffsetInElement,
    getCursorPositionFromPoint,
    getCursorCell
} from "@/core/cursor/util/cursor-util";
import {getRootElement} from "@/core/shared/element-util";
import {Display, isSchemaContain} from "@/core/normalize/type/schema";
import {
    CursorPosition,
    getCursorPosition,
    isCollapsed,
    setCursorPosition
} from "@/core/shared/type/cursor-position";

/**
 * Keeps the cursor out of the empty slot Chrome parks it in before or after a table - a
 * place outside any first-level block where typing would produce bare text.
 *
 * @remarks
 * Only three actions lead there: a horizontal move out of an edge cell, a horizontal move
 * into a neighbouring table, and a click in the table's margin. Each is intercepted before
 * the browser acts on it, so the cursor never reaches the slot and never needs correcting.
 */
export class TableCursor {
    private readonly contentEditable: HTMLElement;

    constructor(contentEditable: HTMLElement) {
        this.contentEditable = contentEditable;

        // Capture wins when the event targets a descendant; registering before the editor's
        // own keydown listener covers the case where the editor itself is the target. A
        // default action only runs once the whole dispatch is over, so preventDefault here
        // still stops it either way.
        contentEditable.addEventListener("keydown", (event) => this.onKeyDown(event), true);
        contentEditable.addEventListener("mousedown", (event) => this.onMouseDown(event), true);
    }

    /**
     * Redirects a click that would otherwise land in the table's dead slot into the nearest
     * edge cell. Unlike a key, a click can't be intercepted after the fact since the browser
     * places the cursor itself - so this asks where it would land before it does.
     */
    onMouseDown(event: MouseEvent, resolved?: CursorPosition | null): CursorPosition | null {
        // A shifted click extends the selection instead of placing the cursor, so the hit
        // test below only runs once the click is known to be a plain one.
        if (event.button !== 0 || event.shiftKey) {
            return null;
        }

        const cursorPosition = resolved === undefined
            ? getCursorPositionFromPoint(event.clientX, event.clientY)
            : resolved;
        const stranded = cursorPosition && getStrandedTable(cursorPosition);
        if (!stranded) {
            return null;
        }

        // A pointer carries no direction, so a click next to the table moves into its nearest edge cell.
        const cell = stranded.isBefore ? getFirstCell(stranded.table) : getLastCell(stranded.table);
        if (!cell) {
            return null;
        }

        event.preventDefault();
        // A prevented click no longer focuses the editor, and focusing would drop the selection.
        this.contentEditable.focus();

        return this.apply(stranded.isBefore ? atStart(cell) : atEnd(cell));
    }

    /**
     * Redirects an arrow-key move that would carry the cursor into (or out of) the table's
     * dead slot. Done before the browser moves the cursor itself, since correcting it
     * afterwards would still paint one frame with the cursor in the slot.
     */
    onKeyDown(event: KeyboardEvent): CursorPosition | null {
        if (!isEscapeKey(event)) {
            return null;
        }

        const cursorPosition = getCursorPosition();
        if (!isCollapsed(cursorPosition)) {
            return null;
        }

        const isBefore = event.key === "ArrowLeft";

        // Both a move out of an edge cell and a move into the table from a neighbouring block
        // land in the slot, so the browser's own move is unwanted at either edge.
        const table = this.getEscapedTable(cursorPosition, isBefore);
        if (table) {
            event.preventDefault();
            const target = this.getSiblingTarget(table, isBefore);
            return target ? this.apply(target) : null;
        }

        const entered = this.getEnteredTarget(cursorPosition, isBefore);
        if (entered) {
            event.preventDefault();
            return this.apply(entered);
        }

        return null;
    }

    /** The table the cursor is about to be carried out of, or `null` if the browser's own move is fine. */
    private getEscapedTable(cursorPosition: CursorPosition, isBefore: boolean) {
        const cell = getCursorCell(this.contentEditable, cursorPosition);
        if (!cell) {
            return null;
        }

        // A table is a first-level element, so the cell's root is the table holding it.
        const table = getRootElement(this.contentEditable, cell) as HTMLTableElement;

        if (cell !== (isBefore ? getFirstCell(table) : getLastCell(table))) {
            return null;
        }

        const isAtEdge = isBefore
            ? isCursorAtStartOfCell(cell, cursorPosition)
            : isCursorAtEndOfCell(cell, cursorPosition);

        return isAtEdge ? table : null;
    }

    /** The edge cell of a neighbouring table the cursor is about to be carried into. */
    private getEnteredTarget(cursorPosition: CursorPosition, isBefore: boolean) {
        // getRootElement stops at the editor's own child, so its parent doubles as the containment test.
        const root = getRootElement(this.contentEditable, cursorPosition.startContainer);
        if (root.parentElement !== this.contentEditable || isSchemaContain(root, [Display.Table])) {
            return null;
        }

        const sibling = isBefore ? root.previousElementSibling : root.nextElementSibling;
        if (!isSchemaContain(sibling, [Display.Table])) {
            return null;
        }

        // Measured against the whole root element so a list's inner blocks are stepped
        // through first, and only its very edge carries the cursor into the table.
        const offset = getCursorOffsetInElement(root, cursorPosition);
        if (offset !== (isBefore ? 0 : root.textContent.length)) {
            return null;
        }

        const table = sibling as HTMLTableElement;
        const cell = isBefore ? getLastCell(table) : getFirstCell(table);
        if (!cell) {
            return null;
        }

        return isBefore ? atEnd(cell) : atStart(cell);
    }

    private getSiblingTarget(table: HTMLTableElement, isBefore: boolean) {
        const sibling = isBefore ? table.previousElementSibling : table.nextElementSibling;
        if (!sibling || !isSchemaContain(sibling, [Display.FirstLevel, Display.List, Display.Table])) {
            return null;
        }

        return isBefore ? atEnd(sibling) : atStart(sibling);
    }

    private apply(target: CursorPosition) {
        setCursorPosition(this.contentEditable, target);

        return target;
    }
}

function isEscapeKey(event: KeyboardEvent) {
    if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) {
        return false;
    }

    return event.key === "ArrowLeft" || event.key === "ArrowRight";
}
