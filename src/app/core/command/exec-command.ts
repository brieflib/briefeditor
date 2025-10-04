import {Action, Command} from "@/core/command/type/command";
import {changeFirstLevel, unwrap, wrap} from "@/core/command/util/util";
import {getSelectedFirstLevels, getSharedTags} from "@/core/selection/selection";

export default function execCommand(command: Command, contentEditable: HTMLElement) {
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
                return;
            }

            if (["P", "H1", "H2", "H3"].includes(firstLevel.nodeName)) {
                changeFirstLevel(tag, firstLevel);
                return;
            }

            changeFirstLevel(tag, firstLevel, true);
        }
    }
}