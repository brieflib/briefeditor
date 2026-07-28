import {
    cloneContents,
    createContextualFragment,
    CursorPosition,
    deleteContents, getCursorPositionFromElement,
    insertNode,
    isCollapsed
} from "@/core/shared/type/cursor-position";
import {closeTags, removeAndNormalize} from "@/core/normalize/normalize";
import {getFirstSelectedRoot, getSelectedBlock} from "@/core/selection/selection";
import {Display, isSchemaContain} from "@/core/normalize/type/schema";
import {getLastText, getRootElement} from "@/core/shared/element-util";
import {maybeInsertLists} from "@/core/list/list";
import {isCursorAtEndOfBlock, isCursorAtStartOfBlock} from "@/core/cursor/cursor";
import {newLine} from "@/core/keyboard/util/keyboard-util";

export function pasteHtml(contentEditable: HTMLElement, htmlString: string, cursorPosition: CursorPosition) {
    const pastedContent = cleanPastedContent(htmlString);
    htmlString = pastedContent.innerHTML;

    if (!isCollapsed(cursorPosition)) {
        cursorPosition = deleteContents(cursorPosition);
    }

    const firstRoot = getFirstSelectedRoot(contentEditable, cursorPosition);

    if (isSchemaContain(firstRoot, [Display.ListWrapper])) {
        return pasteIntoList(contentEditable, firstRoot, htmlString, cursorPosition);
    }

    if (hasListWrapper(pastedContent)) {
        return pasteListsBetweenBlocks(contentEditable, firstRoot, htmlString, cursorPosition);
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
    // A list wrapper is dropped the same way when the selection spans its items, so
    // re-wrap it too. The shallow clone keeps the source tag, which is the only place
    // where UL and OL can still be told apart.
    while (ancestor instanceof HTMLElement && (isInlineFormatting(ancestor) || isSchemaContain(ancestor, [Display.ListWrapper]))) {
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

    wrapListItems(doc.body);

    return doc.body;
}

function wrapListItems(root: ParentNode) {
    const parents = new Set<HTMLElement>();
    root.querySelectorAll("li").forEach(item => {
        const parent = item.parentElement;
        if (parent && !isSchemaContain(parent, [Display.ListWrapper])) {
            parents.add(parent);
        }
    });

    parents.forEach(parent => wrapChildListItems(parent));
}

function wrapChildListItems(parent: HTMLElement) {
    let listWrapper: HTMLElement | null = null;

    // Snapshot the children so moving them into the wrapper does not disturb the walk.
    for (const child of Array.from(parent.children)) {
        if (isSchemaContain(child, [Display.List])) {
            if (!listWrapper) {
                // Content copied inside the editor keeps its wrapper, so anything
                // orphaned here comes from outside and has no tag to inherit.
                listWrapper = document.createElement("UL");
                child.before(listWrapper);
            }
            listWrapper.appendChild(child);
            continue;
        }

        // A list wrapper between orphaned items is the nested list of the previous item.
        if (listWrapper && isSchemaContain(child, [Display.ListWrapper])) {
            (listWrapper.lastElementChild ?? listWrapper).appendChild(child);
            continue;
        }

        listWrapper = null;
    }
}

function hasListWrapper(pastedContent: HTMLElement) {
    return Array.from(pastedContent.children).some(child => isSchemaContain(child, [Display.ListWrapper]));
}

function pasteListsBetweenBlocks(contentEditable: HTMLElement, firstRoot: HTMLElement, htmlString: string, cursorPosition: CursorPosition) {
    // A list cannot be lifted out of the target block by normalization the way a
    // heading or paragraph is, so place it between blocks instead. Both checks read
    // the block from the current selection, so they must run before the DOM changes.
    const block = getSelectedBlock(contentEditable, cursorPosition)[0] ?? firstRoot;
    const isAtStart = isCursorAtStartOfBlock(contentEditable, cursorPosition);
    const isAtEnd = isCursorAtEndOfBlock(contentEditable, cursorPosition);

    const fragmentToInsert = createContextualFragment(htmlString, cursorPosition);
    const pastedCursorPosition = getCursorPositionFromElement(getLastText(fragmentToInsert));

    // Wrap the pasted markup in a DELETED tag so removeAndNormalize rebuilds it in
    // place and remaps the cursor for us.
    const deleted = document.createElement("DELETED");
    deleted.append(fragmentToInsert);

    if (isAtStart) {
        block.before(deleted);
    } else {
        if (!isAtEnd) {
            // Divides the block into two, keeping the first part in place.
            newLine(contentEditable, cursorPosition);
        }
        block.after(deleted);
    }

    cursorPosition = removeAndNormalize(contentEditable, deleted, ["DELETED"], pastedCursorPosition);

    // The target block keeps whatever markup it had, so normalize it as well unless
    // the pass above already rebuilt it as a part of a common root.
    if (!block.isConnected) {
        return cursorPosition;
    }

    return removeAndNormalize(contentEditable, block, [], cursorPosition);
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
