import {Action, Command} from "@/core/command/type/command";
import {firstLevel, isElementsEqualToTags, listWrapper, tag} from "@/core/command/util/command-util";
import {getSelectedListWrapper, getSelectedRoot, getSelectedSharedTags} from "@/core/selection/selection";
import {getSelectionOffset, setCursorPosition} from "@/core/cursor/cursor";
import {isMinusIndentEnabled, minusIndent, plusIndent} from "@/core/list/list";
import {Display, isSchemaContainNodeName} from "@/core/normalize/type/schema";

export default function execCommand(command: Command, contentEditable: HTMLElement) {
    const cursorPosition = getSelectionOffset(contentEditable);
    if (!cursorPosition) {
        return;
    }

    if (command.action === Action.Tag) {
        const sharedTags: string[] = getSelectedSharedTags(contentEditable);
        const tagName = (command.tag as string).toUpperCase();

        if (sharedTags.includes(tagName)) {
            tag(tagName, contentEditable, Action.Unwrap);
        } else {
            tag(tagName, contentEditable, Action.Wrap);
        }
    }

    if (command.action === Action.FirstLevel) {
        let tags = (command.tag as string[]).map(tag => tag.toUpperCase());
        const rootElement = getSelectedRoot(contentEditable);
        const isParagraph = isElementsEqualToTags(tags, rootElement);
        if (isSchemaContainNodeName(tags[0], [Display.ListWrapper])) {
            const listWrapperElement = getSelectedListWrapper(contentEditable);
            if ((isElementsEqualToTags(["UL"], listWrapperElement) || isElementsEqualToTags(["OL"], listWrapperElement))
                && isMinusIndentEnabled(contentEditable)) {
                tags = [tags[0]];
                listWrapper(contentEditable, tags);
                return;
            }
        }

        if (isParagraph) {
            tags = ["P"];
        }
        firstLevel(contentEditable, tags);
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