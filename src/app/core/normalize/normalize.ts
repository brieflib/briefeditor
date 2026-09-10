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
    // Read before the extract: it lifts the selected text out of the nodes the cursor names, leaving the
    // offsets it holds pointing past the end of what is left of them.
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

// The rebuild replaces every element it touches, so the cursor is read as a place in the text before it and
// put back from there afterwards. A rebuild writes no text of its own - it only rewrites the markup standing
// over it - so the offsets it was read at name the same places once it is done.
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

    // Fill array with previous ul, ol and li
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

// A self-close leaf holds nothing, so a collapsed cursor anchored on the br standing in for an empty block
// has no position of its own to insert at: the tag would be built inside the br, where the serializer never
// shows it and getLeafNodes never descends. It belongs where the br sits instead. The br is left alone - it
// is still the block's placeholder while the inserted tag carries no text of its own.
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

// The range here is scratch space for naming the spot the rebuilt content goes back into, and nothing reads
// it afterwards. It is the replace's own, so a caller's cursor - which in the browser is the live selection
// itself - is not moved about by the rebuild.
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