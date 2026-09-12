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
import {changeListWrapper, minusIndent, plusIndent} from "@/core/list/list";
import {ensureParagraph, getElementByTagName, insertBetweenBlocks} from "@/core/shared/element-util";
import {
    cloneRange,
    CursorPosition,
    getCursorPosition, getCursorPositionFrom,
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
import {
    getCursorAnchor,
    isCursorInTable,
    restoreCursorPosition
} from "@/core/cursor/util/cursor-util";

/**
 * Applies an editor command and returns the resulting cursor position, wrapping the work
 * in `CommandEvent.Start`/`End` so history can record it as a single undo step.
 */
export default function execCommand(contentEditable: HTMLElement, command: Command): CursorPosition {
    contentEditable.dispatchEvent(new CustomEvent(CommandEvent.Start));
    let cursorPosition = getCursorPosition();

    // A click is the one command the browser places itself, only once the event is over, so
    // writing this cursor back now would just hand back the old selection. The exception is a
    // click dropping a carrier: it rebuilds the block itself and suppresses the browser's
    // placement, so it must name the cursor in the rebuilt block on its own. Read before the
    // carrier is dropped.
    const isCursorPlacedByBrowser = command.action === Action.Click && !Carrier.isCarrierExist();

    // Read before anything moves: every command below rebuilds the blocks it touches, so the
    // cursor is anchored as a text offset (which the rebuild can't invalidate) rather than a
    // node pair.
    const cursorAnchor = getCursorAnchor(contentEditable, cursorPosition);

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
        case Action.Unwrap:
            cursorPosition = applyUnwrapCommand(contentEditable, command);
            break;
        case Action.FirstLevel:
            cursorPosition = applyFirstLevelCommand(contentEditable, command);
            break;
        case Action.List:
            cursorPosition = applyListCommand(contentEditable, command);
            break;
        case Action.PlusIndent:
            cursorPosition = plusIndent(contentEditable);
            break;
        case Action.MinusIndent:
            cursorPosition = minusIndent(contentEditable);
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

    // Restore from the anchor rather than the nodes the command carried through the rebuild:
    // a node surviving a write is no proof its offset still means what it did, since a text
    // leaf can keep its identity while the text around it moves into other nodes.
    if (isCursorRestorable(command)) {
        cursorPosition = restoreCursorPosition(contentEditable, cursorAnchor, cursorPosition);
    }

    // Runs after every command, so the editor is guaranteed a paragraph however the last block left it.
    cursorPosition = ensureParagraph(contentEditable, cursorPosition);

    if (!isCursorPlacedByBrowser) {
        setCursorPosition(contentEditable, cursorPosition, command);
        // Toolbar commands take focus away from the editor, so it must be reclaimed; the
        // cursor above already settles where it belongs on screen.
        contentEditable.focus({preventScroll: true});
    }
    contentEditable.dispatchEvent(new CustomEvent(CommandEvent.End));
    return cursorPosition;
}

/**
 * Whether the cursor anchor read before the command can be restored afterward. False for
 * commands that place the cursor themselves: table edits (which name a cell directly - an
 * inserted row/column has no text for an offset to find), image insertion (happens later,
 * once the file is read), clicks (placed by the browser), and Enter (splits a line without
 * writing text, so the old offset no longer points to the right place).
 */
function isCursorRestorable(command: Command) {
    switch (command.action) {
        case Action.Click:
        case Action.Image:
        case Action.InsertTable:
        case Action.InsertRow:
        case Action.InsertColumn:
        case Action.DeleteRow:
        case Action.DeleteColumn:
            return false;
        case Action.Keyboard:
            return (command.event as KeyboardEvent).key !== "Enter";
        default:
            return true;
    }
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
            const paragraph = document.createElement("p");
            paragraph.appendChild(img);

            // Re-read the cursor once the file has loaded: if it has since moved into a
            // table, refuse the image there too, since a cell has no line to give it.
            const cursorPosition = getCursorPosition();
            if (isRangeIn(contentEditable, cursorPosition) && !isCursorInTable(contentEditable, cursorPosition)) {
                // The file loads after the command that asked for it ends, so this needs
                // its own recording window - otherwise history never sees the image.
                contentEditable.dispatchEvent(new CustomEvent(CommandEvent.Start));
                const root = getFirstSelectedRoot(contentEditable, cursorPosition);
                insertBetweenBlocks(contentEditable, root, cursorPosition, paragraph);
                // An empty block is replaced rather than kept beside the image; move the
                // cursor to the end of the line, past the image, where typing continues.
                setCursorPosition(contentEditable, cursorPosition.startContainer.isConnected
                    ? cursorPosition
                    : getCursorPositionFrom(paragraph, paragraph.childNodes.length,
                        paragraph, paragraph.childNodes.length));
                contentEditable.dispatchEvent(new CustomEvent(CommandEvent.End));
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

function applyUnwrapCommand(contentEditable: HTMLElement, command: Command): CursorPosition {
    const tagName = (command.tag as string).toUpperCase();

    return tag(contentEditable, tagName, Action.Unwrap, command.attributes);
}

function applyFirstLevelCommand(contentEditable: HTMLElement, command: Command): CursorPosition {
    const tagName = (command.tag as string).toUpperCase();
    if (!getSelectedSharedTags(contentEditable).includes(tagName)) {
        return changeBlock(contentEditable, [tagName]);
    }

    const blockElements = getSelectedBlock(contentEditable);
    const isParagraph = isElementsEqualToTags(blockElements, [tagName]);
    let tags = [tagName];
    if (isParagraph) {
        tags = ["P"];
    }

    return changeBlock(contentEditable, tags);
}

function applyListCommand(contentEditable: HTMLElement, command: Command): CursorPosition {
    const tagName = (command.tag as string).toUpperCase();
    // The selection already stands in a list and is asked for the other type, which is a change to the
    // list itself rather than to the blocks the selection holds.
    if (isListWrapper(contentEditable) && !getSelectedSharedTags(contentEditable).includes(tagName)) {
        return changeListWrapper(contentEditable, tagName);
    }

    const blockElements = getSelectedBlock(contentEditable);
    let tags = [tagName, "LI"];
    const isParagraph = isElementsEqualToTags(blockElements, tags);
    if (isParagraph) {
        tags = ["P"];
    }

    return changeBlock(contentEditable, tags);
}

/**
 * Removes an active carrier, if any, collapsing its root back into a rebuilt clone and
 * remapping `cursorPosition` onto the rebuilt nodes (otherwise it would point at a text node
 * the collapse discarded). The click's default action is suppressed too, since by then its
 * target is detached and the browser would otherwise follow the clicked link instead.
 */
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

/**
 * Inserts a table at `cursorPosition` (the position the editor was left with, since the
 * size picker takes focus away). Dropped if the cursor is already inside a cell - a table
 * can't nest there.
 */
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

/**
 * Inserts a row next to `command.table`'s cell. Table edits come from margin controls that
 * take focus away, leaving a cursor pointing into a row/column about to change, so this
 * (and the other table-edit commands below) names the cell the cursor should end up in and
 * leaves the caller to restore it there.
 */
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