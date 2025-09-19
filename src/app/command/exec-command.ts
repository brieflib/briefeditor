import {Action, Command} from "@/command/type/command";
import {getRange} from "@/command/util/util";

export default function execCommand(command: Command) {
    if (command.action === Action.Wrap) {
        wrap(command.tag);
    }
}

function wrap(tag: string) {
    const range: Range = getRange();
    const cloneRange: Range = range.cloneRange();
    const documentFragment: DocumentFragment = range.extractContents();

    const tagElement = document.createElement(tag);
    tagElement.appendChild(documentFragment);
    cloneRange.deleteContents();
    cloneRange.insertNode(tagElement);
}
