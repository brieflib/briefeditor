import {
    atEnd,
    atStart,
    getStrandedTable,
    getFirstCell,
    getLastCell,
    getSiblingTarget,
    isCursorAtEndOfCell,
    isCursorAtStartOfCell,
    getCursorCell
} from "@/core/cursor/util/cursor-util";
import {BlockCursor} from "@/core/cursor/util/block-cursor";
import {getRootElement} from "@/core/shared/element-util";
import {Display, isSchemaContain} from "@/core/normalize/type/schema";
import {CursorPosition} from "@/core/shared/type/cursor-position";

/**
 * Keeps the cursor out of the empty slot Chrome parks it in before or after a table - a
 * place outside any first-level block where typing would produce bare text.
 *
 * @remarks
 * Only three actions lead there: a horizontal move out of an edge cell, a horizontal move
 * into a neighbouring table, and a click in the table's margin.
 */
export class TableCursor extends BlockCursor {
    protected readonly keys = ["ArrowLeft", "ArrowRight"];

    /** A click in the table's dead slot goes into the nearest edge cell. */
    protected getClickTarget(event: MouseEvent, cursorPosition: CursorPosition): CursorPosition | null {
        const stranded = getStrandedTable(cursorPosition);
        if (!stranded) {
            return null;
        }

        // A pointer carries no direction, so a click next to the table moves into its nearest edge cell.
        const cell = stranded.isBefore ? getFirstCell(stranded.table) : getLastCell(stranded.table);
        if (!cell) {
            return null;
        }

        return stranded.isBefore ? atStart(cell) : atEnd(cell);
    }

    /**
     * Both a move out of an edge cell and a move into the table from a neighbouring block land
     * in the slot, so the browser's own move is unwanted at either edge.
     */
    protected getEnteredBlock(key: string, cursorPosition: CursorPosition, isBefore: boolean): HTMLElement | null {
        return this.getEscapedTable(cursorPosition, isBefore) ?? this.getEnteredTable(cursorPosition, isBefore);
    }

    /** Leaving the table lands on the block beside it; entering one lands in its edge cell. */
    protected getMoveTarget(table: HTMLElement, cursorPosition: CursorPosition, isBefore: boolean): CursorPosition | null {
        if (table.contains(cursorPosition.startContainer)) {
            return getSiblingTarget(table, isBefore);
        }

        const cell = isBefore ? getLastCell(table as HTMLTableElement) : getFirstCell(table as HTMLTableElement);
        if (!cell) {
            return null;
        }

        return isBefore ? atEnd(cell) : atStart(cell);
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

    /** The neighbouring table the cursor is about to be carried into. */
    private getEnteredTable(cursorPosition: CursorPosition, isBefore: boolean) {
        const neighbour = this.getNeighbour(cursorPosition, isBefore);
        if (!neighbour || isSchemaContain(neighbour.root, [Display.Table]) ||
            !isSchemaContain(neighbour.sibling, [Display.Table])) {
            return null;
        }

        return this.isAtRootEdge(neighbour.root, cursorPosition, isBefore) ? neighbour.sibling as HTMLElement : null;
    }
}
