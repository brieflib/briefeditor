import {Leaf, LeafGroup} from "@/core/normalize/type/leaf";
import tagHierarchy, {TagHierarchy} from "@/core/normalize/type/tag-hierarchy";
import {Display, isSchemaContain, isSchemaContainNodeName} from "@/core/normalize/type/schema";
import {CursorPosition, getCursorPositionFrom} from "@/core/shared/type/cursor-position";
import {
    getBlockElement,
    hasSelfCloseDescendant,
    imageBlockClass,
    imageSizeClasses
} from "@/core/shared/element-util";
import {Carrier} from "@/core/carrier/carrier";
import {Attributes} from "@/core/command/type/command";
import {applyAttributes} from "@/core/command/util/command-util";
import {AvailableClasses} from "@/core/shared/available-classes";

/**
 * Rebuilds a detached fragment into the schema: every leaf is read with the tags that stood
 * over it, any of `tagsToRemove` is dropped, the rest are ordered by the tag hierarchy with
 * consecutive duplicates removed.
 *
 * @returns A new fragment built of cloned elements around the leaves themselves, which are
 * moved out of `toNormalize`.
 */
export function normalizeNew(contentEditable: Node,
                             block: DocumentFragment) {
    const leaves = getTextNodes(block)
        .map(textNode => toLeafWithParents(contentEditable, textNode))
        .map(leaf => divideFirstLevels(leaf))
        .map(leaf => sortLeafParents(leaf))
        .map(leaf => removeSelfCloseInlines(leaf))
        .map(leaf => removeConsecutiveDuplicates(leaf));

    return collapseLeavesNew(leaves, document.createDocumentFragment()) as DocumentFragment;
}

export function normalizeRemoveNew(contentEditable: Node,
                                   toNormalize: DocumentFragment,
                                   tagsToRemove: string[] = []) {
    const leaves = getTextNodes(toNormalize)
        .map(textNode => toLeafWithParents(contentEditable, textNode))
        .map(leaf => sortLeafParents(leaf))
        .filter(leaf => filterLeafParentsNew(tagsToRemove, leaf))
        .map(leaf => removeSelfCloseInlines(leaf))
        .map(leaf => removeConsecutiveDuplicates(leaf));

    return collapseLeavesNew(leaves, document.createDocumentFragment()) as DocumentFragment;
}

/**
 * Rebuilds a detached fragment into the schema, replacing the selected `blocks`, list items or lines, with
 * `targetTags`. A line the replacement left in a list is divided out of it.
 */
export function normalizeReplaceBlockNew(contentEditable: Node,
                                         toNormalize: DocumentFragment,
                                         blocks: Node[],
                                         targetTags: string[]) {
    // Leaves under the same block share its replacement, so they collapse into one block again
    const replacements = new Map<Node, HTMLElement[]>();
    const leaves = getTextNodes(toNormalize)
        .map(textNode => toLeafWithParents(contentEditable, textNode))
        .map(leaf => replaceLeafParentsNew(blocks, targetTags, replacements, leaf))
        .map(leaf => divideFirstLevels(leaf))
        .map(leaf => sortLeafParents(leaf))
        .map(leaf => removeConsecutiveDuplicates(leaf));

    return collapseLeavesNew(leaves, document.createDocumentFragment()) as DocumentFragment;
}

/**
 * Rebuilds the block holding the carrier, dropping `tagsToRemove` from the carrier's parents only. Self-closing
 * leaves keep their inline tags, so an empty line like <strong><br></strong> stays as it is.
 */
export function normalizeCarrierNew(contentEditable: Node,
                                    toNormalize: DocumentFragment,
                                    carrierText: Text,
                                    tagsToRemove: string[]) {
    const leaves = getTextNodes(toNormalize)
        .map(textNode => toLeafWithParents(contentEditable, textNode))
        .map(leaf => leaf.getParents().at(-1) === carrierText ? filterLeafParentsNew(tagsToRemove, leaf) : leaf)
        .map(leaf => sortLeafParents(leaf))
        .map(leaf => removeConsecutiveDuplicates(leaf));

    return collapseLeavesNew(leaves, document.createDocumentFragment()) as DocumentFragment;
}


/** Collects the text nodes and the empty elements, such as an empty cell, which have no text node to stand for them. */
export function getTextNodes(element: Node, textNodes: Node[] = []) {
    if (element instanceof Text && (element.data || element === Carrier.getInstance().getCarrier())) {
        textNodes.push(element);
    }

    if (isSchemaContain(element, [Display.SelfClose])) {
        textNodes.push(element);
    }

    // A cell holding a br or an image already has a leaf inside, so only a truly empty cell stands for itself
    if (isSchemaContain(element, [Display.Cell]) && !element.textContent && !hasSelfCloseDescendant(element)) {
        textNodes.push(element);
    }

    for (const child of element.childNodes) {
        getTextNodes(child, textNodes);
    }

    return textNodes;
}

export function maybeInsertCarrier(contentEditable: HTMLElement, tags: string[], cursorPosition: CursorPosition) {
    const carrier = Carrier.getInstance();
    const firstTag = tags.at(0);
    if (firstTag && tags.length === 1 && carrier.isInsertAllowed(cursorPosition)) {
        carrier.insertCarrier(cursorPosition, firstTag);
        const carrierText = carrier.getCarrier();
        if (carrierText instanceof Text) {
            const range = new Range();
            range.selectNodeContents(getBlockElement(contentEditable, carrierText));
            range.insertNode(normalizeCarrierNew(contentEditable, range.extractContents(), carrierText, tags));
        }
        return true;
    }

    return false;
}

export function toLeafWithParents(findTill: Node, leafNode: Node, leaf: Leaf = new Leaf()) {
    if (findTill === leafNode) {
        return leaf;
    }

    let parent = leafNode.parentElement;

    leaf.unshiftParent(leafNode);
    while (parent && parent !== findTill) {
        leaf.unshiftParent(parent);
        parent = parent.parentElement;
    }

    return leaf;
}

export function filterLeafParentsNew(tagsToRemove: string[], leaf: Leaf) {
    const clearedParents = leaf.getParents().filter(parent => !tagsToRemove.includes(parent.nodeName));
    leaf.setParents(clearedParents);

    return leaf;
}

/**
 * Replaces the leaf's closest selected block with `tagsToReplace` elements. A leaf outside the selected blocks is
 * left as is.
 */
export function replaceLeafParentsNew(blocks: Node[],
                                      tagsToReplace: string[],
                                      replacements: Map<Node, HTMLElement[]>,
                                      leaf: Leaf) {
    const parents = leaf.getParents();
    // Parents go from the most distant one to the leaf itself, so the last selected one is the closest
    const blockIndex = parents.findLastIndex(parent => blocks.includes(parent));
    const block = parents[blockIndex];
    if (!block) {
        return leaf;
    }

    const {start, end} = getReplacedRange(parents, blockIndex, tagsToReplace);
    // Keyed by the block, so every list item or line becomes a block of its own
    const replacement = getReplacement(replacements, block, tagsToReplace);
    leaf.setParents([...parents.slice(0, start), ...replacement, ...parents.slice(end)]);

    return leaf;
}

/**
 * Returns the parents the replacement takes the place of: the closest wrapper of the item for a lone wrapper, the
 * item with its wrapper for anything else, or the line itself.
 */
function getReplacedRange(parents: Node[], blockIndex: number, tagsToReplace: string[]) {
    const hasWrapper = isSchemaContain(parents[blockIndex - 1], [Display.ListWrapper]);
    if (!hasWrapper) {
        return {start: blockIndex, end: blockIndex + 1};
    }

    const isWrapperOnly = tagsToReplace.length === 1 && isSchemaContainNodeName(tagsToReplace[0], [Display.ListWrapper]);
    if (isWrapperOnly) {
        return {start: blockIndex - 1, end: blockIndex};
    }

    return {start: blockIndex - 1, end: blockIndex + 1};
}

/**
 * Keeps the parents from the leaf's closest first level on when a line stands among several first levels. A line
 * can't hold or be held by another first level, while lists nested in list items stay as they are.
 */
export function divideFirstLevels(leaf: Leaf) {
    const parents = leaf.getParents();
    const firstLevels = parents.filter(parent => isSchemaContain(parent, [Display.FirstLevel]));
    const hasLine = firstLevels.some(parent => isSchemaContain(parent, [Display.Line]));
    const closest = firstLevels.at(-1);
    if (!hasLine || firstLevels.length < 2 || !closest) {
        return leaf;
    }

    leaf.setParents(parents.slice(parents.indexOf(closest)));

    return leaf;
}

/** Returns the elements standing for the source element, creating them when it's replaced for the first time. */
function getReplacement(replacements: Map<Node, HTMLElement[]>, source: Node, tagsToReplace: string[]) {
    let replacement = replacements.get(source);
    if (!replacement) {
        replacement = tagsToReplace.map(tag => document.createElement(tag));
        replacements.set(source, replacement);
    }

    return replacement;
}

/** Drops the inline tags around a self-closing leaf such as an image or a br, since it holds nothing inline to tag. */
export function removeSelfCloseInlines(leaf: Leaf) {
    const parents = leaf.getParents();

    // The last parent is the leaf itself
    const leafNode = parents.at(-1);
    const isSelfClose = isSchemaContain(leafNode, [Display.SelfClose]);
    if (!isSelfClose) {
        return leaf;
    }

    const parentsWithoutInlines = parents.filter(parent =>
        !isSchemaContain(parent, [Display.Collapse, Display.Link]) ||
        isSchemaContain(parent, [Display.ListWrapper]));
    leaf.setParents(parentsWithoutInlines);

    return leaf;
}

export function collapseLeavesNew(leaves: Leaf[],
                                  container: Node = document.createDocumentFragment()): Node {
    const parent = getSameFirstParent(leaves);

    for (const leafGroup of parent) {
        let firstParentElement = shiftFirstParent(leafGroup.leaves);
        firstParentElement = clearNode(firstParentElement);

        if (!firstParentElement) {
            return container;
        }
        insertToContainer(container, collapseLeavesNew(leafGroup.leaves, firstParentElement));
    }

    return container;
}

/**
 * Hands back the node the leaves are collapsed into, emptied: a clone takes the node's place, so
 * the node itself is left as it stands.
 */
function clearNode(node: Node | undefined) {
    if (!node) {
        return;
    }

    if (node instanceof Text) {
        return node;
    }

    if (node instanceof HTMLElement) {
        const cleared = node.cloneNode(false) as HTMLElement;
        node.replaceWith(cleared);
        cleared.append(...node.childNodes);
        removeAttributesNew(node);
    }

    return node;
}

/** Drops every attribute but a link's href and the editor's own classes (the image block mark and sizes); any other class goes. */
function removeAttributesNew(element: HTMLElement) {
    const kept = AvailableClasses.getInstance().getClasses().filter((name) => element.classList.contains(name));
    for (const name of element.getAttributeNames()) {
        if (name === "href" || name === "src") {
            continue;
        }
        element.removeAttribute(name);
    }

    if (kept.length) {
        element.className = kept.join(" ");
    }
}

/** Returns a cursor position spanning the inserted nodes together with their neighbouring siblings, taken whole. */
export function getInvolvedCursorPosition(first: Node | undefined, last: Node | undefined) {
    if (!first || !last) {
        return;
    }

    const range = new Range();
    range.setStartBefore(getSiblingWithContent(first, node => node.previousSibling));
    range.setEndAfter(getSiblingWithContent(last, node => node.nextSibling));

    return getCursorPositionFrom(range.startContainer, range.startOffset, range.endContainer, range.endOffset);
}

/**
 * Returns the closest sibling holding content, passing over the empty text nodes and emptied tags an extraction leaves
 * where it cut. Without one, returns the farthest empty sibling or the node itself, so the rebuild still drops them.
 */
function getSiblingWithContent(node: Node, next: (node: Node) => Node | null) {
    let farthest = node;
    let sibling = next(node);

    while (sibling && !sibling.textContent) {
        farthest = sibling;
        sibling = next(sibling);
    }

    return sibling ?? farthest;
}

/**
 * Appends the collapsed content to the container it belongs in, joining it with the leaf before
 * it when both are text.
 */
function insertToContainer(container: Node, insert: Node) {
    const previousText = container.lastChild;

    if (previousText instanceof Text && insert instanceof Text) {
        previousText.appendData(insert.data);
        return;
    }

    container.appendChild(insert);
}

export function wrapInTagNew(documentFragment: DocumentFragment, tag: string, attributes?: Attributes) {
    const wrapper = document.createElement(tag);
    applyAttributes(wrapper, attributes);
    wrapper.appendChild(documentFragment);
    const documentFragmentWrappedInTag = document.createDocumentFragment();
    documentFragmentWrappedInTag.appendChild(wrapper);
    return documentFragmentWrappedInTag;
}

export function getLeafNodes(element: Node, leafNodes: Node[] = []) {
    if ((element.nodeType === Node.TEXT_NODE && element.textContent) ||
        element === Carrier.getInstance().getCarrier() ||
        isSchemaContain(element, [Display.SelfClose]) ||
        isEmptyCell(element)) {
        leafNodes.push(element);
        return leafNodes;
    }

    for (const child of element.childNodes) {
        getLeafNodes(child, leafNodes);
    }

    return leafNodes;
}

/**
 * An empty cell holds no br to stand in for content, so it's treated as its own leaf -
 * otherwise the collapse would have nothing to rebuild it from and drop it from the table.
 */
function isEmptyCell(element: Node) {
    return isSchemaContain(element, [Display.Cell]) && !element.textContent;
}

export function setLeafParents(findTill: Node, leafNode: Node, leaf: Leaf = new Leaf()) {
    const parents: HTMLElement[] = [];
    let parent = leafNode.parentElement;

    while (parent && parent !== findTill) {
        parents.unshift(parent);
        parent = parent.parentElement;
    }

    for (const add of parents) {
        leaf.addParent(add);
    }
    leaf.addParent(leafNode);

    return leaf;
}

export function sortLeafParents(toSort: Leaf) {
    const sortedParents = toSort
        .getParents()
        .map(element => ({
            element: element,
            priority: tagHierarchy.get(element.nodeName) ?? -1
        } as TagHierarchy))
        .sort((first, second) => {
            if (isSchemaContain(first.element, [Display.ListWrapper, Display.List]) && isSchemaContain(second.element, [Display.ListWrapper, Display.List])) {
                return 0;
            }
            return second.priority - first.priority
        })
        .map(item => item.element);
    toSort.setParents(sortedParents);

    return toSort;
}

export function collapseLeaves(leaves: Leaf[],
                               container: DocumentFragment = nodeToFragment(document.createElement("div"))): DocumentFragment {
    const parent = getSameFirstParent(leaves);

    for (const leafGroup of parent) {
        let firstParentElement = shiftFirstParent(leafGroup.leaves);
        firstParentElement = clearElementHTML(firstParentElement);

        if (!firstParentElement) {
            return container;
        }
        insertAfterLastChild(container, collapseLeaves(leafGroup.leaves, nodeToFragment(firstParentElement)));
    }

    return container;
}

export function getSameFirstParent(leaves: Leaf[]): LeafGroup[] {
    const sameConsecutive: LeafGroup[] = [];
    let leafGroup: LeafGroup = {leaves: []};

    if (leaves.length === 1) {
        leafGroup.leaves = leaves;
        return [leafGroup];
    }

    for (let i = 0; i < leaves.length; i++) {
        const leaf = leaves[i];
        const nextLeaf = leaves[i + 1];

        if (leaf) {
            leafGroup.leaves.push(leaf);
        }

        if (!willElementsMerge(leaf?.getParents()[0], nextLeaf?.getParents()[0])) {
            sameConsecutive.push(leafGroup);
            leafGroup = {leaves: []};
        }
    }

    return sameConsecutive;
}

function willElementsMerge(element: Node | undefined, compareTo: Node | undefined) {
    if (!element && !compareTo) {
        return true;
    }

    if (element === compareTo) {
        return true;
    }

    if (element?.nodeName === compareTo?.nodeName && isSchemaContain(element, [Display.Collapse])) {
        return true;
    }

    return false;
}

export function filterLeafParents(element: Node, tagsToRemove: string[], leaf: Leaf) {
    const leafParents = leaf.getParents();

    if (leafParents.includes(element)) {
        leaf.setParents(leaf.getParents().filter(parent => !tagsToRemove.includes(parent.nodeName)));
    }

    return leaf;
}

export function replaceLeafParents(element: Node, replaceToElement: HTMLElement[], replaceFrom: string[], leaf: Leaf, isClosest = false) {
    if (leaf.getParents() && leaf.getParents().includes(element)) {
        const parents = leaf.getParents()
            .flatMap(parent => {
                if (isClosest && !Array.from(parent.childNodes).some(child => child === element)) {
                    return parent;
                }

                if (replaceFrom.includes(parent.nodeName)) {
                    return replaceToElement;
                }

                return parent;
            });
        leaf.setParents(parents);
    }

    return leaf;
}

export function extractFirstLevel(leaf: Leaf): Leaf {
    const parents = leaf.getParents();
    const innermost = parents
        .map((parent, index) => isBlockFirstLevel(parent) ? index : -1)
        .reduce((last, index) => index > last ? index : last, -1);

    if (innermost < 0) {
        return leaf;
    }

    const result = parents.filter((parent, index) =>
        index >= innermost || !isContainer(parent));
    leaf.setParents(result);

    return leaf;
}

function isBlockFirstLevel(node: Node) {
    return isSchemaContain(node, [Display.FirstLevel]) &&
        !isSchemaContain(node, [Display.ListWrapper]);
}

function isContainer(node: Node) {
    return isSchemaContain(node, [Display.FirstLevel, Display.List]);
}

export function removeConsecutiveDuplicates(leaf: Leaf): Leaf {
    const parents = leaf.getParents();

    if (parents.length === 0) {
        return leaf;
    }

    const result: Node[] = [];

    for (let i = 0; i <= parents.length; i++) {
        const parent = parents[i];
        const nextParent = parents[i + 1];

        if (!parent) {
            continue;
        }

        if (i === 0 && !hasDuplicateList(parent)) {
            result.push(parent);
        }
        if (!nextParent) {
            continue;
        }

        if (hasDuplicateList(nextParent)) {
            continue;
        }
        if (isSchemaContain(nextParent, [Display.ListWrapper])) {
            result.push(nextParent);
            continue;
        }
        if (parent.nodeName !== nextParent.nodeName) {
            result.push(nextParent);
        }
    }

    leaf.setParents(result);

    return leaf;
}

/**
 * Re-anchors a cursor endpoint resting on an element (rather than a leaf) onto the leaf its
 * offset points at - typically the br of an empty block, the very node the browser anchors
 * on once that block is typed into.
 *
 * @remarks
 * Only leaves keep their identity through a collapse (every parent is cloned), so an
 * element-anchored cursor wouldn't survive one, and no character offset can name a br
 * directly since it holds no text. An element with no leaves at all is left untouched.
 */
export function anchorCursorOnLeaf(cursor: CursorPosition): CursorPosition {
    const start = anchorContainerOnLeaf(cursor.startContainer, cursor.startOffset);
    const end = anchorContainerOnLeaf(cursor.endContainer, cursor.endOffset);

    if (start.container === cursor.startContainer && end.container === cursor.endContainer) {
        return cursor;
    }

    return getCursorPositionFrom(start.container, start.offset, end.container, end.offset);
}

function anchorContainerOnLeaf(container: Node, offset: number) {
    if (container.nodeType !== Node.ELEMENT_NODE) {
        return {container: container, offset: offset};
    }

    const leafNodes = getLeafNodes(container);
    const child = container.childNodes[offset];
    // An offset standing before a list nested in an item is the end of the item's own line,
    // not the start of the nested item's: the cursor belongs at the end of the leaf before it.
    if (child && isSchemaContain(child, [Display.ListWrapper])) {
        const lineEnd = leafNodes.filter(leaf => leaf.compareDocumentPosition(child) & Node.DOCUMENT_POSITION_FOLLOWING).pop();
        if (lineEnd) {
            return {container: lineEnd, offset: lineEnd.textContent?.length ?? 0};
        }
    }

    const following = child && leafNodes.find(leaf => leaf === child || child.contains(leaf));
    if (following) {
        return {container: following, offset: 0};
    }

    // The offset points past the last child, so the cursor belongs at the end of the last leaf.
    const preceding = leafNodes[leafNodes.length - 1];
    if (!preceding) {
        return {container: container, offset: offset};
    }

    return {container: preceding, offset: preceding.textContent?.length ?? 0};
}

export function maybeAppendCarrier(documentFragment: DocumentFragment) {
    if (!documentFragment.textContent && Carrier.getInstance().isCursorCollapsed()) {
        const carrier = document.createTextNode("");
        Carrier.getInstance().setCarrier(carrier);
        documentFragment.appendChild(carrier);
    }
}

function hasDuplicateList(node: Node | undefined) {
    if (!node) {
        return false;
    }

    if (isSchemaContain(node, [Display.List])) {
        if (isSchemaContain(node.firstChild, [Display.ListWrapper])) {
            return true;
        }
    }

    if (isSchemaContain(node, [Display.ListWrapper])) {
        const li = (node as HTMLElement).querySelectorAll("li")[0];
        if (li && isSchemaContain(li.firstChild, [Display.ListWrapper])) {
            return true;
        }
    }

    return false;
}

export function nodeToFragment(node: Node) {
    const fragment = new DocumentFragment();
    fragment.appendChild(node);
    return fragment;
}

function insertAfterLastChild(container: DocumentFragment, insertElement: DocumentFragment) {
    const containerChild = container.lastChild;
    const insertNode = insertElement.firstChild;

    if (!containerChild || !insertNode) {
        return;
    }

    const previousText = asText(containerChild.lastChild);
    const insertText = asText(insertNode);

    // Two text leaves combine into one node - the whole of what the insert had to give.
    if (previousText && insertText) {
        mergeText(previousText, insertText);
        return;
    }

    if (insertElement.textContent || hasSelfCloseDescendant(insertElement) || holdsCarrier(insertElement) ||
        holdsCell(insertElement)) {
        containerChild.appendChild(insertElement);
    }
}

/** Whether an empty cell is kept in the fragment, so its table isn't thrown away for holding no text. */
function holdsCell(fragment: DocumentFragment) {
    return !!fragment.querySelector("th, td");
}

function asText(node: Node | null): Text | null {
    return node && node.nodeType === Node.TEXT_NODE ? node as Text : null;
}

function holdsCarrier(insertElement: DocumentFragment) {
    return Carrier.getInstance().isCarrierExist() && insertElement.contains(Carrier.getInstance().getCarrier());
}

/**
 * Merges two adjacent text leaves. When both carry text, a fresh node replaces the original
 * rather than appending in place - appending while detached is a change the history
 * MutationObserver can't see, which would lose the leaf's pre-merge text on undo. When one
 * side is empty the append only touches an empty node and is safe to do in place, which
 * matters for the carrier: it's such a node, and the one leaf a cursor is restored onto by name.
 */
function mergeText(previousText: Text, insertText: Text) {
    if (previousText.length > 0 && insertText.length > 0) {
        previousText.replaceWith(document.createTextNode(previousText.data + insertText.data));
        return;
    }

    previousText.appendData(insertText.data);
}

/**
 * Shifts the leaves' first parent off. A parent an earlier group already holds is handed out as an empty clone,
 * so the node itself stays with the first group.
 */
function shiftFirstParent(leaves: Leaf[]) {
    return leaves.map(leaf => leaf.getParents().shift())[0];
}

function clearElementHTML(node: Node | undefined) {
    if (!node) {
        return;
    }

    // An empty cell is a leaf and keeps its identity through the rebuild, so a cursor sitting
    // on it stays connected; a non-empty cell is only ever a parent here and is cloned below.
    if (node.nodeType === Node.TEXT_NODE || isSchemaContain(node, [Display.SelfClose]) || isEmptyCell(node)) {
        return node;
    }

    const cloned = node.cloneNode(false) as HTMLElement;
    removeAttributes(cloned);

    return cloned;
}

/** Drops every attribute but a link's href and the editor's own classes (the image block mark and sizes); any other class goes. */
function removeAttributes(element: HTMLElement) {
    const kept = [imageBlockClass, ...imageSizeClasses].filter((name) => element.classList.contains(name));
    for (const name of element.getAttributeNames()) {
        if (name === "href" || name === "src") {
            continue;
        }
        element.removeAttribute(name);
    }

    if (kept.length) {
        element.className = kept.join(" ");
    }
}