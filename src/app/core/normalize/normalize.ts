import {
    collapseLeaves,
    extractFirstLevel,
    filterLeafParents,
    getInvolvedCursorPosition,
    getLeafNodes,
    maybeInsertCarrier,
    normalizeNew,
    normalizeRemoveNew,
    normalizeReplaceBlockNew,
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
    getSelectedTexts,
    insertNode,
    isCollapsed,
    isCursorPositionEqual,
    wrapCursorPosition
} from "@/core/shared/type/cursor-position";
import {getFirstSelectedRoot, getSelectedBlock, getSelectedBlocks, getSelectedRoot} from "@/core/selection/selection";
import {getNextListWrapper, getPreviousListWrapper} from "@/core/list/util/list-util";
import {Attributes} from "@/core/command/type/command";
import {Carrier} from "@/core/carrier/carrier";

export class Normalizer {
    private readonly contentEditable: HTMLElement;

    constructor(contentEditable: HTMLElement) {
        this.contentEditable = contentEditable;
    }

    public normalize(cursorPosition = getCursorPosition()) {
        const blocks = getSelectedBlocks(this.contentEditable, cursorPosition);
        const wrappedCursorPosition = wrapCursorPosition(blocks.at(0), blocks.at(-1));

        if (wrappedCursorPosition) {
            const fragment = extractContents(wrappedCursorPosition);
            insertNode(wrappedCursorPosition, normalizeNew(this.contentEditable, fragment));
        }
    }

    public appendTag(tag: string, attributes?: Attributes, cursorPosition = getCursorPosition()) {
        const carrier = Carrier.getInstance();
        if (carrier.isInsertAllowed(cursorPosition)) {
            carrier.insertCarrier(cursorPosition, tag);
            return;
        }

        const blocks = getSelectedBlocks(this.contentEditable, cursorPosition);
        for (const textCursorPosition of getSelectedTexts(this.contentEditable, cursorPosition)) {
            const fragment = extractContents(textCursorPosition);
            const wrapped = wrapInTagNew(fragment, tag, attributes);
            insertNode(textCursorPosition, wrapped);
        }

        const wrappedCursorPosition = wrapCursorPosition(blocks.at(0), blocks.at(-1));
        if (wrappedCursorPosition) {
            const fragment = extractContents(wrappedCursorPosition);
            insertNode(wrappedCursorPosition, normalizeNew(this.contentEditable, fragment));
        }
    }

    public removeTags(tags: string[], cursorPosition = getCursorPosition()) {
        const isCarrierInserted = maybeInsertCarrier(this.contentEditable, tags, cursorPosition);
        if (isCarrierInserted) {
            return;
        }

        const blocks = getSelectedBlocks(this.contentEditable, cursorPosition);
        // Each selected piece of text becomes its own node, so only its tags are removed
        const selectedTexts: Node[] = [];
        for (const text of getSelectedTexts(this.contentEditable, cursorPosition)) {
            const fragment = extractContents(text);
            selectedTexts.push(...fragment.childNodes);
            insertNode(text, fragment);
        }

        const wrappedCursorPosition = wrapCursorPosition(blocks.at(0), blocks.at(-1));
        if (wrappedCursorPosition) {
            const fragment = extractContents(wrappedCursorPosition);
            insertNode(wrappedCursorPosition, normalizeRemoveNew(this.contentEditable, fragment, selectedTexts, tags));
        }
    }

    /**
     * Replaces every selected list item or line with `targetTags`: a lone wrapper changes only the item's wrapper,
     * anything else replaces the item with its wrapper, or the line.
     */
    public replaceBlockTags(targetTags: string[], cursorPosition = getCursorPosition()) {
        // Read before the extraction, which moves the blocks into the fragment as they are
        const blocks = getSelectedBlock(this.contentEditable, cursorPosition);
        const roots = getSelectedBlocks(this.contentEditable, cursorPosition);
        const involved = getInvolvedCursorPosition(roots.at(0), roots.at(-1));
        if (!involved) {
            return;
        }
        const fragment = involved.range.extractContents();
        const normalized = normalizeReplaceBlockNew(this.contentEditable, fragment, blocks, targetTags);
        involved.range.insertNode(normalized);
    }
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

/**
 * Rebuilds the markup around `removeTagFrom`, dropping any of `tags` found among its leaves'
 * ancestors, and remaps the cursor across the rebuild.
 *
 * @remarks
 * The rebuild replaces every element it touches but writes no text of its own, so the cursor
 * is read as a position in the text beforehand and restored from the same text afterwards.
 */
export function removeAndNormalize(contentEditable: HTMLElement,
                                   removeTagFrom: HTMLElement,
                                   tags: string[],
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

    return resolveCursorAnchor(contentEditable, cursorAnchor);
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