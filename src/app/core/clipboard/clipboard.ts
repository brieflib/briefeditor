import {
    CursorPosition,
    deleteContents,
    getCursorPosition,
    isCollapsed,
    setCursorPosition
} from "@/core/shared/type/cursor-position";
import {getSelectedHtml, pasteHtml} from "@/core/clipboard/util/clipboard-util";
import {ensureParagraph} from "@/core/shared/element-util";
import {getFirstSelectedRoot} from "@/core/selection/selection";
import {removeAndNormalize} from "@/core/normalize/normalize";

export function handleClipboardEvent(contentEditable: HTMLElement, event: ClipboardEvent): CursorPosition {
    let cursorPosition = getCursorPosition();
    event.preventDefault();

    const htmlString = event.clipboardData?.getData('text/html');
    if (htmlString) {
        cursorPosition = pasteHtml(contentEditable, htmlString, cursorPosition);
    }

    setCursorPosition(contentEditable, cursorPosition);
    return cursorPosition;
}

export function handleCopyEvent(event: ClipboardEvent) {
    const cursorPosition = getCursorPosition();
    if (isCollapsed(cursorPosition)) {
        return;
    }

    event.preventDefault();
    writeSelectionToClipboard(event, cursorPosition);
}

export function handleCutEvent(contentEditable: HTMLElement, event: ClipboardEvent): CursorPosition {
    let cursorPosition = getCursorPosition();
    if (isCollapsed(cursorPosition)) {
        return cursorPosition;
    }

    event.preventDefault();
    writeSelectionToClipboard(event, cursorPosition);

    cursorPosition = deleteContents(cursorPosition);
    cursorPosition = ensureParagraph(contentEditable, cursorPosition);

    const firstRoot = getFirstSelectedRoot(contentEditable, cursorPosition);
    cursorPosition = removeAndNormalize(contentEditable, firstRoot, [], cursorPosition);

    setCursorPosition(contentEditable, cursorPosition);
    return cursorPosition;
}

/**
 * Refuses a drop: dragging moves nodes with no command running, so the history observer
 * would miss the edit and skip the normalizing/sanitizing every paste goes through. The
 * command pipeline stays the only way into the document.
 */
export function handleDragEvent(event: DragEvent) {
    event.preventDefault();
}

/** Refuses a drop over the editor by leaving dragover's default alone, and shows the no-drop cursor. */
export function handleDragOverEvent(event: DragEvent) {
    if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "none";
    }
}

function writeSelectionToClipboard(event: ClipboardEvent, cursorPosition: CursorPosition) {
    event.clipboardData?.setData('text/html', getSelectedHtml(cursorPosition));
    event.clipboardData?.setData('text/plain', cursorPosition.range.toString());
}
