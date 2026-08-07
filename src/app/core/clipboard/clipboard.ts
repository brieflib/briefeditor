import {
    CursorPosition,
    deleteContents,
    getCursorPosition,
    isCollapsed,
    setCursorPosition
} from "@/core/shared/type/cursor-position";
import {getSelectedHtml, pasteHtml} from "@/core/clipboard/util/clipboard-util";
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
    const firstRoot = getFirstSelectedRoot(contentEditable, cursorPosition);
    cursorPosition = removeAndNormalize(contentEditable, firstRoot, [], cursorPosition);

    setCursorPosition(contentEditable, cursorPosition);
    return cursorPosition;
}

// Dragged content moves nodes with no command running, so the history observer never sees the edit and
// the entries before it are left pointing at nodes that have moved. Nothing normalizes the result either,
// and a drop from outside skips the sanitizing every paste goes through. Both ends are refused, so the
// only way into the document stays the command pipeline.
export function handleDragEvent(event: DragEvent) {
    event.preventDefault();
}

// A drop is refused by leaving the dragover default alone, since preventing it is what allows one.
// Saying so through dropEffect is what turns the pointer into the no drop cursor while the drag is
// still over the editor.
export function handleDragOverEvent(event: DragEvent) {
    if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "none";
    }
}

function writeSelectionToClipboard(event: ClipboardEvent, cursorPosition: CursorPosition) {
    event.clipboardData?.setData('text/html', getSelectedHtml(cursorPosition));
    event.clipboardData?.setData('text/plain', cursorPosition.range.toString());
}
