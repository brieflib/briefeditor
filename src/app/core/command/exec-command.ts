import {Action, Command} from "@/core/command/type/command";
import {changeFirstLevel, isFirstLevelsEqualToTags, unwrap, wrap} from "@/core/command/util/command-util";
import {getSelectedBlocks, getSelectedSharedTags} from "@/core/selection/selection";
import {getSelectionOffset, setCursorPosition} from "@/core/cursor/cursor";

export default function execCommand(command: Command, contentEditable: HTMLElement) {
    const cursorPosition = getSelectionOffset(contentEditable);
    if (!cursorPosition) {
        return;
    }

    if (command.action === Action.Tag) {
        const sharedTags: string[] = getSelectedSharedTags(contentEditable);
        const tag = (command.tag as string).toUpperCase();

        if (sharedTags.includes(tag)) {
            unwrap(tag, contentEditable);
        } else {
            wrap(tag, contentEditable);
        }
    }

    if (command.action === Action.FirstLevel) {
        const tags = (command.tag as string[]).map(tag => tag.toUpperCase());
        const blocks = getSelectedBlocks(contentEditable);

        const isParagraph = isFirstLevelsEqualToTags(tags, blocks);
        for (const block of blocks) {
            changeFirstLevel(isParagraph ? ["P"] : tags, block, contentEditable);
        }
    }

    contentEditable.focus();
    setCursorPosition(contentEditable, cursorPosition);
}