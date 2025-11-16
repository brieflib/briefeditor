import {Action, Command} from "@/core/command/type/command";
import {firstLevel, tag} from "@/core/command/util/command-util";
import {getSelectedSharedTags} from "@/core/selection/selection";
import {getSelectionOffset, setCursorPosition} from "@/core/cursor/cursor";
import {minusIndent, plusIndent} from "@/core/list/list";

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
        firstLevel(contentEditable, command.tag);
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