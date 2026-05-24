import {createContextualFragment, CursorPosition, insertNode} from "@/core/shared/type/cursor-position";
import {removeAndNormalize} from "@/core/normalize/normalize";

export function sanitizeHtml(contentEditable: HTMLElement, htmlString: string, cursorPosition: CursorPosition) {
    const div = document.createElement("DELETED");
    div.appendChild(createContextualFragment(htmlString, cursorPosition));
    insertNode(cursorPosition, div);

    return removeAndNormalize(contentEditable, div, ["DELETED"], cursorPosition);
}
