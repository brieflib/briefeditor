import {Leaf, LeafGroup} from "@/core/normalize/type/leaf";
import tagHierarchy, {TagHierarchy} from "@/core/normalize/type/tag-hierarchy";
import {Display, isSchemaContain} from "@/core/normalize/type/schema";
import {CursorPosition, getCursorPositionFrom} from "@/core/shared/type/cursor-position";
import {hasSelfCloseDescendant} from "@/core/shared/element-util";
import {Carrier} from "@/core/carrier/carrier";

export function getLeafNodes(element: Node, leafNodes: Node[] = []) {
    if ((element.nodeType === Node.TEXT_NODE && element.textContent) ||
        element === Carrier.getCarrier() ||
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
            name: element.nodeName,
            priority: tagHierarchy.get(element.nodeName) ?? -1
        } as TagHierarchy))
        .sort((first, second) => second.priority - first.priority)
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

export function filterLeafParents(element: Node, excludeTags: string[], leaf: Leaf) {
    const leafParents = leaf.getParents();

    if (leafParents.includes(element)) {
        leaf.setParents(leaf.getParents().filter(parent => !excludeTags.includes(parent.nodeName)));
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
    if (!documentFragment.textContent && Carrier.isCursorCollapsed()) {
        const carrier = document.createTextNode("");
        Carrier.setCarrier(carrier);
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
        const li = (node as Element).querySelectorAll("li")[0];
        if (li && isSchemaContain(li.firstChild, [Display.ListWrapper])) {
            return true;
        }
    }

    return false;
}

function nodeToFragment(node: Node) {
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
    return Carrier.isCarrierExist() && insertElement.contains(Carrier.getCarrier());
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

function shiftFirstParent(leaves: Leaf[]) {
    let node;
    for (const leaf of leaves) {
        node = leaf.getParents().shift();
    }

    return node;
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

function removeAttributes(element: HTMLElement) {
    for (const name of element.getAttributeNames()) {
        if (name === "href") {
            continue;
        }
        element.removeAttribute(name);
    }
}