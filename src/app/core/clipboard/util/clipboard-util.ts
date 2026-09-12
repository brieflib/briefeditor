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
import {convertList, normalizeLists, parseList} from "@/core/list/type/list-class";
import {appendBeforeAndDelete} from "@/core/list/util/list-util";
import {getCursorCell, getFirstCell} from "@/core/cursor/util/cursor-util";
import {getCellCursorPosition, normalizeTable} from "@/core/command/util/table-util";

interface EdgeBlocks {
    lead: string;
    tail: string;
}

export function pasteHtml(contentEditable: HTMLElement, htmlString: string, cursorPosition: CursorPosition) {
    if (!isCollapsed(cursorPosition)) {
        cursorPosition = deleteContents(cursorPosition);
    }

    // Read after the delete: it is the surviving cursor that says where the markup lands.
    const cell = getCursorCell(contentEditable, cursorPosition);
    const pastedContent = cleanPastedContent(htmlString, cell, cursorPosition);
    htmlString = pastedContent.innerHTML;
    if (!htmlString) {
        return cursorPosition;
    }

    // A cell is not a first level element, so its root is the table holding it. Closing the tags on that
    // root would rebuild every row onto the table element itself, so the cell stands in as the root and
    // the split stays inside it.
    const firstRoot = cell ?? getFirstSelectedRoot(contentEditable, cursorPosition);

    // The paragraphs a run opens and closes with - or the blocks of the kind the cursor's line is written in -
    // are words of that line rather than lines of their own, so they are taken out of the run before anything
    // is placed and written into that line. What is left of the run goes on being placed the way it always is.
    const edges = takeEdgeBlocks(contentEditable, pastedContent, cursorPosition);
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
        // A paragraph on its own is dropped into the line the cursor is on - a block or an item - so the tag
        // it was written in has no line of its own to name: it is what a page wraps plain words in, and the
        // words go on the line they are dropped on, whatever tag that line is written in. The rebuild keeps
        // the innermost block standing over a leaf, which would set the pasted words in a line of the pasted
        // tag between the two halves of the target, so only what stood inside the paragraph goes in and the
        // target keeps its tag. A block of the kind the cursor's line is written in goes the same way: a copy
        // carries the block it was taken from, so words copied out of a heading come back as a heading, and
        // dropped in a heading they are words of it. Any other block carries a line of its own and opens one,
        // which is the run of blocks path: placed between blocks, since a lone block of the tag it was
        // dropped into is read by the rebuild as a repeat of that tag and folded into the target's line. An
        // item is the line inside a list, and no lone block is one, so there every block but a paragraph
        // divides the list.
        const loneBlock = getLoneBlock(pastedContent);
        const line = getSelectedBlock(contentEditable, cursorPosition)[0];
        if (loneBlock && (isSchemaContain(loneBlock, [Display.Paragraph]) || loneBlock.nodeName === line?.nodeName)) {
            htmlString = loneBlock.innerHTML;
        } else if (loneBlock) {
            return pasteBetweenBlocks(contentEditable, firstRoot, htmlString, cursorPosition);
        }
    }

    if (isSchemaContain(firstRoot, [Display.ListWrapper])) {
        return pasteIntoList(contentEditable, firstRoot, htmlString, cursorPosition);
    }

    // A run of blocks pasted into a block of the same kind is read by the rebuild as a repeat of the tag it was
    // dropped into and thrown away, which leaves every line collapsed into the one line of the target. The run
    // is placed between blocks instead, the way a pasted list or table is, so each block keeps a line of its
    // own. Only a lone paragraph reaches the path below, standing by then for the words it held.
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

    // range.cloneContents() drops every ancestor that fully contains the selection - the strong or the
    // link a double-click selects inside, the heading a word was selected in, the item and the wrapper a
    // selection held inside one item stands in. The fragment is re-wrapped in shallow clones of those
    // ancestors so the copy carries the tags the selection was made in: words copied out of a heading come
    // as a heading, words copied out of an item come as a list, and the paste makes of that what it makes of
    // any pasted block or list. The shallow clone keeps the source tag, which is the only place where UL and
    // OL can still be told apart, and keeps href attributes literally. The rows and the table around
    // selected cells go the same way, and without them the cells do not survive the parse the paste puts
    // them through: the tags of a cell outside a table are thrown away. A cell is the one ancestor not put
    // back: a selection held inside one is words, and only a selection crossing a cell carries a table. The
    // climb stops on its own at the editable element, which the schema does not name.
    let ancestor: Node | null = cursorPosition.range.commonAncestorContainer;
    if (ancestor.nodeType !== Node.ELEMENT_NODE) {
        ancestor = ancestor.parentElement;
    }
    while (ancestor instanceof HTMLElement &&
        isSchemaContain(ancestor, [Display.Link, Display.Collapse, Display.FirstLevel, Display.List,
            Display.TableSection, Display.Table])) {
        const wrapper = ancestor.cloneNode(false) as HTMLElement;
        wrapper.append(...container.childNodes);
        container.appendChild(wrapper);
        ancestor = ancestor.parentElement;
    }

    return container.innerHTML;
}


function cleanPastedContent(htmlString: string, cell: HTMLTableCellElement | null, cursorPosition: CursorPosition) {
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

    replaceDivs(doc.body);

    // The unwrap drops every list tag, an item standing outside a wrapper with the rest, so there is no list
    // left to read.
    if (cell) {
        removeImages(doc.body);
        unwrapBlocks(doc.body);
        return doc.body;
    }

    hoistTables(doc.body);
    doc.body.querySelectorAll(tableSelector).forEach(table => normalizeTable(table as HTMLTableElement));
    rewriteLists(doc.body, cursorPosition);

    return doc.body;
}

// A copy carries the shape the selection was made in, not the shape of a list: a selection running from a
// nested item into the item below it comes as a wrapper opening on an item that holds nothing but the nested
// list. The rebuild reads a wrapper opening on a wrapper as a duplicate and drops it from every line under
// it, which leaves the lines written after the nested list as items with no wrapper at all. So every pasted
// run is read the way the editor reads its own lists and written back from its lines before it is placed:
// the item holding no line goes, and the lines that follow it are levelled to follow from one another. An
// item pasted with no wrapper around it - content copied inside the editor keeps its wrapper, so one comes
// from outside - is a line of the run it stands in and is read with it, which is what gives it the wrapper
// the rest of the paste expects to find; parseList says what it is read as. The cursor is the editor's and
// stands in none of the pasted lines, so it comes back untouched.
//
// The pasted tree is walked once. A run is read where its first line is met, and the rewrite takes the
// whole run out and puts a new one in its place, so the lines after the first are gone by the time the walk
// reaches them. A run inside a wrapper is a nested list and is read with the run holding it, so only what is
// no line of a run is walked into: a block the parser left an orphaned item in.
function rewriteLists(parent: Element, cursorPosition: CursorPosition) {
    // The children are taken before any run is rewritten.
    for (const child of Array.from(parent.children)) {
        if (!child.isConnected) {
            continue;
        }

        if (isSchemaContain(child, [Display.ListWrapper, Display.List])) {
            const normalized = normalizeLists(parseList(child as HTMLElement), cursorPosition);
            appendBeforeAndDelete(child as HTMLElement, convertList(normalized.lists));
        } else {
            // If li without wrapper is pasted. The case of copying from an external editor.
            rewriteLists(child, cursorPosition);
        }
    }
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

// The editor knows no div of its own - it writes every line it opens as a paragraph - so a pasted one is
// read as the paragraph it stands for, and the words it holds go on the line they are dropped on the way any
// pasted paragraph's do. It is renamed before anything else reads the markup, which is also what lets one
// dropped in a cell be unwrapped with the other blocks: the tags a cell unwraps are the ones the schema
// names, and a div is not among them. The attributes stay behind with the tag, as the rebuild leaves none.
function replaceDivs(root: ParentNode) {
    // The list is taken before any of it is replaced, so a div nested in another is still in it and is
    // replaced in the paragraph its parent became.
    root.querySelectorAll("div").forEach(div => {
        const paragraph = document.createElement("P");
        paragraph.append(...div.childNodes);
        div.replaceWith(paragraph);
    });
}

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
// meant for the line they are dropped in, not lines of their own. A block of the kind that line is written
// in carries words of it the same way: a copy carries the block it was taken from, and a heading copied with
// the paragraph below it and dropped in a heading opens with words of that heading. Such an edge is taken
// out of the run and handed back as the markup it held. Only the two edges go: a block standing between
// other elements has no line of the target to join and keeps one of its own. An edge is taken only where
// there is text on its side of the cursor to join - at either end of a line, and on an empty one, the block
// continues nothing and keeps the line and the tag it came with. A block standing for an empty line is
// nothing to join with either. A run holding a single line is left alone: a lone block already merges into
// the cursor's line.
function takeEdgeBlocks(contentEditable: HTMLElement, pastedContent: HTMLElement,
                        cursorPosition: CursorPosition): EdgeBlocks | null {
    const lines = Array.from(pastedContent.children)
        .filter(child => isSchemaContain(child, [Display.FirstLevel, Display.Table]));
    if (lines.length < 2 || isBlank(pastedContent)) {
        return null;
    }

    // Both ends are read before either is taken: taking the first one would leave the last one standing
    // somewhere else. Both join the same line - the lead its first half, the tail its second - so both are
    // measured against the tag it is written in. Inside a list that line is an item, which no block is.
    const line = getSelectedBlock(contentEditable, cursorPosition)[0];
    const first = pastedContent.firstElementChild;
    const last = pastedContent.lastElementChild;
    const lead = isCursorAtStartOfBlock(contentEditable, cursorPosition) ? "" : takeEdgeBlock(first, line);
    const tail = isCursorAtEndOfBlock(contentEditable, cursorPosition) ? "" : takeEdgeBlock(last, line);
    if (!lead && !tail) {
        return null;
    }

    return {lead: lead, tail: tail};
}

// The markup a paragraph, or a block of the line's own kind, holds, taken out of the run. Anything else is
// left standing where it is, and so is a block holding nothing to join a line with: one standing for an
// empty line, and one holding nothing at all - tags around nothing are no words to continue a line with.
function takeEdgeBlock(element: Element | null, line: HTMLElement | undefined): string {
    if (!element || !isSchemaContain(element, [Display.FirstLevel]) ||
        !(isSchemaContain(element, [Display.Paragraph]) || element.nodeName === line?.nodeName) ||
        isBlank(element) || isEmptyBlock(element)) {
        return "";
    }

    const htmlString = element.innerHTML;
    element.remove();

    return htmlString;
}

// The run is written in three goes. The block taken off its front is inline markup now, so it is pasted the
// way any inline markup is - into the line the cursor is on. The line is then divided, which gives the block
// taken off the back a line to open: the one holding what was written after the cursor. What is left of the
// run goes between the two, the way a pasted run always goes between blocks. With no block taken off the
// back there is nothing to divide the line for, and the run divides it itself.
function pasteAroundBlocks(contentEditable: HTMLElement, pastedContent: HTMLElement, edges: EdgeBlocks,
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
