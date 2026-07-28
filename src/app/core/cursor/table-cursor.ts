import {
    getStrandedTable,
    getFirstCell,
    getLastCell,
    isCursorAtEndOfCell,
    isCursorAtStartOfCell,
    getCursorOffsetInElement,
    getCursorPositionFromPoint,
    StrandedTable
} from "@/core/cursor/util/cursor-util";
import {getFirstText, getLastText, getRootElement} from "@/core/shared/element-util";
import {Display, isSchemaContain} from "@/core/normalize/type/schema";
import {
    CursorPosition,
    getCursorPosition,
    getCursorPositionFrom,
    isCollapsed,
    isRangeIn,
    setCursorPosition
} from "@/core/shared/type/cursor-position";

// Chrome parks the caret before or after a table, in a slot that belongs to no block and where typing
// produces bare text outside of any first level block. A horizontal move out of an edge cell and a click
// in the margin are taken over before the browser acts on them, so the caret never reaches the slot;
// anything else landing there - Home/End, a vertical move - is caught by the selection change that
// follows, which repaints one frame later and is why the two common paths are pre-empted instead.
export class TableCursor {
    private readonly contentEditable: HTMLElement;
    private lastCursorPosition: CursorPosition | null = null;
    private isApplying = false;

    constructor(contentEditable: HTMLElement) {
        this.contentEditable = contentEditable;

        document.addEventListener("selectionchange", () => this.onSelectionChange());
        // Capturing on the document runs before the editor's own keydown listener, so the caret is
        // already valid by the time a key is handled, and a horizontal move away from the table is
        // taken over before the browser paints the caret in the invalid slot.
        document.addEventListener("keydown", (event) => this.onKeyDown(event), true);
        document.addEventListener("mousedown", (event) => this.onMouseDown(event), true);
    }

    // A click cannot be taken over the way a key is, because the cursor is placed by the browser only
    // after the event. Asking where the click would land, before it is placed, allows the same take over.
    onMouseDown(event: MouseEvent, cursorPosition = getCursorPositionFromPoint(event.clientX, event.clientY)): CursorPosition | null {
        // A shifted click extends the selection instead of placing the cursor.
        if (event.button !== 0 || event.shiftKey || !cursorPosition) {
            return null;
        }

        if (!isRangeIn(this.contentEditable, cursorPosition)) {
            return null;
        }

        const stranded = getStrandedTable(cursorPosition);
        if (!stranded) {
            return null;
        }

        // A pointer carries no direction, so a click next to the table always moves into its edge cell,
        // where the selection change guard would instead read the way the cursor was travelling.
        const cell = stranded.isBefore ? getFirstCell(stranded.table) : getLastCell(stranded.table);
        if (!cell) {
            return null;
        }

        event.preventDefault();
        // The prevented click no longer focuses the editor, and focusing drops the selection.
        this.contentEditable.focus();

        return this.apply(stranded.isBefore ? atStart(cell) : atEnd(cell));
    }

    // Chrome paints one frame with the caret parked next to the table before the selection change
    // that would correct it is delivered. Moving the caret here, instead of letting the browser
    // step into the slot first, is what keeps it from flickering.
    onKeyDown(event: KeyboardEvent): CursorPosition | null {
        // A selection change is dispatched asynchronously, so a key pressed right after the caret was
        // parked can still arrive while it sits in the slot.
        this.onSelectionChange();

        if (!isEscapeKey(event)) {
            return null;
        }

        const cursorPosition = getCursorPosition();
        if (!isCollapsed(cursorPosition) || !isRangeIn(this.contentEditable, cursorPosition)) {
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

    // Returns the position the caret was moved to, or null when the caret was left alone.
    onSelectionChange(cursorPosition = getCursorPosition()): CursorPosition | null {
        if (this.isApplying || !isCollapsed(cursorPosition) || !isRangeIn(this.contentEditable, cursorPosition)) {
            return null;
        }

        const stranded = getStrandedTable(cursorPosition);
        if (!stranded) {
            this.lastCursorPosition = cursorPosition;
            return null;
        }

        const target = this.getTarget(stranded);
        return target ? this.apply(target) : null;
    }

    // Leaving the table moves to the neighbouring block, arriving from outside moves into the edge cell.
    private getTarget(stranded: StrandedTable): CursorPosition | null {
        const wasInside = this.lastCursorPosition && stranded.table.contains(this.lastCursorPosition.startContainer);
        const sibling = wasInside ? this.getSiblingTarget(stranded.table, stranded.isBefore) : null;
        if (sibling) {
            return sibling;
        }

        const cell = stranded.isBefore ? getFirstCell(stranded.table) : getLastCell(stranded.table);
        if (!cell) {
            return null;
        }

        return stranded.isBefore ? atStart(cell) : atEnd(cell);
    }

    // The table the cursor is about to be carried out of, or null when the browser's own move is fine.
    private getEscapedTable(cursorPosition: CursorPosition, isBefore: boolean) {
        const container = cursorPosition.startContainer;
        const element = container.nodeType === Node.TEXT_NODE ? container.parentElement : container as HTMLElement;
        const cell = element?.closest("td, th") as HTMLTableCellElement | null;
        const table = cell?.closest("table");
        if (!cell || !table || !this.contentEditable.contains(table)) {
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
        const root = getRootElement(this.contentEditable, cursorPosition.startContainer);
        const sibling = isBefore ? root?.previousElementSibling : root?.nextElementSibling;
        if (!root || isSchemaContain(root, [Display.Table]) || !isSchemaContain(sibling, [Display.Table])) {
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
        this.isApplying = true;
        try {
            setCursorPosition(this.contentEditable, target);
            this.lastCursorPosition = target;
        } finally {
            this.isApplying = false;
        }

        return target;
    }
}

function isEscapeKey(event: KeyboardEvent) {
    if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) {
        return false;
    }

    return event.key === "ArrowLeft" || event.key === "ArrowRight";
}

function atStart(element: Element) {
    const firstText = getFirstText(element);
    return getCursorPositionFrom(firstText, 0, firstText, 0);
}

function atEnd(element: Element) {
    const lastText = getLastText(element);
    const offset = lastText.textContent.length;
    return getCursorPositionFrom(lastText, offset, lastText, offset);
}
