import {CursorPosition, isCollapsed} from "@/core/shared/type/cursor-position";
import {getSelectedBlocks} from "@/core/selection/selection";
import {ExtractedContent} from "@/core/extractor/type/extracted-content";

/**
 * Extracts the selected content block by block and maps every fragment node to its original. A partly selected node
 * stays in the DOM and the ExtractedContent holds its extracted clone, a fully selected node is moved into the fragment
 * and maps to itself.
 */
export function extractContents(contentEditable: HTMLElement, cursorPosition: CursorPosition): ExtractedContent {
    const fragment = new DocumentFragment();
    const originalByFragmentNode = new Map<Node, Node>();
    if (isCollapsed(cursorPosition)) {
        return {fragment, originalByFragmentNode};
    }

    // Blocks are read before the split, which leaves the selection in the same blocks
    const blocks = getSelectedBlocks(contentEditable, cursorPosition);
    const {range} = cursorPosition;
    splitSingleText(range);

    blocks.forEach((block, index) => {
        const blockRange = getBlockRange(range, block, index === 0, index === blocks.length - 1);
        const commonAncestor = blockRange.commonAncestorContainer;
        const {startContainer, endContainer} = blockRange;
        const blockFragment = blockRange.extractContents();

        mapToItself(blockFragment, originalByFragmentNode);
        mapPartlySelected(blockFragment, commonAncestor, startContainer, getFirstChild, originalByFragmentNode);
        mapPartlySelected(blockFragment, commonAncestor, endContainer, getLastChild, originalByFragmentNode);
        addParentsFromDom(contentEditable, blockFragment, commonAncestor, originalByFragmentNode);

        fragment.append(blockFragment);
    });

    return {fragment, originalByFragmentNode};
}

/** Splits the text node holding the whole selection. */
function splitSingleText(range: Range) {
    const {startContainer, endContainer, startOffset, endOffset} = range;
    if (startContainer !== endContainer || !(startContainer instanceof Text)) {
        return;
    }

    const selected = startContainer.splitText(startOffset);
    selected.splitText(endOffset - startOffset);
    range.selectNode(selected);
}

/** Clips the range to the block: only the first block starts at the cursor start and only the last ends at its end. */
function getBlockRange(range: Range, block: Node, isFirst: boolean, isLast: boolean) {
    const blockRange = new Range();
    blockRange.selectNodeContents(block);

    if (isFirst) {
        blockRange.setStart(range.startContainer, range.startOffset);
    }
    if (isLast) {
        blockRange.setEnd(range.endContainer, range.endOffset);
    }

    return blockRange;
}

/** Maps every node of the fragment to itself, as the extraction moves fully selected nodes as they are. */
function mapToItself(node: Node, originalByFragmentNode: Map<Node, Node>) {
    for (const child of node.childNodes) {
        originalByFragmentNode.set(child, child);
        mapToItself(child, originalByFragmentNode);
    }
}

/** Maps the extracted partly selected nodes at the start (or end) of the selection to their originals. */
function mapPartlySelected(fragment: Node,
                           commonAncestor: Node,
                           boundary: Node,
                           next: (node: Node) => ChildNode | null,
                           originalByFragmentNode: Map<Node, Node>) {
    let fragmentNode = next(fragment);

    for (const original of getParents(commonAncestor, boundary)) {
        // A moved node isn't a clone, and everything below it is moved as well
        if (!fragmentNode || fragmentNode === original) {
            return;
        }
        originalByFragmentNode.set(fragmentNode, original);
        fragmentNode = next(fragmentNode);
    }
}

/** Returns the nodes from the child of `ancestor` down to `node` inclusive, outermost first. */
function getParents(ancestor: Node, node: Node) {
    const path: Node[] = [];

    let current: Node | null = node;
    while (current && current !== ancestor) {
        path.unshift(current);
        current = current.parentNode;
    }

    return path;
}

/** Wraps the fragment content in cloned parents, mapping each clone to its original. The fragment reference stays the same. */
function addParentsFromDom(contentEditable: Node,
                           fragment: DocumentFragment,
                           commonAncestor: Node,
                           originalByFragmentNode: Map<Node, Node>) {
    // A text node can't hold children, so the closest element stands in for it
    let original = commonAncestor instanceof Text ? commonAncestor.parentNode : commonAncestor;

    while (original && original !== contentEditable) {
        const clone = original.cloneNode(false);
        clone.appendChild(fragment);
        fragment.appendChild(clone);
        originalByFragmentNode.set(clone, original);
        original = original.parentNode;
    }
}

function getFirstChild(node: Node) {
    return node.firstChild;
}

function getLastChild(node: Node) {
    return node.lastChild;
}