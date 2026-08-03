import {CursorPosition} from "@/core/shared/type/cursor-position";
import {atEnd, atStart} from "@/core/cursor/util/cursor-util";

// The row and the column behind the deleted one slide into its place, so the cursor stays where the
// deleted cell was. Deleting the last row or column leaves nothing to slide in, and the cursor keeps to
// the new last one instead.
export function getCell(table: HTMLTableElement, rowIndex: number, columnIndex: number) {
    const row = table.rows[Math.min(rowIndex, table.rows.length - 1)];

    return row?.cells[Math.min(columnIndex, row.cells.length - 1)] ?? null;
}

export function getCellCursorPosition(cell: HTMLTableCellElement | undefined | null, cursorPosition: CursorPosition): CursorPosition {
    return cell ? atStart(cell) : cursorPosition;
}

export function isTableEmpty(table: HTMLTableElement) {
    return !table.querySelector("th, td");
}

// A table with no cells left has nothing to edit, so the last delete takes the table with it. No cell is
// left for the cursor then, and it falls back to the end of the block before the table, the way deleting
// any other block carries it backwards, and to the one after it only when the table opened the editor.
export function removeTable(table: HTMLTableElement, cursorPosition: CursorPosition): CursorPosition {
    const previous = table.previousElementSibling;
    const next = table.nextElementSibling;
    table.remove();

    if (previous) {
        return atEnd(previous);
    }

    return next ? atStart(next) : cursorPosition;
}
