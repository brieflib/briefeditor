import {Action, Command} from "@/core/command/type/command";
import {applyAttributes, isElementsEqualToTags, removeBlock, tag} from "@/core/command/util/command-util";
import {
    getFirstSelectedRoot, getListWrappers,
    getSelectedBlock,
    getSelectedBlocks,
    getSelectedLink,
    getSelectedSharedTags,
    selectElement
} from "@/core/selection/selection";
import {minusIndent, plusIndent} from "@/core/list/list";
import {
    createImageBlock,
    getElementByTagName,
    getRootElement,
    insertBetweenBlocks,
    isImageBlock
} from "@/core/shared/element-util";
import {
    CursorPosition,
    getCursorPosition,
    isCollapsed,
    isRangeIn,
    scrollToViewport,
    setCursorPosition
} from "@/core/shared/type/cursor-position";
import {Display, isSchemaContain} from "@/core/normalize/type/schema";
import {CommandEvent} from "@/core/history/type/history-event";
import {handleKeyboardEvent} from "@/core/keyboard/keyboard";
import {handleClipboardEvent, handleCutEvent} from "@/core/clipboard/clipboard";
import {Carrier} from "@/core/carrier/carrier";
import {Normalizer} from "@/core/normalize/normalize";
import {getCell, getCellCursorPosition, insertTable, isTableEmpty} from "@/core/command/util/table-util";
import {
    atStart,
    escapeImageBlock,
    getCursorAnchor,
    isCursorInTable,
    resolveCursorAnchor
} from "@/core/cursor/util/cursor-util";

/**
 * Applies an editor command and returns the resulting cursor position, wrapping the work
 * in `CommandEvent.HistoryStart`/`HistoryEnd` so history can record it as a single undo step.
 */
export default function execCommand(contentEditable: HTMLElement, command: Command): CursorPosition {
    contentEditable.dispatchEvent(new CustomEvent(CommandEvent.HistoryStart));
    const cursorAnchor = getCursorAnchor(contentEditable);

    switch (command.action)  {
        case Action.Attribute:
            applyAttributesCommand(contentEditable, command);
            break;
        case Action.Image:
            applyImageCommand(contentEditable, command);
            break;
        case Action.Link:
            applyLinkCommand(contentEditable, command);
            break;
        case Action.Tag:
            applyTagCommand(contentEditable, command);
            getCursorPosition();
            break;
        case Action.Unwrap:
            applyUnwrapCommand(contentEditable, command);
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
            if (command.event instanceof KeyboardEvent) {
                handleKeyboardEvent(contentEditable, command.event as KeyboardEvent);
                Carrier.getInstance().removeCarrier();
            }
            break;
        case Action.Clipboard:
            handleClipboardEvent(contentEditable, command.event as ClipboardEvent);
            break;
        case Action.Cut:
            handleCutEvent(contentEditable, command.event as ClipboardEvent);
            break;
        case Action.InsertTable:
            applyInsertTableCommand(contentEditable, command);
            break;
        case Action.InsertRow:
            applyInsertRowCommand(command);
            break;
        case Action.InsertColumn:
            applyInsertColumnCommand(command);
            break;
        case Action.DeleteRow:
            applyDeleteRowCommand(contentEditable, command);
            break;
        case Action.DeleteColumn:
            applyDeleteColumnCommand(contentEditable, command);
            break;
        case Action.DeleteImage:
            applyDeleteImageCommand(contentEditable, command);
            break;
        case Action.ModifyClass:
            applyModifyClassCommand(contentEditable, command);
            break;
        case Action.Click:
            if (command.event instanceof MouseEvent) {
                Carrier.getInstance().removeCarrier(command.event);
            }
            break;
    }

    let cursorPosition = getCursorPosition();
    if (isCursorRestorable(command)) {
        cursorPosition = resolveCursorAnchor(contentEditable, cursorAnchor);
        setCursorPosition(cursorPosition);
    }

    scrollToViewport(cursorPosition);
    contentEditable.dispatchEvent(new CustomEvent(CommandEvent.HistoryEnd));
    return cursorPosition;
}

/**
 * Whether the cursor anchor read before the command can be restored afterward. False for
 * commands that place the cursor themselves: table edits (which name a cell directly - an
 * inserted row/column has no text for an offset to find), image insertion (happens later,
 * once the file is read), clicks (placed by the browser), Enter (splits a line without
 * writing text, so the old offset no longer points to the right place) and a collapsed
 * Delete (removes the text after the caret, which the anchor would read as text before it).
 */
function isCursorRestorable(command: Command) {
    if (isTypedOutside(command)) {
        return false;
    }

    switch (command.action) {
        case Action.Click:
        case Action.Image:
        case Action.Clipboard:
        case Action.InsertTable:
        case Action.InsertRow:
        case Action.InsertColumn:
        case Action.DeleteRow:
        case Action.DeleteColumn:
        case Action.DeleteImage:
        case Action.ModifyClass:
            return false;
        case Action.Keyboard: {
            if (command.event instanceof KeyboardEvent) {
                const key = command.event.key;
                return key !== "Enter" && key !== "Delete";
            }
            return false;
        }
        default:
            return true;
    }
}

/** Whether the command writes an attribute named from outside the editor, so the cursor is not in it. */
function isTypedOutside(command: Command) {
    return command.action === Action.Attribute && !!command.element;
}

/** Writes the attributes on the command's element - which has to stand in the editor - or, without one, on the selected element of the command's tag. */
function applyAttributesCommand(contentEditable: HTMLElement, command: Command) {
    const target = command.element
        ? (contentEditable.contains(command.element) ? command.element : null)
        : getElementByTagName(contentEditable, (command.tag as string).toUpperCase());
    if (target) {
        applyAttributes(target as HTMLElement, command.attributes);
    }
}

function applyImageCommand(contentEditable: HTMLElement, command: Command, ) {
    const image = command.attributes?.image;

    if (image) {
        const reader = new FileReader();

        reader.onload = (event) => {
            const img = document.createElement("img");
            img.src = event.target?.result as string;
            const paragraph = createImageBlock(img);

            // Re-read the cursor once the file has loaded: if it has since moved into a
            // table, refuse the image there too, since a cell has no line to give it.
            const cursorPosition = getCursorPosition();
            if (isRangeIn(contentEditable, cursorPosition) && !isCursorInTable(contentEditable, cursorPosition)) {
                // The file loads after the command that asked for it ends, so this needs
                // its own recording window - otherwise history never sees the image.
                contentEditable.dispatchEvent(new CustomEvent(CommandEvent.HistoryStart));
                const root = getFirstSelectedRoot(contentEditable, cursorPosition);
                insertBetweenBlocks(contentEditable, root, cursorPosition, paragraph);
                // The cursor never rests in the image block: it goes to the line after it,
                // which is opened for it when the image closes the document.
                setCursorPosition(escapeImageBlock(contentEditable, atStart(paragraph)));
                contentEditable.dispatchEvent(new CustomEvent(CommandEvent.HistoryEnd));
            }
        };

        reader.readAsDataURL(image);
    }
}

function applyLinkCommand(contentEditable: HTMLElement, command: Command) {
    const tagName = (command.tag as string).toUpperCase();
    const sharedTags: string[] = getSelectedSharedTags(contentEditable);
    const href = command.attributes?.href;
    const cursorPosition = getCursorPosition();
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
            tag(contentEditable, tagName, Action.Unwrap, cursorPosition, command.attributes);
        }
    }

    if (!href && !collapsed && isLinkSelected) {
        tag(contentEditable, tagName, Action.Unwrap, cursorPosition, command.attributes);
    }

    if (href && !collapsed && !isLinkSelected) {
        tag(contentEditable, tagName, Action.Wrap, cursorPosition, command.attributes);
    }

    return cursorPosition;
}

function applyTagCommand(contentEditable: HTMLElement, command: Command): CursorPosition {
    const tagName = (command.tag as string).toUpperCase();
    const sharedTags: string[] = getSelectedSharedTags(contentEditable);
    const cursorPosition = getCursorPosition();
    if (sharedTags.includes(tagName)) {
        return tag(contentEditable, tagName, Action.Unwrap, cursorPosition, command.attributes);
    } else {
        return tag(contentEditable, tagName, Action.Wrap, cursorPosition, command.attributes);
    }
}

function applyUnwrapCommand(contentEditable: HTMLElement, command: Command): CursorPosition {
    const tagName = (command.tag as string).toUpperCase();
    const cursorPosition = getCursorPosition();
    return tag(contentEditable, tagName, Action.Unwrap, cursorPosition, command.attributes);
}

function applyFirstLevelCommand(contentEditable: HTMLElement, command: Command) {
    const tagName = (command.tag as string).toUpperCase();
    // if (!getSelectedSharedTags(contentEditable).includes(tagName)) {
    //     changeBlock(contentEditable, [tagName]);
    // }

    const blockElements = getSelectedBlocks(contentEditable);
    let tags = [tagName];
    const isParagraph = isElementsEqualToTags(blockElements, tags);
    if (isParagraph) {
        tags = ["P"];
    }

    const normalizer = new Normalizer(contentEditable);
    normalizer.replaceBlockTags(tags);
}

function applyListCommand(contentEditable: HTMLElement, command: Command) {
    const tagName = (command.tag as string).toUpperCase();
    // The selection already stands in a list and is asked for the other type, which is a change to the
    // list itself rather than to the blocks the selection holds.
    // if (!getSelectedSharedTags(contentEditable).includes(tagName)) {
    //     return changeListWrapper(contentEditable, tagName);
    // }

    const blockElements = getListWrappers(contentEditable);
    let tags = [tagName, "LI"];
    const isParagraph = isElementsEqualToTags(blockElements, tags);
    if (isParagraph) {
        tags = ["P"];
    }

    const normalizer = new Normalizer(contentEditable);
    normalizer.replaceBlockTags(tags);
}

/**
 * Inserts a table at `cursorPosition` (the position the editor was left with, since the
 * size picker takes focus away). Dropped if the cursor is already inside a cell - a table
 * can't nest there.
 */
function applyInsertTableCommand(contentEditable: HTMLElement, command: Command, cursorPosition = getCursorPosition()): CursorPosition {
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
function applyInsertRowCommand(command: Command, cursorPosition = getCursorPosition()): CursorPosition {
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

function applyInsertColumnCommand(command: Command, cursorPosition = getCursorPosition()): CursorPosition {
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

function applyDeleteRowCommand(contentEditable: HTMLElement, command: Command, cursorPosition = getCursorPosition()): CursorPosition {
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
        return removeBlock(contentEditable, table, cursorPosition);
    }

    return getCellCursorPosition(getCell(table, rowIndex, columnIndex), cursorPosition);
}

function applyDeleteColumnCommand(contentEditable: HTMLElement, command: Command, cursorPosition = getCursorPosition()): CursorPosition {
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
        return removeBlock(contentEditable, table, cursorPosition);
    }

    return getCellCursorPosition(getCell(table, rowIndex, columnIndex), cursorPosition);
}

/** Removes the image block the command's image stands in; anything else is left as it is. */
function applyDeleteImageCommand(contentEditable: HTMLElement, command: Command, cursorPosition = getCursorPosition()): CursorPosition {
    const image = command.image;
    if (!image || !contentEditable.contains(image)) {
        return cursorPosition;
    }

    const block = getRootElement(contentEditable, image);
    if (!isImageBlock(block)) {
        return cursorPosition;
    }

    return removeBlock(contentEditable, block, cursorPosition);
}

/** Removes, adds and toggles the command's classes on its element, which has to stand in the editor. */
function applyModifyClassCommand(contentEditable: HTMLElement, command: Command) {
    const element = command.element;
    const classes = command.classes;
    if (!element || !classes || !contentEditable.contains(element)) {
        return;
    }

    element.classList.remove(...classes.remove ?? []);
    element.classList.add(...classes.add ?? []);
    for (const name of classes.toggle ?? []) {
        element.classList.toggle(name);
    }
}
