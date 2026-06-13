import {
    createContextualFragment,
    CursorPosition,
    deleteContents, getCursorPositionFromElement,
    insertNode,
    isCollapsed
} from "@/core/shared/type/cursor-position";
import {closeTags, removeAndNormalize} from "@/core/normalize/normalize";
import {getFirstSelectedRoot} from "@/core/selection/selection";

export function pasteHtml(contentEditable: HTMLElement, htmlString: string, cursorPosition: CursorPosition) {
    if (!isCollapsed(cursorPosition)) {
        cursorPosition = deleteContents(cursorPosition);
    }

    const firstRoot = getFirstSelectedRoot(contentEditable, cursorPosition);
    cursorPosition = closeTags(firstRoot, cursorPosition);
    const fragmentToInsert = createContextualFragment(htmlString, cursorPosition);
    insertNode(cursorPosition, fragmentToInsert);
    cursorPosition = getCursorPositionFromElement(fragmentToInsert);

    return removeAndNormalize(contentEditable, firstRoot, [], cursorPosition);
}
