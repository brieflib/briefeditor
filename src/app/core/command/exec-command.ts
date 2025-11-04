import {Action, Command} from "@/core/command/type/command";
import {changeFirstLevel, isFirstLevelsEqualToTags, mergeLists, unwrap, wrap} from "@/core/command/util/command-util";
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

        const updatedBlocks: HTMLElement[] = [];
        const isParagraph = isFirstLevelsEqualToTags(tags, blocks);
        for (const block of blocks) {
            const updatedBlock = changeFirstLevel(isParagraph ? ["P"] : tags, block, contentEditable);
            updatedBlocks.push(updatedBlock);
        }
        if (!isParagraph && tags.toString() === ["UL", "LI"].toString()) {
            mergeLists(contentEditable, updatedBlocks);
        }
    }

    contentEditable.focus();
    setCursorPosition(contentEditable, cursorPosition);
}