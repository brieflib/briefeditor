import {Leaf, LeafGroup} from "@/core/normalize/type/leaf";
import tagHierarchy, {TagHierarchy} from "@/core/normalize/type/tag-hierarchy";
import {Display, isSchemaContain} from "@/core/normalize/type/schema";
import {CursorPosition, getCursorPosition, getCursorPositionFrom} from "@/core/shared/type/cursor-position";
import {hasSelfCloseDescendant} from "@/core/shared/element-util";
import {Carrier} from "@/core/carrier/carrier";

export interface ContainerAndCursorPosition {
    container: DocumentFragment,
    cursorPosition: CursorPosition
}

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

// A cell holds no br to stand in for empty content, so an empty one is its own leaf: there is nothing
// else left to rebuild it from and the collapse would drop it out of the table.
function isEmptyCell(element: Node) {
    return isSchemaContain(element, [Display.Cell]) && !element.textContent;
}

export function setLeafParents(findTill: HTMLElement, leafNode: Node, leaf: Leaf = new Leaf()) {
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
                               cursorPosition: CursorPosition = getCursorPosition(),
                               container: DocumentFragment = nodeToFragment(document.createElement("div"))): ContainerAndCursorPosition {
    const parent = getSameFirstParent(leaves);

    for (const leafGroup of parent) {
        let firstParentElement = shiftFirstParent(leafGroup.leaves);
        firstParentElement = clearElementHTML(firstParentElement);

        if (!firstParentElement) {
            return {container: container, cursorPosition: cursorPosition};
        }
        const fragment = collapseLeaves(leafGroup.leaves, cursorPosition, nodeToFragment(firstParentElement));
        cursorPosition = insertAfterLastChild(container, fragment.container, fragment.cursorPosition);
    }

    return {container: container, cursorPosition: cursorPosition};
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

export function remapCursor(firstText: Node, lastText: Node, cursor: CursorPosition): CursorPosition {
    if (cursor.startContainer === cursor.endContainer) {
        return getCursorPositionFrom(
            firstText, 0,
            firstText, cursor.endOffset - cursor.startOffset
        );
    }

    const startContainer = cursor.startOffset > 0 ? cursor.startContainer : firstText;
    const startOffset = cursor.startOffset > 0 ? cursor.startOffset : 0;
    return getCursorPositionFrom(startContainer, startOffset, lastText, cursor.endOffset);
}

interface DroppedCursorPoint {
    readonly container: Node;
    readonly offset: number;
}

// Both remappings move an endpoint that would not survive a collapse onto one that would, and differ only in
// which endpoints they pick up and where those belong afterwards. A cursor nothing moved is handed back as it
// came, so the caller can tell it still points where it did.
function mapCursorPoints(cursor: CursorPosition,
                         mapPoint: (container: Node, offset: number) => DroppedCursorPoint): CursorPosition {
    const start = mapPoint(cursor.startContainer, cursor.startOffset);
    const end = mapPoint(cursor.endContainer, cursor.endOffset);

    if (start.container === cursor.startContainer && end.container === cursor.endContainer) {
        return cursor;
    }

    return getCursorPositionFrom(start.container, start.offset, end.container, end.offset);
}

// Nothing ahead for the cursor to move onto, so it belongs after the last leaf there is.
function atLastLeaf(leafNodes: Node[], fallback: DroppedCursorPoint): DroppedCursorPoint {
    const preceding = leafNodes[leafNodes.length - 1];
    if (!preceding) {
        return fallback;
    }

    return {container: preceding, offset: preceding.textContent?.length ?? 0};
}

// getLeafNodes drops empty text nodes, and collapseLeaves relocates the cursor only through the leaves it
// receives. An endpoint left on a dropped node - deleteContents empties the start text node in place instead
// of removing it - would keep pointing inside the subtree replaceElement throws away. Move such endpoints onto
// the nearest surviving leaf, which is where the dropped node's neighbours end up after the collapse.
export function remapDroppedLeafCursor(rootElement: Node, leafNodes: Node[], cursor: CursorPosition): CursorPosition {
    return mapCursorPoints(cursor, (container, offset) =>
        remapDroppedContainer(rootElement, leafNodes, container, offset));
}

function remapDroppedContainer(rootElement: Node, leafNodes: Node[], cursorContainer: Node, offset: number): DroppedCursorPoint {
    if (!isDroppedLeaf(rootElement, leafNodes, cursorContainer)) {
        return {container: cursorContainer, offset: offset};
    }

    const following = leafNodes.find(leaf =>
        !!(cursorContainer.compareDocumentPosition(leaf) & Node.DOCUMENT_POSITION_FOLLOWING));
    if (following) {
        return {container: following, offset: 0};
    }

    // No leaf follows, so every leaf precedes the dropped node and the cursor belongs after the last one.
    return atLastLeaf(leafNodes, {container: cursorContainer, offset: offset});
}

// Only leaves keep their identity through a collapse - every parent is cloned - so a cursor anchored on an
// element does not survive one. An empty block is where the browser leaves it there: the block has no text of
// its own to hold the cursor. Anchor such an endpoint on the leaf its offset points at, which for an empty
// block is the br standing in for its content - the very node the browser anchors on once the block is typed
// into. An element with no leaves at all has nothing to move onto and is left alone.
export function anchorCursorOnLeaf(cursor: CursorPosition): CursorPosition {
    return mapCursorPoints(cursor, anchorContainerOnLeaf);
}

function anchorContainerOnLeaf(container: Node, offset: number): DroppedCursorPoint {
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
    return atLastLeaf(leafNodes, {container: container, offset: offset});
}

function isDroppedLeaf(rootElement: Node, leafNodes: Node[], container: Node) {
    return container.nodeType === Node.TEXT_NODE &&
        !container.textContent &&
        container !== Carrier.getCarrier() &&
        rootElement.contains(container) &&
        !leafNodes.includes(container);
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

function insertAfterLastChild(container: DocumentFragment, insertElement: DocumentFragment, cursorPosition: CursorPosition): CursorPosition {
    const containerChild = container.lastChild;
    const insertNode = insertElement.firstChild;

    if (!containerChild || !insertNode) {
        return cursorPosition;
    }

    const previousText = asText(containerChild.lastChild);
    const insertText = asText(insertNode);

    if (previousText && insertText) {
        const cursorMove = mergeText(containerChild, previousText, insertText);
        return cursorMove.getCursorPosition(cursorPosition);
    }

    if (insertElement.textContent || hasSelfCloseDescendant(insertElement) || holdsCarrier(insertElement) ||
        holdsCell(insertElement)) {
        containerChild.appendChild(insertElement);

        // insertNode keeps its identity, so only a cursor anchored on the container moves onto it.
        const cursorMove = new CursorMove({node: containerChild, target: insertNode, offset: 0, keepOffset: false});
        return cursorMove.getCursorPosition(cursorPosition);
    }

    // insertElement was thrown away, so cursors inside it belong after the content that was kept.
    const cursorMove = new CursorMove({
        node: insertNode,
        target: containerChild,
        offset: containerChild.childNodes.length,
        keepOffset: false
    });
    return cursorMove.getCursorPosition(cursorPosition);
}

// A cell is kept even when it is empty, so the table it was rebuilt into carries content of its own even
// though it holds no text: without this it is thrown away again on the way back up.
function holdsCell(fragment: DocumentFragment) {
    return !!fragment.querySelector("th, td");
}

function asText(node: Node | null): Text | null {
    return node && node.nodeType === Node.TEXT_NODE ? node as Text : null;
}

function holdsCarrier(insertElement: DocumentFragment) {
    return Carrier.isCarrierExist() && insertElement.contains(Carrier.getCarrier());
}

function mergeText(containerChild: Node, previousText: Text, insertText: Text): CursorMove {
    const mergeOffset = previousText.length;
    let mergedText = previousText;

    // Two text leaves must combine into one node. When both carry text, appending in place would rewrite
    // the reused original leaf while it is detached - a change the history MutationObserver cannot see, so
    // the leaf's pre-merge text would be lost on undo. Swap in a fresh node instead, leaving the original
    // pristine so its content survives in the childList records. When either side is empty the append only
    // touches an empty node, so keep it in place to preserve the node identity the cursor mapping relies on.
    if (previousText.length > 0 && insertText.length > 0) {
        mergedText = document.createTextNode(previousText.data + insertText.data);
        previousText.replaceWith(mergedText);
    } else {
        previousText.appendData(insertText.data);
    }

    return new CursorMove({node: insertText, target: mergedText, offset: mergeOffset, keepOffset: true},
        {node: containerChild, target: mergedText, offset: mergeOffset, keepOffset: false},
        {node: previousText, target: mergedText, offset: 0, keepOffset: true});
}

// Where a cursor sitting on some node belongs once the insert is done: inside target, at offset, plus the
// offset it already had when the node it sat on was folded into target rather than replaced by it.
interface CursorPoint {
    readonly node: Node;
    readonly target: Node;
    readonly offset: number;
    readonly keepOffset: boolean;
}

class CursorMove {
    private readonly cursorPointNodes: Map<Node, CursorPoint> = new Map<Node, CursorPoint>;

    constructor(...cursorPoints: CursorPoint[]) {
        for (const cursorPoint of cursorPoints) {
            this.cursorPointNodes.set(cursorPoint.node, cursorPoint)
        }
    }

    getCursorPosition(cursorPosition: CursorPosition): CursorPosition {
        let startMove = this.cursorPointNodes.get(cursorPosition.startContainer);
        if (!startMove) {
            startMove = {
                node: cursorPosition.startContainer,
                target: cursorPosition.startContainer,
                offset: cursorPosition.startOffset,
                keepOffset: false
            };
        }
        let endMove = this.cursorPointNodes.get(cursorPosition.endContainer);
        if (!endMove) {
            endMove = {
                node: cursorPosition.endContainer,
                target: cursorPosition.endContainer,
                offset: cursorPosition.endOffset,
                keepOffset: false
            };
        }

        return getCursorPositionFrom(startMove.target, this.getOffset(startMove, cursorPosition.startOffset), endMove.target, this.getOffset(endMove, cursorPosition.endOffset));
    }

    private getOffset(cursorPoint: CursorPoint, offset: number) {
        return cursorPoint.keepOffset ? cursorPoint.offset + offset : cursorPoint.offset;
    }
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

    // An empty cell is a leaf, and a leaf keeps its identity through the rebuild so that a cursor sitting
    // on it is still connected afterwards. A cell with content is only ever a parent here and is cloned.
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