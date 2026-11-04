import {isSpecialKey, mergeBlocksNew} from "@/core/keyboard/util/keyboard-util";
import {Command} from "@/core/command/type/command";

export function handleKeyboardEvent(contentEditable: HTMLElement, command: Command) {
    const event = command.event;
    if (!(event instanceof KeyboardEvent)) {
        throw Error("Event should be KeyboardEvent");
    }

    if (isSpecialKey(event)) {
        return;
    }

    event.preventDefault();
    mergeBlocksNew(contentEditable, command);
}
