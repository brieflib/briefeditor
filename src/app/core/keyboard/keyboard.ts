import {isCursorAtEndOfBlock} from "@/core/cursor/cursor";
import {isListNested} from "@/core/list/list";
import {deleteCommand} from "@/core/keyboard/util/keyboard-util";
import {pasteParagraph} from "@/core/shared/element-util";

export function handleEvent(contentEditable: HTMLElement, event: KeyboardEvent) {
    if (event.key === "Delete") {
        if (isListNested(contentEditable) && isCursorAtEndOfBlock(contentEditable)) {
            event.preventDefault();
            return;
        }

        if (isCursorAtEndOfBlock(contentEditable)) {
            event.preventDefault();
            deleteCommand(contentEditable);
        }
    }

    pasteParagraph(contentEditable);
}