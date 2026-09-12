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
import {
    getFirstText,
    getLastText,
    getRootElement,
    imageSelector,
    insertBetweenBlocks,
    isEmptyBlock
} from "@/core/shared/element-util";
import {isCursorAtEndOfBlock, isCursorAtStartOfBlock} from "@/core/cursor/cursor";
import {newLine} from "@/core/keyboard/util/keyboard-util";
import {maybeInsertLists} from "@/core/list/list";
import {getCursorCell, getFirstCell} from "@/core/cursor/util/cursor-util";
import {getCellCursorPosition, normalizeTable} from "@/core/command/util/table-util";

interface EdgeParagraphs {
    lead: string;
    tail: string;
}

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

    // The paragraphs a run opens and closes with are words of the line the cursor is on rather than lines
    // of their own, so they are taken out of the run before anything is placed and written into that line.
    // What is left of the run goes on being placed the way it always is.
    const edges = takeEdgeParagraphs(contentEditable, pastedContent, cursorPosition);
    if (edges) {
        return pasteAroundBlocks(contentEditable, pastedContent, edges, cursorPosition);
    }

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

    // A blank paste - whitespace, or the br an empty line was copied as - dropped into a line stands as the
    // space between the words on either side, not as a break dividing them and not as the formatting that
    // wrapped it: tags around nothing are nothing to keep. Dropped onto an empty line it is nothing at all:
    // a space written into an emptied block would leave one with no br to hold its line open. Several brs
    // are lines of their own and are left to the paths around this one. The blocks a blank was copied in
    // are nothing to keep either: an empty line selected from the end of the line before it comes as two
    // blocks, and they are one space, not a run of lines to place between blocks.
    const blank = isBlank(pastedContent);
    if (blank) {
        const line = cell ?? getSelectedBlock(contentEditable, cursorPosition)[0];
        if (!line || isEmptyBlock(line)) {
            return cursorPosition;
        }
        htmlString = " ";
    } else {
        // A block on its own is dropped into the line the cursor is on - a block or an item - so the tag it was
        // written in has no line of its own to name. The rebuild keeps the innermost block standing over a
        // leaf, which would set the pasted words in a line of the pasted tag between the two halves of the
        // target, so only what stood inside the block goes in and the target keeps its tag.
        const loneBlock = getLoneBlock(pastedContent);
        if (loneBlock) {
            htmlString = loneBlock.innerHTML;
        }
    }

    if (isSchemaContain(firstRoot, [Display.ListWrapper])) {
        return pasteIntoList(contentEditable, firstRoot, htmlString, cursorPosition);
    }

    // A run of blocks pasted into a block of the same kind is read by the rebuild as a repeat of the tag it was
    // dropped into and thrown away, which leaves every line collapsed into the one line of the target. The run
    // is placed between blocks instead, the way a pasted list or table is, so each block keeps a line of its
    // own. A block on its own is left to the path below, where it merges into the line the cursor is on.
    if (!blank && hasSeveralBlocks(pastedContent)) {
        return pasteBetweenBlocks(contentEditable, firstRoot, htmlString, cursorPosition);
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
    // An item goes by the same rule, and it is the ancestor a selection stops at
    // whenever it runs from the line an item was written as into the list nested under
    // it - the item is what stands between that line and the wrapper holding it, so
    // without it the line is copied as loose words and the wrapper is never reached.
    const isCrossingItems = isSelectionCrossingItems(cursorPosition);
    while (ancestor instanceof HTMLElement &&
        (isInlineFormatting(ancestor) || isSchemaContain(ancestor, [Display.ListWrapper, Display.TableSection, Display.Table]) ||
            (isCrossingItems && isSchemaContain(ancestor, [Display.List])))) {
        const wrapper = ancestor.cloneNode(false) as HTMLElement;
        wrapper.append(...container.childNodes);
        container.appendChild(wrapper);
        ancestor = ancestor.parentElement;
    }

    return container.innerHTML;
}

// Whether the selection runs from one item into another - the line an item was written as and the list
// nested under it being two items of their own. A selection held inside one item carries no list with it.
function isSelectionCrossingItems(cursorPosition: CursorPosition): boolean {
    const startItem = getClosestItem(cursorPosition.startContainer);

    return !!startItem && startItem !== getClosestItem(cursorPosition.endContainer);
}

// The item a node was written in, read by walking the tags standing over it rather than by asking for one
// by name: a tag name is spelled the way the schema spells it, and not every engine matches that spelling.
function getClosestItem(node: Node): Element | null {
    let element = node.nodeType === Node.ELEMENT_NODE ? node as Element : node.parentElement;
    while (element && !isSchemaContain(element, [Display.List])) {
        element = element.parentElement;
    }

    return element;
}

function isInlineFormatting(element: HTMLElement): boolean {
    return isSchemaContain(element, [Display.Link, Display.Collapse]) &&
        !isSchemaContain(element, [Display.FirstLevel]);
}

function cleanPastedContent(htmlString: string, cell: HTMLTableCellElement | null) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');

    // A copied space is all the markup there is, and the parser has no body to put it in: whitespace standing
    // before anything that would open one goes to the head, or nowhere. It is put back as the one space it
    // was, which the blank check reads as the space it stands for.
    if (!doc.body.hasChildNodes() && /^\s+$/.test(htmlString.replace(/<[^>]*>/g, ""))) {
        doc.body.append(" ");
    }

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

// The one block the paste holds, when it holds nothing else: a comment - the fragment markers a browser wraps
// clipboard html in - or whitespace beside it is not content. A list wrapper is a run of lines, not a block.
function getLoneBlock(pastedContent: HTMLElement): HTMLElement | null {
    let block: HTMLElement | null = null;
    for (const child of pastedContent.childNodes) {
        if (child.nodeType === Node.COMMENT_NODE ||
            (child.nodeType === Node.TEXT_NODE && !child.textContent?.trim())) {
            continue;
        }
        if (block || !isSchemaContain(child, [Display.FirstLevel]) || isSchemaContain(child, [Display.ListWrapper])) {
            return null;
        }
        block = child as HTMLElement;
    }

    return block;
}

// A paragraph is the tag a page wraps plain words in, so a run opening or closing with one carries words
// meant for the line they are dropped in, not lines of their own. Such an edge is taken out of the run and
// handed back as the markup it held. Only the two edges go: a paragraph standing between other elements has
// no line of the target to join and keeps one of its own. An edge is taken only where there is text on its
// side of the cursor to join - at either end of a line, and on an empty one, the paragraph continues nothing
// and keeps the line and the tag it came with. A paragraph standing for an empty line is nothing to join
// with either. A run holding a single line is left alone: a lone block already merges into the cursor's line.
function takeEdgeParagraphs(contentEditable: HTMLElement, pastedContent: HTMLElement,
                            cursorPosition: CursorPosition): EdgeParagraphs | null {
    const lines = Array.from(pastedContent.children)
        .filter(child => isSchemaContain(child, [Display.FirstLevel, Display.Table]));
    if (lines.length < 2 || isBlank(pastedContent)) {
        return null;
    }

    // Both ends are read before either is taken: taking the first one would leave the last one standing
    // somewhere else.
    const first = pastedContent.firstElementChild;
    const last = pastedContent.lastElementChild;
    const lead = isCursorAtStartOfBlock(contentEditable, cursorPosition) ? "" : takeParagraph(first);
    const tail = isCursorAtEndOfBlock(contentEditable, cursorPosition) ? "" : takeParagraph(last);
    if (!lead && !tail) {
        return null;
    }

    return {lead: lead, tail: tail};
}

// The markup a paragraph holds, taken out of the run. Anything else is left standing where it is.
function takeParagraph(element: Element | null): string {
    if (!element || element.nodeName !== "P" || isBlank(element)) {
        return "";
    }

    const htmlString = element.innerHTML;
    element.remove();

    return htmlString;
}

// The run is written in three goes. The paragraph taken off its front is inline markup now, so it is pasted
// the way any inline markup is - into the line the cursor is on. The line is then divided, which gives the
// paragraph taken off the back a line to open: the one holding what was written after the cursor. What is
// left of the run goes between the two, the way a pasted run always goes between blocks. With no paragraph
// taken off the back there is nothing to divide the line for, and the run divides it itself.
function pasteAroundBlocks(contentEditable: HTMLElement, pastedContent: HTMLElement, edges: EdgeParagraphs,
                           cursorPosition: CursorPosition): CursorPosition {
    if (edges.lead) {
        cursorPosition = pasteHtml(contentEditable, edges.lead, cursorPosition);
    }

    if (!edges.tail) {
        return pasteBetweenBlocks(contentEditable, getFirstSelectedRoot(contentEditable, cursorPosition),
            pastedContent.innerHTML, cursorPosition);
    }

    // A cursor standing at the start of a line has the line the tail opens already; anywhere else the line
    // is divided for it. A lead is only ever written where words stand on both sides of the cursor, so a
    // line divided here always has content on either side of the break.
    if (!isCursorAtStartOfBlock(contentEditable, cursorPosition)) {
        // Read before the divide: a block keeps standing as the half written before the cursor, and the
        // half is rebuilt from there - the divide can leave it holding tags around nothing. An item is
        // rebuilt with the list it stands in and is gone from here, its markup written anew already.
        const divided = getCursorLine(contentEditable, cursorPosition);
        cursorPosition = newLine(contentEditable, cursorPosition);
        if (divided.isConnected) {
            cursorPosition = removeAndNormalize(contentEditable, divided, [], cursorPosition);
        }
    }

    // The leaf that line opens on, read before the run is placed and kept while it is: placing it rebuilds
    // the markup around the line, and a leaf is the one thing a rebuild keeps, so it is what the line is
    // found by once the run stands there.
    const leaf = getFirstText(getCursorLine(contentEditable, cursorPosition));

    if (pastedContent.firstElementChild) {
        pasteBetweenBlocks(contentEditable, getFirstSelectedRoot(contentEditable, cursorPosition),
            pastedContent.innerHTML, cursorPosition);
    }

    return pasteHtml(contentEditable, edges.tail, getCursorPositionFrom(leaf, 0, leaf, 0));
}

// The line the cursor stands on - the block or the item holding it. A cursor left in a cell stands in no
// block of its own, and there the table it is in stands for the line.
function getCursorLine(contentEditable: HTMLElement, cursorPosition: CursorPosition): HTMLElement {
    return getSelectedBlock(contentEditable, cursorPosition)[0] ??
        getRootElement(contentEditable, cursorPosition.endContainer);
}

// Whether more than one block was pasted. A list wrapper is a first level element too, but one never reaches
// this: a pasted list is placed between blocks above.
function hasSeveralBlocks(pastedContent: HTMLElement) {
    return Array.from(pastedContent.children)
        .filter(child => isSchemaContain(child, [Display.FirstLevel]) &&
            !isSchemaContain(child, [Display.ListWrapper])).length > 1;
}

// Whether the paste holds nothing but whitespace or a single br, whatever block or formatting it was wrapped
// in. Something blank has to be there: tags holding nothing at all are no paste. trim takes a no-break space
// for whitespace too, so a copied nbsp is a blank as well.
function isBlank(pastedContent: Element) {
    const text = pastedContent.textContent ?? "";
    const breaks = pastedContent.querySelectorAll("br").length;

    return !text.trim() &&
        !pastedContent.querySelector(imageSelector) &&
        breaks <= 1 &&
        (breaks === 1 || text.length > 0);
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
