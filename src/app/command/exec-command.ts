import {Action, Command} from "@/command/type/command";
import {getRange} from "@/shared/range-util";
import {removeTag} from "@/normalize/normalize";
import {getFirstLevelElement} from "@/command/util/util";

export default function execCommand(command: Command) {
    if (command.action === Action.Wrap) {
        wrap(command.tag);
    }

    if (command.action === Action.Unwrap) {
        unwrap(command.tag);
    }
}

function wrap(tag: string) {
    const range: Range = getRange();
    const cloneRange: Range = range.cloneRange();
    const documentFragment: DocumentFragment = range.extractContents();

    const tagElement = document.createElement(tag);
    tagElement.appendChild(documentFragment);
    cloneRange.insertNode(tagElement);
}

function unwrap(tag: string) {
    const range: Range = getRange();
    const cloneRange: Range = range.cloneRange();
    const documentFragment: DocumentFragment = range.extractContents();

    const wrapper = document.createElement("DELETED");
    wrapper.appendChild(documentFragment);
    cloneRange.insertNode(wrapper);

    const root = document.getElementById("content");
    if (!root) {
        return;
    }
    const firstLevel = getFirstLevelElement(root, wrapper);
    firstLevel.innerHTML = removeTag(firstLevel, wrapper, tag).innerHTML;
    console.log(firstLevel.innerHTML);
}