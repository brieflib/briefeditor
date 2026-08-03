import {
    atEnd,
    atStart,
    getStrandedTable,
    getFirstCell,
    getLastCell,
    isCursorAtEndOfCell,
    isCursorAtStartOfCell,
    getCursorOffsetInElement,
    getCursorPositionFromPoint
} from "@/core/cursor/util/cursor-util";
import {getRootElement} from "@/core/shared/element-util";
import {Display, isSchemaContain} from "@/core/normalize/type/schema";
import {
    CursorPosition,
    getCursorPosition,
    isCollapsed,
    setCursorPosition
} from "@/core/shared/type/cursor-position";

// Chrome parks the cursor before or after a table, in a slot that belongs to no block and where typing
// produces bare text outside of any first level block. Only a horizontal move out of an edge cell, a
// horizontal move into a neighbouring table and a click in the margin lead there, and each is taken over
// before the browser acts on it, so the cursor never reaches the slot and never has to be moved back out.
export class TableCursor {
    private readonly contentEditable: HTMLElement;

    constructor(contentEditable: HTMLElement) {
        this.contentEditable = contentEditable;

        // Ordering still holds: capture wins when the event targets a descendant, and this class is registered
        // before the editor's own keydown listener for when the editor itself is the target. A default action
        // is only run once the whole dispatch is over, so preventing it from here still stops it.
        contentEditable.addEventListener("keydown", (event) => this.onKeyDown(event), true);
        contentEditable.addEventListener("mousedown", (event) => this.onMouseDown(event), true);
    }

    // A click cannot be taken over the way a key is, because the cursor is placed by the browser only
    // after the event. Asking where the click would land, before it is placed, allows the same take over.
    onMouseDown(event: MouseEvent, resolved?: CursorPosition | null): CursorPosition | null {
        // A shifted click extends the selection instead of placing the cursor. Resolving the point is a
        // hit test, so it waits until the click is known to be a plain one.
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

        // A pointer carries no direction, so a click next to the table moves into the nearest edge cell.
        const cell = stranded.isBefore ? getFirstCell(stranded.table) : getLastCell(stranded.table);
        if (!cell) {
            return null;
        }

        event.preventDefault();
        // The prevented click no longer focuses the editor, and focusing drops the selection.
        this.contentEditable.focus();

        return this.apply(stranded.isBefore ? atStart(cell) : atEnd(cell));
    }

    // Correcting the cursor after the browser has moved it would paint one frame with it in the slot,
    // so the move is made here instead, before the browser makes its own.
    onKeyDown(event: KeyboardEvent): CursorPosition | null {
        if (!isEscapeKey(event)) {
            return null;
        }

        const cursorPosition = getCursorPosition();
        if (!isCollapsed(cursorPosition)) {
            return null;
        }

        const isBefore = event.key === "ArrowLeft";

        // Both the move out of an edge cell and the move into the table from a neighbouring block
        // land in the slot, so the browser's own move is never wanted at either of these edges.
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

    // The table the cursor is about to be carried out of, or null when the browser's own move is fine.
    private getEscapedTable(cursorPosition: CursorPosition, isBefore: boolean) {
        const container = cursorPosition.startContainer;
        const element = container.nodeType === Node.TEXT_NODE ? container.parentElement : container as HTMLElement;
        const cell = element?.closest("td, th") as HTMLTableCellElement | null;
        const table = cell?.closest("table");
        if (!cell || !table) {
            return null;
        }

        if (cell !== (isBefore ? getFirstCell(table) : getLastCell(table))) {
            return null;
        }

        const isAtEdge = isBefore
            ? isCursorAtStartOfCell(cell, cursorPosition)
            : isCursorAtEndOfCell(cell, cursorPosition);

        return isAtEdge ? table : null;
    }

    // The edge cell of a neighbouring table the cursor is about to be carried into.
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

        // Measured against the whole root element so that the inner blocks of a list are stepped
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
