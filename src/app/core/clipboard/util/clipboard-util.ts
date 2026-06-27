import {
    createContextualFragment,
    CursorPosition,
    deleteContents, getCursorPositionFromElement,
    insertNode,
    isCollapsed
} from "@/core/shared/type/cursor-position";
import {closeTags, removeAndNormalize} from "@/core/normalize/normalize";
import {getFirstSelectedRoot} from "@/core/selection/selection";
import {Display, isSchemaContain} from "@/core/normalize/type/schema";
import {getRootElement} from "@/core/shared/element-util";
import {maybeInsertLists} from "@/core/list/list";

export function pasteHtml(contentEditable: HTMLElement, htmlString: string, cursorPosition: CursorPosition) {
    if (!isCollapsed(cursorPosition)) {
        cursorPosition = deleteContents(cursorPosition);
    }

    const firstRoot = getFirstSelectedRoot(contentEditable, cursorPosition);

    if (isSchemaContain(firstRoot, [Display.ListWrapper])) {
        return pasteIntoList(contentEditable, firstRoot, htmlString, cursorPosition);
    }

    cursorPosition = closeTags(firstRoot, cursorPosition);
    const fragmentToInsert = createContextualFragment(htmlString, cursorPosition);
    insertNode(cursorPosition, fragmentToInsert);
    cursorPosition = getCursorPositionFromElement(fragmentToInsert);

    return removeAndNormalize(contentEditable, firstRoot, [], cursorPosition);
}

function pasteIntoList(contentEditable: HTMLElement, firstRoot: HTMLElement, htmlString: string, cursorPosition: CursorPosition) {
    // Insert the fragment nested at the cursor so block elements stay inside the
    // list item; removeAndNormalize then lifts them out keeping the list wrappers.
    const fragmentToInsert = createContextualFragment(htmlString, cursorPosition);
    insertNode(cursorPosition, fragmentToInsert);

    // Wrap the list in a DELETED tag so removeAndNormalize rebuilds it and remaps
    // the cursor for us.
    const deleted = document.createElement("DELETED");
    firstRoot.before(deleted);
    deleted.append(firstRoot);
    cursorPosition = removeAndNormalize(contentEditable, firstRoot, ["DELETED"], cursorPosition);

    // The inserted blocks are now lifted out as top-level siblings; the list that
    // follows them may need re-normalizing (drop emptied items, promote orphaned
    // nested lists).
    const cursorRoot = getRootElement(contentEditable, cursorPosition.endContainer);
    let trailingList = cursorRoot.nextElementSibling;
    while (trailingList && !isSchemaContain(trailingList, [Display.ListWrapper])) {
        trailingList = trailingList.nextElementSibling;
    }
    if (trailingList) {
        maybeInsertLists(contentEditable, getCursorPositionFromElement(trailingList));
    }

    return cursorPosition;
}
