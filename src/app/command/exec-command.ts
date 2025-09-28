import {Action, Command} from "@/command/type/command";
import {getRange} from "@/shared/range-util";
import normalize, {removeTag} from "@/normalize/normalize";
import {getFirstLevelElement} from "@/command/util/util";
import {getSharedTags} from "@/shared/selected-tags-util";

export default function execCommand(command: Command, contentEditable: HTMLElement) {
    if (command.action === Action.Tag) {
        const sharedTags: string[] | undefined = getSharedTags(contentEditable);
        const tag = command.tag.toUpperCase();

        if (sharedTags && sharedTags.includes(tag)) {
            unwrap(tag, contentEditable);
        } else {
            wrap(tag, contentEditable);
        }
    }
}

export function wrap(tag: string, contentEditable: HTMLElement) {
    const range: Range = getRange();
    const cloneRange: Range = range.cloneRange();
    const documentFragment: DocumentFragment = range.extractContents();

    const tagElement = document.createElement(tag);
    tagElement.appendChild(documentFragment);
    cloneRange.deleteContents();
    cloneRange.insertNode(tagElement);

    const firstLevel = getFirstLevelElement(contentEditable, tagElement);
    firstLevel.innerHTML = normalize(firstLevel).innerHTML;
}

export function unwrap(tag: string, contentEditable: HTMLElement) {
    const range: Range = getRange();
    const cloneRange: Range = range.cloneRange();
    const documentFragment: DocumentFragment = range.extractContents();

    const wrapper = document.createElement("DELETED");
    wrapper.appendChild(documentFragment);
    cloneRange.deleteContents();
    cloneRange.insertNode(wrapper);

    const firstLevel = getFirstLevelElement(contentEditable, wrapper);
    firstLevel.innerHTML = removeTag(firstLevel, wrapper, tag).innerHTML;
}