import {Action, Command} from "@/core/command/type/command";
import {
    applyAttributes,
    changeBlock,
    isElementsEqualToTags,
    isListWrapper,
    tag
} from "@/core/command/util/command-util";
import {getSelectedBlock, getSelectedLink, getSelectedSharedTags} from "@/core/selection/selection";
import {getSelectionOffset, selectElement, setCursorPosition} from "@/core/cursor/cursor";
import {minusIndent, plusIndent} from "@/core/list/list";
import {getRange, isRangeIn} from "@/core/shared/range-util";
import {getElementByTagName} from "@/core/shared/element-util";

export default function execCommand(contentEditable: HTMLElement, command: Command) {
    const cursorPosition = getSelectionOffset(contentEditable);
    if (!cursorPosition) {
        return;
    }

    if (command.action === Action.Attribute) {
        applyAttributesCommand(contentEditable, command);
    }

    if (command.action === Action.Image) {
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

    if (command.action === Action.Link) {
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

    if (command.action === Action.Tag) {
        const tagName = (command.tag as string).toUpperCase();
        const sharedTags: string[] = getSelectedSharedTags(contentEditable);

        if (sharedTags.includes(tagName)) {
            tag(contentEditable, tagName, Action.Unwrap, command.attributes);
        } else {
            tag(contentEditable, tagName, Action.Wrap, command.attributes);
        }
    }

    if (command.action === Action.FirstLevel) {
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

    if (command.action === Action.List) {
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

    if (command.action === Action.PlusIndent) {
        plusIndent(contentEditable);
    }

    if (command.action === Action.MinusIndent) {
        minusIndent(contentEditable);
    }

    contentEditable.focus();
    setCursorPosition(contentEditable, cursorPosition);

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