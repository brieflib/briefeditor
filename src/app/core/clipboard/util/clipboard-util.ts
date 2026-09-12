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
import {conformLines, hoistBlocks, lineTag, tableSelector} from "@/core/clipboard/util/paste-conform-util";

interface EdgeBlocks {
    lead: string;
    tail: string;
}

/**
 * Pastes HTML at (or replacing) the cursor position, reshaping the markup so it merges
 * into the surrounding content the way the editor's own lines and lists do.
 *
 * @remarks
 * The line the cursor is on dictates the tag: a pasted line (a paragraph, a heading, a
 * blockquote) only carries words for it, and is rewritten in its shape before anything is
 * placed. A list or a table keeps its own shape and stands beside the line instead.
 *
 * @param contentEditable - The editable root the cursor lives in.
 * @param htmlString - Raw HTML to paste.
 * @param cursorPosition - Where to paste; a non-collapsed selection is deleted first.
 * @returns The cursor position after the paste.
 */
export function pasteHtml(contentEditable: HTMLElement, htmlString: string, cursorPosition: CursorPosition) {
    if (!isCollapsed(cursorPosition)) {
        cursorPosition = deleteContents(cursorPosition);
    }

    // Read after the delete, since the surviving cursor is what says where the markup lands.
    const cell = getCursorCell(contentEditable, cursorPosition);
    const line = getSelectedBlock(contentEditable, cursorPosition)[0];
    const pastedContent = cleanPastedContent(htmlString, cell, line, cursorPosition);
    htmlString = pastedContent.innerHTML;
    if (!htmlString) {
        return cursorPosition;
    }

    // A cell is not a first level element, so its root is the table holding it; the cell
    // stands in as the root instead so the split stays inside it.
    const firstRoot = cell ?? getFirstSelectedRoot(contentEditable, cursorPosition);

    // A line opening or closing the run is words for the cursor's line rather than a line of
    // its own, so it's merged in before the rest of the run is placed the usual way.
    const edges = takeEdgeBlocks(contentEditable, pastedContent, line, cursorPosition);
    if (edges) {
        return pasteAroundBlocks(contentEditable, pastedContent, edges, cursorPosition);
    }

    // A table pasted into a list splits it rather than joining it, so this check comes
    // before the list-root one. A cell never reaches it: tables are unwrapped out already.
    if (hasTable(pastedContent)) {
        return pasteBetweenBlocks(contentEditable, firstRoot, htmlString, cursorPosition);
    }

    // A list stands beside the list the cursor is in rather than inside its item, the same
    // way a pasted table does; convertList later joins same-type lists back into one wrapper.
    if (hasListWrapper(pastedContent)) {
        return pasteBetweenBlocks(contentEditable, firstRoot, htmlString, cursorPosition);
    }

    // A blank paste (whitespace, or the br of a copied empty line) becomes a single space
    // between the words on either side rather than a break or kept formatting. Dropped onto
    // an empty line it's nothing, since a space would leave the line with no br to hold it
    // open. Several brs are lines of their own, handled elsewhere.
    const blank = isBlank(pastedContent);
    if (blank) {
        const target = cell ?? line;
        if (!target || isEmptyBlock(target)) {
            return cursorPosition;
        }
        htmlString = " ";
    } else {
        // A lone line carries only words for the cursor's line, so just its inner markup is
        // merged in and the target keeps its own tag. Conforming writes every line in that
        // tag; only an empty line skips it, keeping the pasted tags. There a paragraph is
        // still words filling the line, while any other block takes the line's place and is
        // placed between blocks instead, since the rebuild would otherwise fold it in.
        const loneBlock = getLoneBlock(pastedContent);
        if (loneBlock && (loneBlock.nodeName === "P" || (line && loneBlock.nodeName === lineTag(line)))) {
            htmlString = loneBlock.innerHTML;
        } else if (loneBlock) {
            return pasteBetweenBlocks(contentEditable, firstRoot, htmlString, cursorPosition);
        }
    }

    if (isSchemaContain(firstRoot, [Display.ListWrapper])) {
        return pasteIntoList(contentEditable, firstRoot, htmlString, cursorPosition);
    }

    // A run of several blocks pasted into a block of the same kind would otherwise be read
    // by the rebuild as a repeat of that tag and collapsed into one line, so it's placed
    // between blocks instead, keeping each block a line of its own.
    if (!blank && hasSeveralBlocks(pastedContent)) {
        return pasteBetweenBlocks(contentEditable, firstRoot, htmlString, cursorPosition);
    }

    // An empty block's br isn't content to keep - it's what the pasted markup replaces - so
    // the block is emptied rather than split around the cursor.
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

/**
 * Serializes the current selection to HTML for the clipboard.
 *
 * @param cursorPosition - The selection to serialize.
 * @returns The selection's HTML, with ancestor tags (link, heading, list, table) re-wrapped
 * around it so a paste can rebuild the same shape.
 */
export function getSelectedHtml(cursorPosition: CursorPosition): string {
    // Serialize from a cloned DOM fragment (not the browser's clipboard HTML) so anchors
    // keep literal href attributes instead of being resolved to absolute URLs.
    const container = document.createElement("div");
    container.appendChild(cloneContents(cursorPosition));

    // range.cloneContents() drops every ancestor that fully contains the selection (a
    // heading a word was selected in, an item's wrapper, a table around selected cells), so
    // shallow clones of those ancestors are rebuilt around the fragment - the only way to
    // keep the source tag (e.g. UL vs OL) and literal href attributes. A cell is the one
    // ancestor left out: a selection held inside one is just words. The climb stops on its
    // own at the editable element, which the schema doesn't name.
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


/**
 * Normalizes raw pasted HTML into a body the rest of the paste pipeline can read: a flat
 * sequence of lines written in the cursor line's tag, lists and tables.
 */
function cleanPastedContent(htmlString: string, cell: HTMLTableCellElement | null, line: HTMLElement | undefined,
                            cursorPosition: CursorPosition) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');

    // A copied space parses to an empty body (whitespace before any tag that would open one
    // goes to the head, or nowhere), so it's put back as the space the blank check expects.
    if (!doc.body.hasChildNodes() && /^\s+$/.test(htmlString.replace(/<[^>]*>/g, ""))) {
        doc.body.append(" ");
    }

    const nodes = doc.querySelectorAll('.Apple-interchange-newline');
    nodes.forEach(node => {
        node.remove();
    });

    replaceDivs(doc.body);

    // Unwrapping drops every list tag, including an item left standing outside its wrapper,
    // so there's no list left to read.
    if (cell) {
        removeImages(doc.body);
        unwrapBlocks(doc.body);
        return doc.body;
    }

    hoistBlocks(doc.body);
    doc.body.querySelectorAll(tableSelector).forEach(table => normalizeTable(table as HTMLTableElement));
    rewriteLists(doc.body, cursorPosition);
    conformLines(doc.body, line);

    return doc.body;
}

/**
 * Rewrites every pasted list run into the shape the editor's own lists take.
 *
 * @remarks
 * A copy can carry a wrapper nested directly under another wrapper (selection running from
 * a nested item into the item below it), which the rebuild would otherwise read as a
 * duplicate wrapper and drop, orphaning the lines after it. It can also carry a bare `<li>`
 * with no wrapper (markup from outside the editor). Parsing each run with {@link parseList}
 * and rebuilding it with {@link normalizeLists} normalizes both cases. The cursor is the
 * editor's own and never sits in pasted content, so it's left untouched.
 *
 * The tree is walked once; a run is rewritten in full as soon as its first line is found, so
 * the walk never revisits the lines after it.
 */
function rewriteLists(parent: Element, cursorPosition: CursorPosition) {
    // Snapshot the children before any run is rewritten.
    for (const child of Array.from(parent.children)) {
        if (!child.isConnected) {
            continue;
        }

        if (isSchemaContain(child, [Display.ListWrapper, Display.List])) {
            const normalized = normalizeLists(parseList(child as HTMLElement), cursorPosition);
            appendBeforeAndDelete(child as HTMLElement, convertList(normalized.lists));
        } else {
            // A bare li with no wrapper: markup pasted from outside the editor.
            rewriteLists(child, cursorPosition);
        }
    }
}

// A cell holds a single line, so a pasted block only survives as its children; a nested
// table is unwrapped the same way, since the editor never nests a table in a cell.
const cellUnwrapSelector = getOfType([Display.FirstLevel, Display.List, Display.Table,
    Display.TableSection, Display.Cell]).join(",");

/**
 * Renames every pasted `div` to a `p`, since the editor only ever writes lines as
 * paragraphs. Done before anything else reads the markup, so a div dropped in a cell is
 * unwrapped along with the schema's other blocks. Attributes are dropped along with the tag.
 */
function replaceDivs(root: ParentNode) {
    // Snapshot the list before replacing, so a div nested in another div is still found and
    // ends up in the paragraph its parent became.
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

/**
 * The single block the paste holds, or `null` if it holds more than one, a list wrapper (a
 * run of lines, not a block), or nothing but a comment/whitespace.
 */
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

/**
 * Pulls a line off either end of a multi-line paste so it can merge into the cursor's line
 * instead of opening a line of its own.
 *
 * @remarks
 * Only the two edges of the run are considered; a block standing between other elements
 * keeps its own line. An edge is taken only where there's text on its side of the cursor to
 * join - not on an empty line, and not for an edge block that's itself empty. A run holding
 * just one line is left alone, since a lone block already merges into the cursor's line.
 */
function takeEdgeBlocks(contentEditable: HTMLElement, pastedContent: HTMLElement, line: HTMLElement | undefined,
                        cursorPosition: CursorPosition): EdgeBlocks | null {
    const lines = Array.from(pastedContent.children)
        .filter(child => isSchemaContain(child, [Display.FirstLevel, Display.Table]));
    if (!line || lines.length < 2 || isBlank(pastedContent)) {
        return null;
    }

    // Both ends are read before either is taken: taking the first one would leave the last one standing
    // somewhere else. Both join the same line - the lead its first half, the tail its second.
    const first = pastedContent.firstElementChild;
    const last = pastedContent.lastElementChild;
    const lead = isCursorAtStartOfBlock(contentEditable, cursorPosition) ? "" : takeEdgeBlock(first, line);
    const tail = isCursorAtEndOfBlock(contentEditable, cursorPosition) ? "" : takeEdgeBlock(last, line);
    if (!lead && !tail) {
        return null;
    }

    return {lead: lead, tail: tail};
}

/**
 * Removes and returns the inner markup of an edge block, if it's a line written in the
 * cursor line's tag (every pasted line is, once conformed). Returns `""` (leaving the block
 * in place) for anything else, including an empty line or a block holding nothing.
 */
function takeEdgeBlock(element: Element | null, line: HTMLElement): string {
    if (!element || element.nodeName !== lineTag(line) || isBlank(element) || isEmptyBlock(element)) {
        return "";
    }

    const htmlString = element.innerHTML;
    element.remove();

    return htmlString;
}

/**
 * Pastes a run whose edges were pulled off by {@link takeEdgeBlocks}: the lead merges into
 * the cursor's line as inline markup, the line is then split to give the tail a line of its
 * own, and what remains of the run is placed between the two halves.
 */
function pasteAroundBlocks(contentEditable: HTMLElement, pastedContent: HTMLElement, edges: EdgeBlocks,
                           cursorPosition: CursorPosition): CursorPosition {
    if (edges.lead) {
        cursorPosition = pasteHtml(contentEditable, edges.lead, cursorPosition);
    }

    if (!edges.tail) {
        return pasteBetweenBlocks(contentEditable, getFirstSelectedRoot(contentEditable, cursorPosition),
            pastedContent.innerHTML, cursorPosition);
    }

    // A cursor at the start of a line already has the line the tail should open; anywhere
    // else the line is split for it (a lead is only ever written with content on both sides
    // of the cursor, so the split always has content on either side of the break).
    if (!isCursorAtStartOfBlock(contentEditable, cursorPosition)) {
        // Read before the split, since the split can leave this block holding empty tags;
        // an item is rebuilt with its list and is gone from here already.
        const divided = getCursorLine(contentEditable, cursorPosition);
        cursorPosition = newLine(contentEditable, cursorPosition);
        if (divided.isConnected) {
            cursorPosition = removeAndNormalize(contentEditable, divided, [], cursorPosition);
        }
    }

    // Read before the run is placed: placing it rebuilds the markup around the line, and a
    // leaf text node is the one thing a rebuild keeps, so it's used to relocate the line.
    const leaf = getFirstText(getCursorLine(contentEditable, cursorPosition));

    if (pastedContent.firstElementChild) {
        pasteBetweenBlocks(contentEditable, getFirstSelectedRoot(contentEditable, cursorPosition),
            pastedContent.innerHTML, cursorPosition);
    }

    return pasteHtml(contentEditable, edges.tail, getCursorPositionFrom(leaf, 0, leaf, 0));
}

/**
 * The block or item the cursor stands on. A cursor left in a cell stands in no block of its
 * own, so the cell's table is used instead.
 */
function getCursorLine(contentEditable: HTMLElement, cursorPosition: CursorPosition): HTMLElement {
    return getSelectedBlock(contentEditable, cursorPosition)[0] ??
        getRootElement(contentEditable, cursorPosition.endContainer);
}

/**
 * Whether more than one (non-list-wrapper) block was pasted. A pasted list is always placed
 * between blocks separately, so list wrappers are excluded here.
 */
function hasSeveralBlocks(pastedContent: HTMLElement) {
    return Array.from(pastedContent.children)
        .filter(child => isSchemaContain(child, [Display.FirstLevel]) &&
            !isSchemaContain(child, [Display.ListWrapper])).length > 1;
}

/**
 * Whether the paste holds nothing but whitespace or a single `br`. `trim` treats a
 * no-break space as whitespace too, so a copied nbsp counts as blank as well.
 */
function isBlank(pastedContent: Element) {
    const text = pastedContent.textContent ?? "";
    const breaks = pastedContent.querySelectorAll("br").length;

    return !text.trim() &&
        !pastedContent.querySelector(imageSelector) &&
        breaks <= 1 &&
        (breaks === 1 || text.length > 0);
}

/** Whether a table was pasted; hoisting already leaves every table as a top-level child. */
function hasTable(pastedContent: HTMLElement) {
    return Array.from(pastedContent.children).some(child => isSchemaContain(child, [Display.Table]));
}

/**
 * Places pasted markup between blocks rather than merging it into the target block - the
 * placement a list or table needs, since normalization can't lift either out of a block the
 * way it can a heading or paragraph.
 */
function pasteBetweenBlocks(contentEditable: HTMLElement, firstRoot: HTMLElement, htmlString: string, cursorPosition: CursorPosition) {
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

    // A pasted list ends up standing beside the list it was dropped into; convertList reads
    // the two as one run and joins them back into a single wrapper wherever the type matches.
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

/** Pastes markup into a list item, lifting any pasted blocks out as siblings of the list. */
function pasteIntoList(contentEditable: HTMLElement, firstRoot: HTMLElement, htmlString: string, cursorPosition: CursorPosition) {
    // An empty item's br is what the pasted markup replaces, same as for an empty block.
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
