import {Action, Command} from "@/core/command/type/command";
import {
    applyAttributes,
    changeBlock,
    isElementsEqualToTags,
    isListWrapper,
    tag
} from "@/core/command/util/command-util";
import {getSelectedBlock, getSelectedLink, getSelectedSharedTags, selectElement} from "@/core/selection/selection";
import {getCursorPosition, setCursorPosition} from "@/core/cursor/cursor";
import {minusIndent, plusIndent} from "@/core/list/list";
import {getRange, isRangeIn} from "@/core/shared/range-util";
import {getElementByTagName} from "@/core/shared/element-util";
import {CursorPosition} from "@/core/shared/type/cursor-position";

export default function execCommand(contentEditable: HTMLElement, command: Command) {
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
    }

    contentEditable.focus();
    //setCursorPosition(contentEditable, cursorPosition);

    if (command.action !== Action.Attribute && command.tag) {
        applyAttributesCommand(contentEditable, command);
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
    const cursorPosition = getCursorPosition();
    const image = command.attributes?.image;

    if (image) {
        const reader = new FileReader();

        reader.onload = (event) => {
            const imgTag = "img";
            const img = document.createElement(imgTag);
            img.src = event.target?.result as string;

            const range = getRange();
            if (isRangeIn(contentEditable, range)) {
                range.insertNode(img);

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
    const range = getRange();
    const isCollapsed = range.collapsed;
    const isLinkSelected = sharedTags.includes(tagName);

    if (href && isCollapsed && isLinkSelected) {
        const link = getSelectedLink(contentEditable, range)[0];
        if (link) {
            link.setAttribute("href", href);
        }
    }

    if (!href && isCollapsed && isLinkSelected) {
        const link = getSelectedLink(contentEditable, range)[0];
        if (link) {
            selectElement(link);
            tag(contentEditable, tagName, Action.Unwrap, command.attributes);
        }
    }

    if (!href && !isCollapsed && isLinkSelected) {
        tag(contentEditable, tagName, Action.Unwrap, command.attributes);
    }

    if (href && !isCollapsed && !isLinkSelected) {
        tag(contentEditable, tagName, Action.Wrap, command.attributes);
    }
}

function applyTagCommand(contentEditable: HTMLElement, command: Command) {
    const tagName = (command.tag as string).toUpperCase();
    const sharedTags: string[] = getSelectedSharedTags(contentEditable);

    if (sharedTags.includes(tagName)) {
        tag(contentEditable, tagName, Action.Unwrap, command.attributes);
    } else {
        tag(contentEditable, tagName, Action.Wrap, command.attributes);
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