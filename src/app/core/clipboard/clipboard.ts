import {CursorPosition, getCursorPosition} from "@/core/shared/type/cursor-position";

export function handleClipboardEvent(contentEditable: HTMLElement, event: ClipboardEvent): CursorPosition {
    let cursorPosition = getCursorPosition();
    event.preventDefault();

    const html = event.clipboardData?.getData('text/html');
    console.log(html);

    return cursorPosition;
}