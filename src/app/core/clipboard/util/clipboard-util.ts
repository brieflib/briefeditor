import {
    cloneContents,
    createContextualFragment,
    CursorPosition,
    deleteContents, getCursorPositionFrom, getCursorPositionFromElement,
    insertNode,
    isCollapsed,
    splitAtCursor
} from "@/core/shared/type/cursor-position";
import {removeAndNormalize} from "@/core/normalize/normalize";
import {getFirstSelectedRoot, getSelectedBlock} from "@/core/selection/selection";
import {Display, getOfType, isSchemaContain} from "@/core/normalize/type/schema";
import {getLastText, getRootElement, imageSelector, insertBetweenBlocks, isEmptyBlock} from "@/core/shared/element-util";
import {maybeInsertLists} from "@/core/list/list";
import {getCursorCell, getFirstCell} from "@/core/cursor/util/cursor-util";
import {getCellCursorPosition, normalizeTable} from "@/core/command/util/table-util";

export function pasteHtml(contentEditable: HTMLElement, htmlString: string, cursorPosition: CursorPosition) {
    if (!isCollapsed(cursorPosition)) {
        cursorPosition = deleteContents(cursorPosition);
    }

    // Read after the delete: it is the surviving cursor that says where the markup lands.
    const cell = getCursorCell(contentEditable, cursorPosition);
    const pastedContent = cleanPastedContent(htmlString, cell);
    htmlString = pastedContent.innerHTML;
    if (!htmlString) {
        return cursorPosition;
    }

    // A cell is not a first level element, so its root is the table holding it. Closing the tags on that
    // root would rebuild every row onto the table element itself, so the cell stands in as the root and
    // the split stays inside it.
    const firstRoot = cell ?? getFirstSelectedRoot(contentEditable, cursorPosition);

    // A table pasted into a list splits it instead of joining it, so the check comes before the list root
    // one. A cell never reaches it: the table tags are already unwrapped out of the pasted markup there.
    if (hasTable(pastedContent)) {
        return pasteBetweenBlocks(contentEditable, firstRoot, htmlString, cursorPosition);
    }

    // A list is written as a run of wrappers standing side by side, so a pasted one stands beside the list
    // the cursor is in rather than inside the item it rests on - the way a pasted table does, and the way a
    // list pasted anywhere else does. The placement divides the list around it and convertList joins the
    // two back into one wrapper wherever they share a type.
    if (hasListWrapper(pastedContent)) {
        return pasteBetweenBlocks(contentEditable, firstRoot, htmlString, cursorPosition);
    }

    if (isSchemaContain(firstRoot, [Display.ListWrapper])) {
        return pasteIntoList(contentEditable, firstRoot, htmlString, cursorPosition);
    }

    // An empty block has nothing on either side of the cursor to close tags around, and the br standing in for
    // its line is not content to keep: it is what the pasted markup takes the place of, so the block is
    // emptied rather than divided.
    if (isEmptyBlock(firstRoot)) {
        firstRoot.replaceChildren();
        cursorPosition = getCursorPositionFrom(firstRoot, 0, firstRoot, 0);
    } else {
        // The pasted markup must land beside the formatting elements the cursor sits in, not inside them.
        // Splitting the root at the cursor closes those tags; appending the tail straight back leaves one root
        // whose children are divided at the seam, which is where the markup goes.
        const tail = splitAtCursor(firstRoot, cursorPosition);
        const seam = firstRoot.childNodes.length;
        firstRoot.append(tail);
        cursorPosition = getCursorPositionFrom(firstRoot, seam, firstRoot, seam);
    }

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
    // where UL and OL can still be told apart. The rows and the table around selected
    // cells go the same way, and without them the cells do not survive the parse the
    // paste puts them through: the tags of a cell outside a table are thrown away.
    // A selection held inside a single cell stops at the cell, which is not re-wrapped,
    // so copied words stay words and only a selection crossing a cell carries a table.
    while (ancestor instanceof HTMLElement &&
        (isInlineFormatting(ancestor) || isSchemaContain(ancestor, [Display.ListWrapper, Display.TableSection, Display.Table]))) {
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

function cleanPastedContent(htmlString: string, cell: HTMLTableCellElement | null) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');

    const nodes = doc.querySelectorAll('.Apple-interchange-newline');
    nodes.forEach(node => {
        node.remove();
    });

    // wrapListItems only gives orphaned items a wrapper, and the unwrap drops both.
    if (cell) {
        removeImages(doc.body);
        unwrapBlocks(doc.body);
        return doc.body;
    }

    wrapListItems(doc.body);
    hoistTables(doc.body);
    doc.body.querySelectorAll(tableSelector).forEach(table => normalizeTable(table as HTMLTableElement));

    return doc.body;
}

const tableSelector = getOfType([Display.Table]).join(",");

// A table cannot be nested in a block, so a pasted one is split out of the blocks holding it: each
// ancestor is cloned around the table, keeping the markup on either side in a block of its own. A table
// inside a list item comes out of its wrapper the same way, which leaves the list divided in two the way
// placing a table in one does. A side the split leaves empty is left in place for normalization, which
// throws away a block holding nothing on the way back up.
function hoistTables(root: HTMLElement) {
    root.querySelectorAll(tableSelector).forEach(table => hoistTable(root, table));
}

function hoistTable(root: HTMLElement, table: Element) {
    let parent = table.parentElement;
    while (parent && parent !== root) {
        const tail = parent.cloneNode(false) as HTMLElement;
        while (table.nextSibling) {
            tail.appendChild(table.nextSibling);
        }

        parent.after(table);
        table.after(tail);

        parent = table.parentElement;
    }
}

// A cell holds a single line - Enter is dropped inside a table - so a pasted block has nothing to split
// off into and only its children survive. Table tags go the same way: the editor never nests a table in
// a cell, so a pasted one must not arrive as one.
const cellUnwrapSelector = getOfType([Display.FirstLevel, Display.List, Display.Table,
    Display.TableSection, Display.Cell]).join(",");

function removeImages(root: ParentNode) {
    root.querySelectorAll(imageSelector).forEach(image => image.remove());
}

function unwrapBlocks(root: ParentNode) {
    // querySelector answers with the outermost match, so the blocks it held surface on the next pass.
    let block = root.querySelector(cellUnwrapSelector);
    while (block) {
        block.replaceWith(...block.childNodes);
        block = root.querySelector(cellUnwrapSelector);
    }
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

// An orphaned item has no wrapper of its own to be read from, so it is given the one the parse needs before
// the run is read. Content copied inside the editor keeps its wrapper, so anything orphaned here comes from
// outside and has no tag to inherit. Where the wrapper goes is all this decides - what stands inside what is
// left to the read below, which puts a list wrapper found between items where a nested list belongs.
function wrapChildListItems(parent: HTMLElement) {
    let listWrapper: HTMLElement | null = null;

    // Snapshot the children so moving them into the wrapper does not disturb the walk.
    for (const child of Array.from(parent.children)) {
        if (isSchemaContain(child, [Display.List])) {
            if (!listWrapper) {
                listWrapper = document.createElement("UL");
                child.before(listWrapper);
            }
            listWrapper.appendChild(child);
            continue;
        }

        if (listWrapper && isSchemaContain(child, [Display.ListWrapper])) {
            listWrapper.appendChild(child);
            continue;
        }

        listWrapper = null;
    }
}

function hasListWrapper(pastedContent: HTMLElement | DocumentFragment) {
    return Array.from(pastedContent.children).some(child => isSchemaContain(child, [Display.ListWrapper]));
}

// The hoist leaves every pasted table as a child of the body it was parsed into, so a top level look is
// all it takes to find one.
function hasTable(pastedContent: HTMLElement) {
    return Array.from(pastedContent.children).some(child => isSchemaContain(child, [Display.Table]));
}

function pasteBetweenBlocks(contentEditable: HTMLElement, firstRoot: HTMLElement, htmlString: string, cursorPosition: CursorPosition) {
    // Neither a list nor a table can be lifted out of the target block by normalization the way a heading
    // or paragraph is, so place the markup between blocks instead, where an inserted table goes.
    const fragmentToInsert = createContextualFragment(htmlString, cursorPosition);
    const table = fragmentToInsert.querySelector(tableSelector) as HTMLTableElement | null;
    // Read before the fragment is emptied into the tag below.
    const isList = hasListWrapper(fragmentToInsert);
    // A pasted table takes the cursor into its first cell, the way an inserted one does; anything else
    // leaves it at the end of what was pasted.
    const pastedCursorPosition = table
        ? getCellCursorPosition(getFirstCell(table), cursorPosition)
        : getCursorPositionFromElement(getLastText(fragmentToInsert));

    // Wrap the pasted markup in a DELETED tag so removeAndNormalize rebuilds it in
    // place and remaps the cursor for us.
    const deleted = document.createElement("DELETED");
    deleted.append(fragmentToInsert);

    insertBetweenBlocks(contentEditable, firstRoot, cursorPosition, deleted);

    cursorPosition = removeAndNormalize(contentEditable, deleted, ["DELETED"], pastedCursorPosition);

    // A pasted list is placed beside the list it was dropped into, which leaves the two standing side by
    // side. They are lines of one run, so the run is read and written back as one: convertList opens a
    // single wrapper for as long as the type holds, which joins two lists written in the same type and
    // leaves two written in different ones apart.
    if (isList) {
        cursorPosition = maybeInsertLists(contentEditable, cursorPosition);
    }

    // The target block keeps whatever markup it had, so normalize it as well unless
    // the pass above already rebuilt it as a part of a common root. A list is parsed
    // into a new one by the placement, which leaves the root it was read from gone.
    if (!firstRoot.isConnected) {
        return cursorPosition;
    }

    return removeAndNormalize(contentEditable, firstRoot, [], cursorPosition);
}

function pasteIntoList(contentEditable: HTMLElement, firstRoot: HTMLElement, htmlString: string, cursorPosition: CursorPosition) {
    // The item the cursor is in stands to an empty line the way a block does: the br holding its line open is
    // what the pasted markup takes the place of, not something to keep beside it.
    const item = getSelectedBlock(contentEditable, cursorPosition)[0];
    if (item && isEmptyBlock(item)) {
        item.replaceChildren();
        cursorPosition = getCursorPositionFrom(item, 0, item, 0);
    }

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
