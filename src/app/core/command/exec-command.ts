import {Action, Command} from "@/core/command/type/command";
import {changeFirstLevel, unwrap, wrap} from "@/core/command/util/util";
import {getSelectedFirstLevels, getSharedTags} from "@/core/selection/selection";
import {getSelectionOffset, setCursorPosition} from "@/core/cursor/cursor";
import {Display, isSchemaContain} from "@/core/normalize/type/schema";

export default function execCommand(command: Command, contentEditable: HTMLElement) {
    const cursorPosition = getSelectionOffset(contentEditable);
    if (!cursorPosition) {
        return;
    }

    if (command.action === Action.Tag) {
        const sharedTags: string[] = getSharedTags(contentEditable);
        const tag = command.tag.toUpperCase();

        if (sharedTags.includes(tag)) {
            unwrap(tag, contentEditable);
        } else {
            wrap(tag, contentEditable);
        }
    }

    if (command.action === Action.FirstLevel) {
        const tag = command.tag.toUpperCase();
        const firstLevels = getSelectedFirstLevels(contentEditable);
        for (const firstLevel of firstLevels) {
            if (firstLevel.nodeName === tag) {
                changeFirstLevel("P", firstLevel);
                continue;
            }

            if (isSchemaContain(firstLevel, [Display.FirstLevel])) {
                changeFirstLevel(tag, firstLevel);
                continue;
            }

            changeFirstLevel(tag, firstLevel, true);
        }
    }

    contentEditable.focus();
    setCursorPosition(contentEditable, cursorPosition);
}