import {CursorPosition, getCursorPosition} from "@/core/shared/type/cursor-position";
import {sanitizeHtml} from "@/core/clipboard/util/clipboard-util";

export function handleClipboardEvent(contentEditable: HTMLElement, event: ClipboardEvent): CursorPosition {
    const cursorPosition = getCursorPosition();
    event.preventDefault();

    const htmlString = event.clipboardData?.getData('text/html');
    if (htmlString) {
        sanitizeHtml(contentEditable, htmlString, cursorPosition);
    }

    return cursorPosition;
}