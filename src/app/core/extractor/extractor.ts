import {CursorPosition, isCollapsed} from "@/core/shared/type/cursor-position";
import {getSelectedBlocks} from "@/core/selection/selection";
import {ExtractedContent} from "@/core/extractor/type/extracted-content";
import {Display, isSchemaContain} from "@/core/normalize/type/schema";

/**
 * Extracts the selected content block by block and maps every fragment node to its original. A partly selected node
 * stays in the DOM and the ExtractedContent holds its extracted clone, a fully selected node is moved into the fragment
 * and maps to itself.
 */
export function extractContents(contentEditable: HTMLElement,
                                cursorPosition: CursorPosition): ExtractedContent {
    const fragment = new DocumentFragment();
    const originalByFragmentNode = new Map<Node, Node>();
    if (isCollapsed(cursorPosition)) {
        return {fragment, originalByFragmentNode, cut: undefined};
    }

    // Blocks are read before the split, which leaves the selection in the same blocks
    const blocks = getSelectedBlocks(contentEditable, cursorPosition);
    const {range} = cursorPosition;
    anchorOutsideSelfClose(range);
    splitSingleText(range);
    splitSharedAncestor(blocks, range);

    let firstCut: number | undefined;
    blocks.forEach((block, index) => {
        const {blockRange, cut} = getBlockRange(range, block, index === 0, index === blocks.length - 1);
        if (index === 0) {
            firstCut = cut;
        }
        const commonAncestor = blockRange.commonAncestorContainer;
        const {startContainer, endContainer} = blockRange;
        const blockFragment = blockRange.extractContents();

        mapToItself(blockFragment, originalByFragmentNode);
        mapPartlySelected(blockFragment, commonAncestor, startContainer, getFirstChild, originalByFragmentNode);
        mapPartlySelected(blockFragment, commonAncestor, endContainer, getLastChild, originalByFragmentNode);
        addParentsFromDom(contentEditable, blockFragment, commonAncestor, originalByFragmentNode);

        fragment.append(blockFragment);
    });

    return {fragment, originalByFragmentNode, cut: firstCut};
}

/**
 * Moves a range boundary lying inside a self-closing element, such as an image, out of it. Otherwise the extraction
 * takes the element as partly selected and clones it, leaving the original in the DOM.
 */
function anchorOutsideSelfClose(range: Range) {
    if (isSchemaContain(range.startContainer, [Display.SelfClose])) {
        range.setStartBefore(range.startContainer);
    }
    if (isSchemaContain(range.endContainer, [Display.SelfClose])) {
        range.setEndAfter(range.endContainer);
    }
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

/**
 * Splits off the tail of the inline element.
 *
 * <p><strong><u><i>ze|ro</i>fi|rst</u></strong>second</p> turns into <p><strong><u><i>ze</i>rst</u></strong>second</p>
 * after extraction, so we cannot insert the extracted element between "ze" and "rst".
 */
function splitSharedAncestor(blocks: HTMLElement[], range: Range) {
    if (blocks.length !== 1) {
        return;
    }

    let shared = range.commonAncestorContainer;
    while (shared.parentElement && isSchemaContain(shared.parentElement, [Display.Inline])) {
        shared = shared.parentElement;
    }

    if (shared instanceof Element && isSchemaContain(shared, [Display.Inline])) {
        splitAfter(shared, range.endContainer, range.endOffset);
    }
}

/** Moves the part of the element after the point into a clone placed right after the element. */
function splitAfter(element: Element, container: Node, offset: number) {
    const trailing = new Range();
    trailing.setStart(container, offset);
    trailing.setEndAfter(element);

    const fragment = trailing.extractContents();
    // A point at the end of the element leaves an empty clone, which would stay in the DOM as an empty tag
    if (fragment.textContent) {
        element.after(fragment);
    }
}

/**
 * Clips the range to the block: only the first block starts at the cursor start and only the last ends at its end.
 * Also calculates the cut, the first child of the common ancestor the clipped range touches.
 */
function getBlockRange(range: Range, block: Node, isFirst: boolean, isLast: boolean) {
    const blockRange = new Range();
    blockRange.selectNodeContents(block);

    if (isFirst) {
        blockRange.setStart(range.startContainer, range.startOffset);
    }
    if (isLast) {
        blockRange.setEnd(range.endContainer, range.endOffset);
    }

    // Nodes before the range stay, so after the extraction the node following the cut stands at this index
    const parent = blockRange.commonAncestorContainer;
    const cut = Array.from(parent.childNodes).findIndex(child => blockRange.intersectsNode(child));

    return {blockRange, cut};
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