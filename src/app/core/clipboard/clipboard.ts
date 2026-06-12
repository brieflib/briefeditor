import {CursorPosition, getCursorPosition, setCursorPosition} from "@/core/shared/type/cursor-position";
import {sanitizeHtml} from "@/core/clipboard/util/clipboard-util";

export function handleClipboardEvent(contentEditable: HTMLElement, event: ClipboardEvent): CursorPosition {
    let cursorPosition = getCursorPosition();
    event.preventDefault();

    const htmlString = event.clipboardData?.getData('text/html');
    if (htmlString) {
        cursorPosition = sanitizeHtml(contentEditable, htmlString, cursorPosition);
    }

    setCursorPosition(contentEditable, cursorPosition);
    return cursorPosition;
}