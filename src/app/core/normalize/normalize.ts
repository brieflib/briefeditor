import {
    collapseLeaves,
    extractFirstLevel,
    filterLeafParents,
    getLeafNodes, maybeAppendCarrier,
    removeConsecutiveDuplicates,
    replaceLeafParents,
    setLeafParents,
    sortLeafParents
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
import {applyAttributes} from "@/core/command/util/command-util";
import {Attributes} from "@/core/command/type/command";

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
    cursorPosition = anchorBeforeSelfClose(cursorPosition);
    const cursorAnchor = getCursorAnchor(contentEditable, cursorPosition);
    const documentFragment: DocumentFragment = extractContents(cursorPosition);
    maybeAppendCarrier(documentFragment);

    const tagElement = document.createElement(tag);
    applyAttributes(tagElement, attributes);
    tagElement.appendChild(documentFragment);

    const removeTagFrom = document.createElement("DELETED");
    removeTagFrom.appendChild(tagElement);
    insertNode(cursorPosition, removeTagFrom);

    return removeAndNormalize(contentEditable, removeTagFrom, ["DELETED"], cursorPosition, cursorAnchor);
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

export function mergeLists(contentEditable: HTMLElement, cursorPosition: CursorPosition = getCursorPosition()) {
    const rootElements = getSelectedRoot(contentEditable, cursorPosition);

    const firstRoot = rootElements[0];
    if (!firstRoot) {
        return;
    }

    // Collect the previous ul/ol/li siblings.
    let previousListWrapper = firstRoot.previousElementSibling;
    while (previousListWrapper && isSchemaContain(previousListWrapper, [Display.ListWrapper, Display.List])) {
        rootElements.unshift(previousListWrapper as HTMLElement);
        previousListWrapper = previousListWrapper.previousElementSibling;
    }

    // Fill array with next ul, ol and li
    const lastRoot = rootElements[rootElements.length - 1];
    if (!lastRoot) {
        return;
    }
    let nextListWrapper = lastRoot.nextElementSibling;
    while (nextListWrapper && isSchemaContain(nextListWrapper, [Display.ListWrapper, Display.List])) {
        rootElements.push(nextListWrapper as HTMLElement);
        nextListWrapper = nextListWrapper.nextElementSibling;
    }

    // Wrap all elements in tag and normalize
    const wrapper = document.createElement("DELETED");
    firstRoot.before(wrapper);
    wrapper.append(...rootElements);
    removeAndNormalize(contentEditable, wrapper, ["DELETED"], cursorPosition);
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