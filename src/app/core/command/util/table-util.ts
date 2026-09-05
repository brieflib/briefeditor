import {CursorPosition} from "@/core/shared/type/cursor-position";
import {atEnd, atStart, getFirstCell} from "@/core/cursor/util/cursor-util";
import {isCursorAtEndOfBlock, isCursorAtStartOfBlock} from "@/core/cursor/cursor";
import {getFirstSelectedRoot} from "@/core/selection/selection";
import {Display, isSchemaContain} from "@/core/normalize/type/schema";
import {getFirstListWrapper, getListsOrderNumbers} from "@/core/list/util/list-util";
import {splitListAround} from "@/core/list/list";
import {newLine} from "@/core/keyboard/util/keyboard-util";

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

// The first row is a header, the way every table in the editor is built. The cells are left empty: a
// cursor takes the cell itself when it holds nothing, so there is no br to stand in for the content.
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

// Every table in the editor opens with a header row, so one arriving without a thead - built from cells
// copied out of a body, or written by another app - is given an empty header of its own. Cells copied out
// of a header bring their section along and keep the header they already have. A row the copy left short
// is filled up to the width of the table, which the column commands read off the cell indexes.
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

// A table is not a first level element and cannot be nested in one, so it never goes at the cursor
// itself. It goes before or after the first level element holding the cursor, and only a cursor in the
// middle of one splits it in two for the node to sit between the halves. Both flags are read from the
// cursor before anything moves, so they must be the first thing done.
export function insertBetweenBlocks(contentEditable: HTMLElement, root: HTMLElement, cursorPosition: CursorPosition, node: Node) {
    const isAtStart = isCursorAtStartOfBlock(contentEditable, cursorPosition);
    const isAtEnd = isCursorAtEndOfBlock(contentEditable, cursorPosition);

    if (isSchemaContain(getFirstListWrapper(root), [Display.ListWrapper])) {
        insertIntoList(contentEditable, root, cursorPosition, node, isAtStart, isAtEnd);
    } else if (isAtStart) {
        root.before(node);
    } else {
        // The split leaves the second half right after the root, so the node still goes after the root
        // to end up between the two halves.
        if (!isAtEnd) {
            newLine(contentEditable, cursorPosition);
        }
        root.after(node);
    }
}

function insertIntoList(contentEditable: HTMLElement, root: HTMLElement, cursorPosition: CursorPosition,
                        node: Node, isAtStart: boolean, isAtEnd: boolean) {
    // Read before the split: it inserts the second half after the item the cursor is in, which leaves
    // that item's own position untouched but carries the cursor over to the new one.
    const index = getListsOrderNumbers(contentEditable, cursorPosition)[0] ?? 0;
    let splitIndex = index;
    if (!isAtStart) {
        if (!isAtEnd) {
            newLine(contentEditable, cursorPosition);
        }
        splitIndex = index + 1;
    }

    splitListAround(root, cursorPosition, node, splitIndex);
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
