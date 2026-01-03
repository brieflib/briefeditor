import {Action, Command} from "@/core/command/type/command";
import {changeBlock, isElementsEqualToTags, isListWrapper, tag} from "@/core/command/util/command-util";
import {getSelectedBlock, getSelectedLink, getSelectedSharedTags} from "@/core/selection/selection";
import {getSelectionOffset, selectElement, setCursorPosition} from "@/core/cursor/cursor";
import {minusIndent, plusIndent} from "@/core/list/list";
import {getRange, isRangeIn} from "@/core/shared/range-util";

export default function execCommand(contentEditable: HTMLElement, command: Command) {
    const cursorPosition = getSelectionOffset(contentEditable);
    if (!cursorPosition) {
        return;
    }

    if (command.action === Action.Image) {
        const image = command.attributes?.image;

        if (image) {
            const reader = new FileReader();

            reader.onload = (event) => {
                const img = document.createElement("img");
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
        const linkTag = "A";
        const sharedTags: string[] = getSelectedSharedTags(contentEditable);
        const href = command.attributes?.href;
        const range = getRange();
        const isCollapsed = range.collapsed;
        const isLinkSelected = sharedTags.includes(linkTag);

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
                tag(contentEditable, linkTag, Action.Unwrap, command.attributes);
            }
        }

        if (!href && !isCollapsed && isLinkSelected) {
            tag(contentEditable, linkTag, Action.Unwrap, command.attributes);
        }

        if (href && !isCollapsed && !isLinkSelected) {
            tag(contentEditable, linkTag, Action.Wrap, command.attributes);
        }
    }

    if (command.action === Action.Tag) {
        const sharedTags: string[] = getSelectedSharedTags(contentEditable);
        const tagName = (command.tag as string).toUpperCase();

        if (sharedTags.includes(tagName)) {
            tag(contentEditable, tagName, Action.Unwrap, command.attributes);
        } else {
            tag(contentEditable, tagName, Action.Wrap, command.attributes);
        }
    }

    if (command.action === Action.FirstLevel) {
        let tags = (command.tag as string[]).map(tag => tag.toUpperCase());
        const tag = tags[0];
        if (!tag) {
            return;
        }

        if (isListWrapper(contentEditable) && !getSelectedSharedTags(contentEditable).includes(tag)) {
            changeBlock(contentEditable, [tag]);
        } else {
            const blockElements = getSelectedBlock(contentEditable);
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
}