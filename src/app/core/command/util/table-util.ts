import {CursorPosition} from "@/core/shared/type/cursor-position";
import {atEnd, atStart, getFirstCell} from "@/core/cursor/util/cursor-util";
import {getFirstSelectedRoot} from "@/core/selection/selection";
import {insertBetweenBlocks} from "@/core/shared/element-util";

/**
 * The cell at `rowIndex`/`columnIndex`, clamped to the table's bounds. Clamping is what lets
 * the cursor land on the row/column that slides into a deleted one's place, or the new last
 * one when the deleted row/column was the last.
 */
export function getCell(table: HTMLTableElement, rowIndex: number, columnIndex: number) {
    const row = table.rows[Math.min(rowIndex, table.rows.length - 1)];

    return row?.cells[Math.min(columnIndex, row.cells.length - 1)] ?? null;
}

export function getCellCursorPosition(cell: HTMLTableCellElement | undefined | null, cursorPosition: CursorPosition): CursorPosition {
    return cell ? atStart(cell) : cursorPosition;
}

/**
 * Builds a table with a header row (every table in the editor opens with one). Cells are
 * left empty rather than given a placeholder br, since an empty cell already takes the cursor.
 */
export function createTable(rows: number, columns: number) {
    const table = document.createElement("table");
    appendRow(table.createTHead(), columns, "th");

    if (rows > 1) {
        const body = table.createTBody();
        for (let row = 1; row < rows; row++) {
            appendRow(body, columns, "td");
        }
    }

    return table;
}

/**
 * Brings a pasted table in line with the editor's shape: gives it an empty header row if it
 * arrived without one (e.g. copied from a body, or from another app), and pads every row out
 * to the table's full width, since the column commands read off cell indexes.
 */
export function normalizeTable(table: HTMLTableElement) {
    const columns = getColumnCount(table);

    if (!table.tHead) {
        appendRow(table.createTHead(), columns, "th");
    }

    for (const row of Array.from(table.rows)) {
        const cellName = row.parentElement === table.tHead ? "th" : "td";
        for (let column = row.cells.length; column < columns; column++) {
            row.appendChild(document.createElement(cellName));
        }
    }
}

function getColumnCount(table: HTMLTableElement) {
    return Array.from(table.rows).reduce((widest, row) => Math.max(widest, row.cells.length), 0);
}

export function insertTable(contentEditable: HTMLElement, cursorPosition: CursorPosition, rows: number, columns: number): CursorPosition {
    const root = getFirstSelectedRoot(contentEditable, cursorPosition);
    const table = createTable(rows, columns);
    insertBetweenBlocks(contentEditable, root, cursorPosition, table);

    return getCellCursorPosition(getFirstCell(table), cursorPosition);
}

function appendRow(section: HTMLTableSectionElement, columns: number, cellName: string) {
    const row = section.insertRow();
    for (let column = 0; column < columns; column++) {
        row.appendChild(document.createElement(cellName));
    }
}

export function isTableEmpty(table: HTMLTableElement) {
    return !table.querySelector("th, td");
}

/**
 * Removes a table left with no cells and returns the cursor position to fall back to: the
 * end of the block before it (as removing any block does), or the start of the block after
 * it only when the table opened the editor.
 */
export function removeTable(table: HTMLTableElement, cursorPosition: CursorPosition): CursorPosition {
    const previous = table.previousElementSibling;
    const next = table.nextElementSibling;
    table.remove();

    if (previous) {
        return atEnd(previous);
    }

    return next ? atStart(next) : cursorPosition;
}
