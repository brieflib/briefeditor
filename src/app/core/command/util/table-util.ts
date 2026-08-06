import {CursorPosition} from "@/core/shared/type/cursor-position";
import {atEnd, atStart, getFirstCell} from "@/core/cursor/util/cursor-util";
import {isCursorAtEndOfBlock, isCursorAtStartOfBlock} from "@/core/cursor/cursor";
import {getFirstSelectedRoot} from "@/core/selection/selection";
import {Display, isSchemaContain} from "@/core/normalize/type/schema";
import {appendBeforeAndDelete, getFirstListWrapper, getListsOrderNumbers} from "@/core/list/util/list-util";
import {convertList, normalizeLists, parseList} from "@/core/list/type/list-class";
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

// The first row is a header, the way every table in the editor is built. A cell holds a br and nothing
// else: an empty cell has no leaf node of its own and the next normalize pass would drop it.
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

// A table is not a first level element and cannot be nested in one, so it never goes at the cursor
// itself. It goes before or after the first level element holding the cursor, and only a cursor in the
// middle of one splits it in two for the table to sit between the halves.
export function insertTable(contentEditable: HTMLElement, cursorPosition: CursorPosition, rows: number, columns: number): CursorPosition {
    const root = getFirstSelectedRoot(contentEditable, cursorPosition);
    const isAtStart = isCursorAtStartOfBlock(contentEditable, cursorPosition);
    const isAtEnd = isCursorAtEndOfBlock(contentEditable, cursorPosition);
    const table = createTable(rows, columns);

    if (isSchemaContain(getFirstListWrapper(root), [Display.ListWrapper])) {
        insertTableIntoList(contentEditable, root, cursorPosition, table, isAtStart, isAtEnd);
    } else if (isAtStart) {
        root.before(table);
    } else {
        // The split leaves the second half right after the root, so the table still goes after the root
        // to end up between the two halves.
        if (!isAtEnd) {
            newLine(contentEditable, cursorPosition);
        }
        root.after(table);
    }

    return getCellCursorPosition(getFirstCell(table), cursorPosition);
}

// A list wrapper holds nothing but its items, so the table cannot be placed inside one. The list is
// parsed into its items instead, and the two sides of the cursor are converted back into a list of their
// own, with the table between them. Both sides are normalized first, which rebases the nesting of a side
// that starts inside a nested list and drops the item left empty by the split.
function insertTableIntoList(contentEditable: HTMLElement, root: HTMLElement, cursorPosition: CursorPosition,
                             table: HTMLTableElement, isAtStart: boolean, isAtEnd: boolean) {
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

    const lists = parseList(root);
    const fragment = new DocumentFragment();
    fragment.append(convertList(normalizeLists(lists.slice(0, splitIndex), cursorPosition).lists));
    fragment.append(table);
    fragment.append(convertList(normalizeLists(lists.slice(splitIndex), cursorPosition).lists));

    appendBeforeAndDelete(root, fragment);
}

function appendRow(section: HTMLTableSectionElement, columns: number, cellName: string) {
    const row = section.insertRow();
    for (let column = 0; column < columns; column++) {
        const cell = document.createElement(cellName);
        cell.appendChild(document.createElement("br"));
        row.appendChild(cell);
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
