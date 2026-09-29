import {
    collapseLeaves,
    extractFirstLevel,
    filterLeafParents,
    getLeafNodes,
    maybeAppendCarrier,
    normalizeNew,
    removeConsecutiveDuplicates,
    replaceLeafParents,
    setLeafParents,
    sortLeafParents,
    wrapInTagNew
} from "@/core/normalize/util/normalize-util";
import {getRootElement} from "@/core/shared/element-util";
import {getCursorAnchor, resolveCursorAnchor} from "@/core/cursor/util/cursor-util";
import {Display, isSchemaContain} from "@/core/normalize/type/schema";
import {
    CursorPosition,
    extractContents,
    getCursorPosition,
    getCursorPositionFrom,
    insertNode,
    isCollapsed,
    isCursorPositionEqual
} from "@/core/shared/type/cursor-position";
import {getFirstSelectedRoot, getSelectedRoot} from "@/core/selection/selection";
import {getNextListWrapper, getPreviousListWrapper} from "@/core/list/util/list-util";
import {Attributes} from "@/core/command/type/command";
import {insertCarrier} from "@/core/carrier/carrier";
import {Merger} from "@/core/merger/type/merger-class";

export class Normalizer {
    private readonly contentEditable: HTMLElement;

    constructor(contentEditable: HTMLElement) {
        this.contentEditable = contentEditable;
    }

    /**
     * Wraps the selected content in `tag` and merges it back into the DOM. The inserted nodes are then normalized once
     * more together with their neighbours, so the new tag collapses into them.
     */
    public appendTag(tag: string, attributes?: Attributes, cursorPosition = getCursorPosition()) {
        if (isCollapsed(cursorPosition)) {
            insertCarrier(cursorPosition, tag);
            return;
        }

        const merger = new Merger(this.contentEditable, cursorPosition);
        const extracted = merger.extractContents();
        const wrapped = wrapInTagNew(extracted, tag, attributes);
        const normalized = normalizeNew(this.contentEditable, wrapped);
        const {first, last} = merger.mergeIntoDom(normalized);

        const involved = getInvolvedCursorPosition(first, last);
        if (!involved) {
            return;
        }
        const involvedMerger = new Merger(this.contentEditable, involved);
        const involvedExtracted = involvedMerger.extractContents();
        const normalizedExtracted = normalizeNew(this.contentEditable, involvedExtracted);
        involvedMerger.mergeIntoDom(normalizedExtracted);
    }

    public removeTags(tags: string[], cursorPosition = getCursorPosition()) {
        const merger = new Merger(this.contentEditable, cursorPosition);
        const extracted = merger.extractContents();
        // Add DELETED so merger can indicate that this tag omits in the original DOM.
        const wrapped = wrapInTagNew(extracted, "DELETED");
        const normalized = normalizeNew(this.contentEditable, wrapped, [...tags]);
        const {first, last} = merger.mergeIntoDom(normalized);

        const involved = getInvolvedCursorPosition(first, last);
        if (!involved) {
            return;
        }
        const involvedMerger = new Merger(this.contentEditable, involved);
        const involvedExtracted = involvedMerger.extractContents();
        const normalizedExtracted = normalizeNew(this.contentEditable, involvedExtracted, ["DELETED"]);
        involvedMerger.mergeIntoDom(normalizedExtracted);
    }
}

/** Returns a cursor position spanning the inserted nodes together with their neighbouring siblings, taken whole. */
export function getInvolvedCursorPosition(first: Node | undefined, last: Node | undefined) {
    if (!first || !last) {
        return undefined;
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

export function normalize(contentEditable: HTMLElement, ...cursorPosition: CursorPosition[]) {
    let resultCursorPosition = cursorPosition[0] as CursorPosition;

    for (let i = 0; i < cursorPosition.length; i++) {
        const currentCursorPosition = cursorPosition[i];
        const nextCursorPosition = cursorPosition[i + 1];

        if (!currentCursorPosition) {
            return resultCursorPosition;
        }

        if (!nextCursorPosition) {
            const rootElement = getFirstSelectedRoot(contentEditable, resultCursorPosition);
            return removeAndNormalize(contentEditable, rootElement, [], resultCursorPosition);
        }

        if (isCursorPositionEqual(currentCursorPosition, nextCursorPosition)) {
            const rootElement = getFirstSelectedRoot(contentEditable, nextCursorPosition);
            resultCursorPosition = removeAndNormalize(contentEditable, rootElement, [], nextCursorPosition);
        }

        if (!isCursorPositionEqual(currentCursorPosition, nextCursorPosition)) {
            let rootElement = getFirstSelectedRoot(contentEditable, currentCursorPosition);
            removeAndNormalize(contentEditable, rootElement, [], currentCursorPosition);
            rootElement = getFirstSelectedRoot(contentEditable, nextCursorPosition);
            resultCursorPosition = removeAndNormalize(contentEditable, rootElement, [], nextCursorPosition);
        }
    }

    return resultCursorPosition;
}

export function removeTags(contentEditable: HTMLElement, tags: string[], cursorPosition: CursorPosition) {
    cursorPosition = anchorBeforeSelfClose(cursorPosition);
    // Read before the extract, since extracting shifts the offsets the cursor position holds.
    const cursorAnchor = getCursorAnchor(contentEditable, cursorPosition);
    const documentFragment: DocumentFragment = extractContents(cursorPosition);
    const removeTagFrom = document.createElement("DELETED");
    maybeAppendCarrier(documentFragment);
    removeTagFrom.appendChild(documentFragment);

    insertNode(cursorPosition, removeTagFrom);

    return removeAndNormalize(contentEditable, removeTagFrom, [...tags, "DELETED"], cursorPosition, cursorAnchor);
}

export function appendTag(contentEditable: HTMLElement, cursorPosition: CursorPosition, tag: string, attributes?: Attributes) {
    // cursorPosition = anchorBeforeSelfClose(cursorPosition);
    // const cursorAnchor = getCursorAnchor(contentEditable, cursorPosition);
    // const documentFragment: DocumentFragment = extractContents(cursorPosition);
    // maybeAppendCarrier(documentFragment);
    //
    // const tagElement = document.createElement(tag);
    // applyAttributes(tagElement, attributes);
    // tagElement.appendChild(documentFragment);
    //
    // const removeTagFrom = document.createElement("DELETED");
    // removeTagFrom.appendChild(tagElement);
    // insertNode(cursorPosition, removeTagFrom);
    //
    // return removeAndNormalize(contentEditable, removeTagFrom, ["DELETED"], cursorPosition, cursorAnchor);
    const normalizer: Normalizer = new Normalizer(contentEditable);
    normalizer.appendTag(tag);
}

/**
 * Rebuilds the markup around `removeTagFrom`, dropping any of `tags` found among its leaves'
 * ancestors, and remaps the cursor across the rebuild.
 *
 * @remarks
 * The rebuild replaces every element it touches but writes no text of its own, so the cursor
 * is read as a position in the text beforehand and restored from the same text afterwards.
 */
export function removeAndNormalize(contentEditable: HTMLElement, removeTagFrom: HTMLElement, tags: string[],
                                   cursorPosition: CursorPosition,
                                   cursorAnchor = getCursorAnchor(contentEditable, cursorPosition)) {
    const rootElement = getRootElement(contentEditable, removeTagFrom);

    const leaves = getLeafNodes(rootElement)
        .map(node => setLeafParents(contentEditable, node))
        .filter(leaf => filterLeafParents(removeTagFrom, tags, leaf))
        .map(leaf => sortLeafParents(leaf))
        .map(leaf => removeConsecutiveDuplicates(leaf))
        .map(leaf => extractFirstLevel(leaf));

    replaceElement(collapseLeaves(leaves), rootElement);

    return resolveCursorAnchor(contentEditable, cursorAnchor) ?? cursorPosition;
}

export function replaceTags(contentEditable: HTMLElement, replaceTagFrom: HTMLElement, replaceFrom: string[], replaceTo: string[], isClosest = false) {
    const rootElement = getRootElement(contentEditable, replaceTagFrom);
    const elementsToReplace = buildElementsToReplace(replaceTo);

    const leaves = getLeafNodes(rootElement)
        .map(node => setLeafParents(contentEditable, node))
        .filter(leaf => replaceLeafParents(replaceTagFrom, elementsToReplace, replaceFrom, leaf, isClosest))
        .map(leaf => sortLeafParents(leaf))
        .map(leaf => removeConsecutiveDuplicates(leaf));

    replaceElement(collapseLeaves(leaves), rootElement);
}

/**
 * Rebuilds the whole list run the cursor is in as one root, joining its wrappers and
 * sanitizing every line the way {@link removeAndNormalize} does.
 *
 * @returns The cursor as it stands whenever the rebuild left its leaf in place, and the remapped
 * one otherwise; unchanged if the cursor is in no run.
 *
 * @remarks
 * The run is joined into its first wrapper, so a cursor that stood in a later one is remapped by
 * an offset read against a block that now holds every line of the run - it would name a line of
 * the first wrapper. The rebuild reuses the leaves, so a cursor still connected is already where
 * it belongs and is the better answer.
 */
export function mergeLists(contentEditable: HTMLElement, cursorPosition: CursorPosition = getCursorPosition()): CursorPosition {
    const rootElements = getSelectedRoot(contentEditable, cursorPosition);

    const firstRoot = rootElements[0];
    if (!firstRoot) {
        return cursorPosition;
    }

    // Collect the previous ul/ol/li siblings. The run ends at any text written between
    // two lists, the same as everywhere else a run is walked.
    let previousListWrapper = getPreviousListWrapper(firstRoot);
    while (previousListWrapper) {
        rootElements.unshift(previousListWrapper as HTMLElement);
        previousListWrapper = getPreviousListWrapper(previousListWrapper);
    }

    // Fill array with next ul, ol and li
    const lastRoot = rootElements[rootElements.length - 1];
    if (!lastRoot) {
        return cursorPosition;
    }
    let nextListWrapper = getNextListWrapper(lastRoot);
    while (nextListWrapper) {
        rootElements.push(nextListWrapper as HTMLElement);
        nextListWrapper = getNextListWrapper(nextListWrapper);
    }

    // Wrap all elements in tag and normalize
    const wrapper = document.createElement("DELETED");
    firstRoot.before(wrapper);
    wrapper.append(...rootElements);

    const mergedCursorPosition = removeAndNormalize(contentEditable, wrapper, ["DELETED"], cursorPosition);

    return cursorPosition.startContainer.isConnected && cursorPosition.endContainer.isConnected
        ? cursorPosition : mergedCursorPosition;
}

/**
 * Moves a collapsed cursor off a self-close leaf (e.g. the `br` of an empty block) to just
 * before it, since a tag built inside that br would never be seen by the serializer or by
 * `getLeafNodes`. The br itself is left in place as the block's placeholder.
 */
function anchorBeforeSelfClose(cursorPosition: CursorPosition): CursorPosition {
    const container = cursorPosition.startContainer;
    if (!isCollapsed(cursorPosition) || !isSchemaContain(container, [Display.SelfClose]) ||
        !container.parentNode) {
        return cursorPosition;
    }

    const offset = Array.prototype.indexOf.call(container.parentNode.childNodes, container);

    return getCursorPositionFrom(container.parentNode, offset, container.parentNode, offset);
}

function buildElementsToReplace(replaceTo: string[]) {
    const elementsToReplace: HTMLElement[] = [];
    for (const replaceTag of replaceTo) {
        const element = document.createElement(replaceTag);
        elementsToReplace.push(element);
    }

    return elementsToReplace;
}

/**
 * Replaces `replaceableElement` with the rebuilt content in `container`, using a private
 * `Range` as scratch space so the caller's own cursor (the live selection) is left untouched.
 */
function replaceElement(container: DocumentFragment, replaceableElement: HTMLElement) {
    if (!replaceableElement.parentNode) {
        return;
    }

    const range = new Range();
    range.selectNode(replaceableElement);
    replaceableElement.remove();
    const childNodes = container.firstChild?.childNodes;
    const innerFragment = new DocumentFragment();
    if (childNodes) {
        innerFragment.append(...childNodes);
    }

    range.insertNode(innerFragment);
}