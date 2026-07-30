import {Action, Command} from "@/core/command/type/command";
import {
    applyAttributes,
    changeBlock,
    isElementsEqualToTags,
    isListWrapper,
    tag
} from "@/core/command/util/command-util";
import {getSelectedBlock, getSelectedLink, getSelectedSharedTags, selectElement} from "@/core/selection/selection";
import {minusIndent, plusIndent} from "@/core/list/list";
import {getElementByTagName} from "@/core/shared/element-util";
import {
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
import {normalize} from "@/core/normalize/normalize";

export default function execCommand(contentEditable: HTMLElement, command: Command): CursorPosition {
    contentEditable.dispatchEvent(new CustomEvent(CommandEvent.Start));
    let cursorPosition = getCursorPosition();

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
            removeCarrier(contentEditable);
            break;
        case Action.Clipboard:
            cursorPosition = handleClipboardEvent(contentEditable, command.event as ClipboardEvent);
            break;
        case Action.Cut:
            cursorPosition = handleCutEvent(contentEditable, command.event as ClipboardEvent);
            break;
        case Action.InsertRow:
            applyInsertRowCommand(command);
            break;
        case Action.InsertColumn:
            applyInsertColumnCommand(command);
            break;
        case Action.DeleteRow:
            applyDeleteRowCommand(command);
            break;
        case Action.DeleteColumn:
            applyDeleteColumnCommand(command);
            break;
        // case Action.Click:
        //     removeCarrier(contentEditable);
        //     break;
    }

    if (command.action !== Action.Attribute && command.tag) {
        applyAttributesCommand(contentEditable, command);
    }

    contentEditable.focus();
    setCursorPosition(contentEditable, cursorPosition);
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

function removeCarrier(contentEditable: HTMLElement) {
    const carrier = Carrier.getCarrier();
    if (carrier) {
        Carrier.removeCarrier();
        const cursorPosition = getCursorPositionFrom(carrier, 0, carrier, 0);
        normalize(contentEditable, cursorPosition);
    }
}

function applyInsertRowCommand(command: Command) {
    const target = command.table;
    if (!target) {
        return;
    }

    const referenceRow = target.cell.parentElement as HTMLTableRowElement;
    const section = referenceRow.parentElement;
    if (!section) {
        return;
    }

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
        return;
    }

    section.insertBefore(newRow, target.after ? referenceRow.nextSibling : referenceRow);
}

function applyInsertColumnCommand(command: Command) {
    const target = command.table;
    if (!target) {
        return;
    }

    const table = target.cell.closest("table") as HTMLTableElement | null;
    if (!table) {
        return;
    }

    const columnIndex = target.cell.cellIndex + (target.after ? 1 : 0);
    for (const row of table.rows) {
        const insertIndex = Math.min(columnIndex, row.cells.length);
        const reference = row.cells[insertIndex] ?? null;
        const isHeaderRow = row.cells[0]?.tagName === "TH";
        const newCell = document.createElement(isHeaderRow ? "th" : "td");
        newCell.appendChild(document.createElement("br"));
        row.insertBefore(newCell, reference);
    }
}

function applyDeleteRowCommand(command: Command) {
    const target = command.table;
    if (!target) {
        return;
    }

    const table = target.cell.closest("table") as HTMLTableElement | null;
    const row = target.cell.parentElement as HTMLTableRowElement | null;
    if (!table || !row || table.rows.length <= 1) {
        return;
    }

    const section = row.parentElement;
    row.remove();
    if (isSchemaContain(section, [Display.TableSection]) && section?.children.length === 0) {
        section.remove();
    }
}

function applyDeleteColumnCommand(command: Command) {
    const target = command.table;
    if (!target) {
        return;
    }

    const table = target.cell.closest("table") as HTMLTableElement | null;
    if (!table) {
        return;
    }

    const columnIndex = target.cell.cellIndex;
    for (const row of table.rows) {
        row.cells[columnIndex]?.remove();
    }

    if (!table.querySelector("th, td")) {
        table.remove();
    }
}