import {
    cloneContents,
    createContextualFragment,
    CursorPosition,
    deleteContents, getCursorPositionFromElement,
    insertNode,
    isCollapsed
} from "@/core/shared/type/cursor-position";
import {closeTags, removeAndNormalize} from "@/core/normalize/normalize";
import {getFirstSelectedRoot} from "@/core/selection/selection";
import {Display, isSchemaContain} from "@/core/normalize/type/schema";
import {getLastText, getRootElement} from "@/core/shared/element-util";
import {maybeInsertLists} from "@/core/list/list";

export function pasteHtml(contentEditable: HTMLElement, htmlString: string, cursorPosition: CursorPosition) {
    htmlString = cleanPastedContent(htmlString);

    if (!isCollapsed(cursorPosition)) {
        cursorPosition = deleteContents(cursorPosition);
    }

    const firstRoot = getFirstSelectedRoot(contentEditable, cursorPosition);

    if (isSchemaContain(firstRoot, [Display.ListWrapper])) {
        return pasteIntoList(contentEditable, firstRoot, htmlString, cursorPosition);
    }

    cursorPosition = closeTags(firstRoot, cursorPosition);
    const fragmentToInsert = createContextualFragment(htmlString, cursorPosition);
    // Capture the paste-end position before insertNode empties the fragment; the
    // text node itself is moved into the DOM, so the reference stays valid.
    const pastedCursorPosition = getCursorPositionFromElement(getLastText(fragmentToInsert));
    insertNode(cursorPosition, fragmentToInsert);

    return removeAndNormalize(contentEditable, firstRoot, [], pastedCursorPosition);
}

export function getSelectedHtml(cursorPosition: CursorPosition): string {
    // Serialize the selection from a cloned DOM fragment so anchors keep their
    // literal href attributes. Letting the browser build the clipboard HTML would
    // resolve relative hrefs to absolute (prepending the page origin).
    const container = document.createElement("div");
    container.appendChild(cloneContents(cursorPosition));

    // range.cloneContents() drops an inline ancestor that fully contains the
    // selection (e.g. selecting text inside an <a> or <strong>, as a double-click
    // does). Re-wrap the fragment in shallow clones of those ancestors so copied
    // markup keeps its link/formatting, href attributes preserved literally.
    let ancestor: Node | null = cursorPosition.range.commonAncestorContainer;
    if (ancestor.nodeType !== Node.ELEMENT_NODE) {
        ancestor = ancestor.parentElement;
    }
    while (ancestor instanceof HTMLElement && isInlineFormatting(ancestor)) {
        const wrapper = ancestor.cloneNode(false) as HTMLElement;
        wrapper.append(...container.childNodes);
        container.appendChild(wrapper);
        ancestor = ancestor.parentElement;
    }

    return container.innerHTML;
}

function isInlineFormatting(element: HTMLElement): boolean {
    return isSchemaContain(element, [Display.Link, Display.Collapse]) &&
        !isSchemaContain(element, [Display.FirstLevel]);
}

function cleanPastedContent(htmlString: string) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');

    const nodes = doc.querySelectorAll('.Apple-interchange-newline');
    nodes.forEach(node => {
        node.remove();
    });

    return doc.body.innerHTML;
}

function pasteIntoList(contentEditable: HTMLElement, firstRoot: HTMLElement, htmlString: string, cursorPosition: CursorPosition) {
    // Insert the fragment nested at the cursor so block elements stay inside the
    // list item; removeAndNormalize then lifts them out keeping the list wrappers.
    const fragmentToInsert = createContextualFragment(htmlString, cursorPosition);
    const pastedCursorPosition = getCursorPositionFromElement(getLastText(fragmentToInsert));
    insertNode(cursorPosition, fragmentToInsert);

    // Wrap the list in a DELETED tag so removeAndNormalize rebuilds it and remaps
    // the cursor for us.
    const deleted = document.createElement("DELETED");
    firstRoot.before(deleted);
    deleted.append(firstRoot);
    cursorPosition = removeAndNormalize(contentEditable, firstRoot, ["DELETED"], pastedCursorPosition);

    // The inserted blocks are now lifted out as top-level siblings; the list that
    // follows them may need re-normalizing (drop emptied items, promote orphaned
    // nested lists).
    const cursorRoot = getRootElement(contentEditable, cursorPosition.endContainer);
    let trailingList = isSchemaContain(cursorRoot, [Display.ListWrapper])
        ? cursorRoot : cursorRoot.nextElementSibling;
    while (trailingList && !isSchemaContain(trailingList, [Display.ListWrapper])) {
        trailingList = trailingList.nextElementSibling;
    }
    if (trailingList) {
        maybeInsertLists(contentEditable, getCursorPositionFromElement(trailingList));
    }

    return cursorPosition;
}
