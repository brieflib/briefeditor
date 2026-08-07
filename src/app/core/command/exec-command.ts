import {Action, Command} from "@/core/command/type/command";
import {
    applyAttributes,
    changeBlock,
    isElementsEqualToTags,
    isListWrapper,
    tag
} from "@/core/command/util/command-util";
import {
    getFirstSelectedRoot,
    getSelectedBlock,
    getSelectedLink,
    getSelectedSharedTags,
    selectElement
} from "@/core/selection/selection";
import {minusIndent, plusIndent} from "@/core/list/list";
import {getElementByTagName} from "@/core/shared/element-util";
import {
    cloneRange,
    CursorPosition,
    getCursorPosition, getCursorPositionFrom, insertNode,
    isCollapsed,
    isRangeIn,
    setCursorPosition
} from "@/core/shared/type/cursor-position";
import {Display, isSchemaContain} from "@/core/normalize/type/schema";
import {CommandEvent} from "@/core/history/type/history-event";
import {handleKeyboardEvent} from "@/core/keyboard/keyboard";
import {handleClipboardEvent, handleCutEvent} from "@/core/clipboard/clipboard";
import {Carrier} from "@/core/carrier/carrier";
import {removeAndNormalize} from "@/core/normalize/normalize";
import {getCell, getCellCursorPosition, insertTable, isTableEmpty, removeTable} from "@/core/command/util/table-util";

export default function execCommand(contentEditable: HTMLElement, command: Command): CursorPosition {
    contentEditable.dispatchEvent(new CustomEvent(CommandEvent.Start));
    let cursorPosition = getCursorPosition();

    // A click is the one command whose cursor the editor does not own. The browser places it only once the
    // event is over, and a click that drops a selection places it nowhere until then, so the cursor this
    // command starts from is still the whole selection. Writing that back hands the selection straight back
    // and the click never clears it. The one click that does own its cursor is the one dropping a carrier: it
    // rebuilds the block the browser was aiming at and suppresses the click's default action along with the
    // placement, so it has to name the spot in the rebuilt block itself. Read before the carrier is dropped.
    const isCursorPlacedByBrowser = command.action === Action.Click && !Carrier.isCarrierExist();

    switch (command.action)  {
        case Action.Attribute:
            applyAttributesCommand(contentEditable, command);
            break;
        case Action.Image:
            applyImageCommand(contentEditable, command);
            break;
        case Action.Link:
            cursorPosition = applyLinkCommand(contentEditable, command);
            break;
        case Action.Tag:
            cursorPosition = applyTagCommand(contentEditable, command);
            break;
        case Action.FirstLevel:
            applyFirstLevelCommand(contentEditable, command);
            break;
        case Action.List:
            applyListCommand(contentEditable, command);
            break;
        case Action.PlusIndent:
            plusIndent(contentEditable);
            break;
        case Action.MinusIndent:
            minusIndent(contentEditable);
            break;
        case Action.Keyboard:
            cursorPosition = handleKeyboardEvent(contentEditable, command.event as KeyboardEvent, cursorPosition);
            cursorPosition = removeCarrier(contentEditable, cursorPosition);
            break;
        case Action.Clipboard:
            cursorPosition = handleClipboardEvent(contentEditable, command.event as ClipboardEvent);
            break;
        case Action.Cut:
            cursorPosition = handleCutEvent(contentEditable, command.event as ClipboardEvent);
            break;
        case Action.InsertTable:
            cursorPosition = applyInsertTableCommand(contentEditable, command, cursorPosition);
            break;
        case Action.InsertRow:
            cursorPosition = applyInsertRowCommand(command, cursorPosition);
            break;
        case Action.InsertColumn:
            cursorPosition = applyInsertColumnCommand(command, cursorPosition);
            break;
        case Action.DeleteRow:
            cursorPosition = applyDeleteRowCommand(command, cursorPosition);
            break;
        case Action.DeleteColumn:
            cursorPosition = applyDeleteColumnCommand(command, cursorPosition);
            break;
        case Action.Click:
            cursorPosition = removeCarrier(contentEditable, cursorPosition, command.event as MouseEvent);
            break;
    }

    if (command.action !== Action.Attribute && command.tag) {
        applyAttributesCommand(contentEditable, command);
    }

    if (!isCursorPlacedByBrowser) {
        setCursorPosition(contentEditable, cursorPosition, command);
        contentEditable.focus();
    }
    contentEditable.dispatchEvent(new CustomEvent(CommandEvent.End));
    return cursorPosition;
}

function applyAttributesCommand(contentEditable: HTMLElement, command: Command) {
    const tagName = (command.tag as string).toUpperCase();
    const target = getElementByTagName(contentEditable, tagName);
    if (target) {
        applyAttributes(target as HTMLElement, command.attributes);
    }
}

function applyImageCommand(contentEditable: HTMLElement, command: Command, ) {
    const image = command.attributes?.image;

    if (image) {
        const reader = new FileReader();

        reader.onload = (event) => {
            const imgTag = "img";
            const img = document.createElement(imgTag);
            img.src = event.target?.result as string;

            const cursorPosition = getCursorPosition();
            if (isRangeIn(contentEditable, cursorPosition)) {
                insertNode(cursorPosition, img);
                setCursorPosition(contentEditable, cursorPosition);
            }
        };

        reader.readAsDataURL(image);
    }
}

function applyLinkCommand(contentEditable: HTMLElement, command: Command) {
    const tagName = (command.tag as string).toUpperCase();
    const sharedTags: string[] = getSelectedSharedTags(contentEditable);
    const href = command.attributes?.href;
    let cursorPosition = getCursorPosition();
    const collapsed = isCollapsed(cursorPosition);
    const isLinkSelected = sharedTags.includes(tagName);

    if (href && collapsed && isLinkSelected) {
        const link = getSelectedLink(contentEditable, cursorPosition)[0];
        if (link) {
            link.setAttribute("href", href);
        }
    }

    if (!href && collapsed && isLinkSelected) {
        const link = getSelectedLink(contentEditable, cursorPosition)[0];
        if (link) {
            selectElement(link);
            cursorPosition = tag(contentEditable, tagName, Action.Unwrap, command.attributes);
        }
    }

    if (!href && !collapsed && isLinkSelected) {
        cursorPosition = tag(contentEditable, tagName, Action.Unwrap, command.attributes);
    }

    if (href && !collapsed && !isLinkSelected) {
        cursorPosition = tag(contentEditable, tagName, Action.Wrap, command.attributes);
    }

    return cursorPosition;
}

function applyTagCommand(contentEditable: HTMLElement, command: Command): CursorPosition {
    const tagName = (command.tag as string).toUpperCase();
    const sharedTags: string[] = getSelectedSharedTags(contentEditable);

    if (sharedTags.includes(tagName)) {
        return tag(contentEditable, tagName, Action.Unwrap, command.attributes);
    } else {
        return tag(contentEditable, tagName, Action.Wrap, command.attributes);
    }
}

function applyFirstLevelCommand(contentEditable: HTMLElement, command: Command) {
    const tagName = (command.tag as string).toUpperCase();
    if (!getSelectedSharedTags(contentEditable).includes(tagName)) {
        changeBlock(contentEditable, [tagName]);
    } else {
        const blockElements = getSelectedBlock(contentEditable);
        const isParagraph = isElementsEqualToTags(blockElements, [tagName]);
        let tags = [tagName];
        if (isParagraph) {
            tags = ["P"];
        }
        changeBlock(contentEditable, tags);
    }
}

function applyListCommand(contentEditable: HTMLElement, command: Command) {
    const tagName = (command.tag as string).toUpperCase();
    if (isListWrapper(contentEditable) && !getSelectedSharedTags(contentEditable).includes(tagName)) {
        changeBlock(contentEditable, [tagName]);
    } else {
        const blockElements = getSelectedBlock(contentEditable);
        let tags = [tagName, "LI"];
        const isParagraph = isElementsEqualToTags(blockElements, tags);
        if (isParagraph) {
            tags = ["P"];
        }
        changeBlock(contentEditable, tags);
    }
}

// Dropping the carrier collapses its root element again, which rebuilds every element under it from a clone.
// The caller's cursor position is remapped onto the rebuilt nodes, otherwise it keeps pointing at a text node
// the collapse threw away and restoring it would leave the editor without a selection. For the same reason the
// click target is detached by the time the browser applies the click's default action: it no longer sees an
// editable element and follows the clicked link instead, so that default action is suppressed as well.
function removeCarrier(contentEditable: HTMLElement, cursorPosition: CursorPosition, event?: MouseEvent): CursorPosition {
    const carrier = Carrier.getCarrier();
    if (!carrier) {
        return cursorPosition;
    }

    event?.preventDefault();
    contentEditable.dispatchEvent(new CustomEvent(CommandEvent.Carrier));
    Carrier.removeCarrier();
    const rootElement = getFirstSelectedRoot(contentEditable, getCursorPositionFrom(carrier, 0, carrier, 0));

    return removeAndNormalize(contentEditable, rootElement, [], cloneRange(cursorPosition));
}

// The size picker takes the focus out of the editor, so the cursor the table is placed at is the one the
// editor was left with. A cursor inside a cell has no first level element to place the table next to, and
// a table cannot be nested in one, so the insert is dropped instead.
function applyInsertTableCommand(contentEditable: HTMLElement, command: Command, cursorPosition: CursorPosition): CursorPosition {
    const size = command.size;
    if (!size || !isRangeIn(contentEditable, cursorPosition)) {
        return cursorPosition;
    }

    const root = getFirstSelectedRoot(contentEditable, cursorPosition);
    if (isSchemaContain(root, [Display.Table])) {
        return cursorPosition;
    }

    return insertTable(contentEditable, cursorPosition, size.rows, size.columns);
}

// A table is edited from the margin controls, which take the focus out of the editor and leave a cursor
// that points into a row or a column the edit is about to replace or throw away. Each of these commands
// therefore names the cell the cursor belongs in once it is done, and the caller restores it there.
function applyInsertRowCommand(command: Command, cursorPosition: CursorPosition): CursorPosition {
    const target = command.table;
    if (!target) {
        return cursorPosition;
    }

    const referenceRow = target.cell.parentElement as HTMLTableRowElement;
    const section = referenceRow.parentElement;
    if (!section) {
        return cursorPosition;
    }

    const columnIndex = target.cell.cellIndex;
    const isHeader = section.tagName === "THEAD";
    const newRow = document.createElement("tr");
    for (const referenceCell of referenceRow.cells) {
        const newCell = document.createElement(!isHeader && referenceCell.tagName === "TH" ? "th" : "td");
        newCell.appendChild(document.createElement("br"));
        newRow.appendChild(newCell);
    }

    if (isHeader) {
        const table = section.parentElement as HTMLTableElement;
        const body = table.tBodies[0] ??
            table.insertBefore(document.createElement("tbody"), section.nextSibling);
        body.insertBefore(newRow, body.firstChild);
    } else {
        section.insertBefore(newRow, target.after ? referenceRow.nextSibling : referenceRow);
    }

    return getCellCursorPosition(newRow.cells[columnIndex], cursorPosition);
}

function applyInsertColumnCommand(command: Command, cursorPosition: CursorPosition): CursorPosition {
    const target = command.table;
    if (!target) {
        return cursorPosition;
    }

    const table = target.cell.closest("table") as HTMLTableElement | null;
    if (!table) {
        return cursorPosition;
    }

    const referenceRow = target.cell.parentElement;
    const columnIndex = target.cell.cellIndex + (target.after ? 1 : 0);
    let insertedCell: HTMLTableCellElement | null = null;
    for (const row of table.rows) {
        const insertIndex = Math.min(columnIndex, row.cells.length);
        const reference = row.cells[insertIndex] ?? null;
        const isHeaderRow = row.cells[0]?.tagName === "TH";
        const newCell = document.createElement(isHeaderRow ? "th" : "td");
        newCell.appendChild(document.createElement("br"));
        row.insertBefore(newCell, reference);
        if (row === referenceRow) {
            insertedCell = newCell;
        }
    }

    return getCellCursorPosition(insertedCell, cursorPosition);
}

function applyDeleteRowCommand(command: Command, cursorPosition: CursorPosition): CursorPosition {
    const target = command.table;
    if (!target) {
        return cursorPosition;
    }

    const table = target.cell.closest("table") as HTMLTableElement | null;
    const row = target.cell.parentElement as HTMLTableRowElement | null;
    if (!table || !row) {
        return cursorPosition;
    }

    const rowIndex = row.rowIndex;
    const columnIndex = target.cell.cellIndex;
    const section = row.parentElement;
    row.remove();
    if (isSchemaContain(section, [Display.TableSection]) && section?.children.length === 0) {
        section.remove();
    }

    if (isTableEmpty(table)) {
        return removeTable(table, cursorPosition);
    }

    return getCellCursorPosition(getCell(table, rowIndex, columnIndex), cursorPosition);
}

function applyDeleteColumnCommand(command: Command, cursorPosition: CursorPosition): CursorPosition {
    const target = command.table;
    if (!target) {
        return cursorPosition;
    }

    const table = target.cell.closest("table") as HTMLTableElement | null;
    const row = target.cell.parentElement as HTMLTableRowElement | null;
    if (!table || !row) {
        return cursorPosition;
    }

    const rowIndex = row.rowIndex;
    const columnIndex = target.cell.cellIndex;
    for (const tableRow of table.rows) {
        tableRow.cells[columnIndex]?.remove();
    }

    if (isTableEmpty(table)) {
        return removeTable(table, cursorPosition);
    }

    return getCellCursorPosition(getCell(table, rowIndex, columnIndex), cursorPosition);
}