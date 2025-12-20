import {Action, Command} from "@/core/command/type/command";
import {changeBlock, isElementsEqualToTags, isListWrapper, tag} from "@/core/command/util/command-util";
import {getSelectedBlock, getSelectedSharedTags} from "@/core/selection/selection";
import {getSelectionOffset, setCursorPosition} from "@/core/cursor/cursor";
import {minusIndent, plusIndent} from "@/core/list/list";

export default function execCommand(contentEditable: HTMLElement, command: Command) {
    const cursorPosition = getSelectionOffset(contentEditable);
    if (!cursorPosition) {
        return;
    }

    if (command.action === Action.Tag) {
        const sharedTags: string[] = getSelectedSharedTags(contentEditable);
        const tagName = (command.tag as string).toUpperCase();

        if (sharedTags.includes(tagName)) {
            tag(contentEditable, tagName, Action.Unwrap);
        } else {
            tag(contentEditable, tagName, Action.Wrap);
        }
    }

    if (command.action === Action.FirstLevel) {
        let tags = (command.tag as string[]).map(tag => tag.toUpperCase());
        const tag = tags[0];
        if (!tag) {
            return;
        }

        if (isListWrapper(contentEditable, tag)) {
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