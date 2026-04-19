import {
    collapseLeaves,
    filterLeafParents,
    getLeafNodes,
    isLeafEmpty,
    removeConsecutiveDuplicates,
    replaceLeafParents,
    setLeafParents,
    sortLeafParents
} from "@/core/normalize/util/normalize-util";
import {getRootElement} from "@/core/shared/element-util";
import {Display, isSchemaContain} from "@/core/normalize/type/schema";
import {
    CursorPosition, extractContents,
    getCursorPosition,
    getCursorPositionFrom,
    insertNode,
    selectNode
} from "@/core/shared/type/cursor-position";
import {getSelectedRoot} from "@/core/selection/selection";
import {mergeEmptyTextNodes} from "@/core/cursor/cursor";
import {applyAttributes} from "@/core/command/util/command-util";
import {Attributes} from "@/core/command/type/command";

export function removeTag(contentEditable: HTMLElement, tag: string, cursorPosition: CursorPosition) {
    const documentFragment: DocumentFragment = extractContents(cursorPosition);

    const removeTagFrom = document.createElement("DELETED");
    removeTagFrom.appendChild(documentFragment);
    insertNode(cursorPosition, removeTagFrom);

    return normalize(contentEditable, removeTagFrom, [tag, "DELETED"], cursorPosition);
}

export function appendTag(contentEditable: HTMLElement, cursorPosition: CursorPosition, tag: string, attributes?: Attributes) {
    const documentFragment: DocumentFragment = extractContents(cursorPosition);

    const tagElement = document.createElement(tag);
    applyAttributes(tagElement, attributes);
    tagElement.appendChild(documentFragment);

    const removeTagFrom = document.createElement("DELETED");
    removeTagFrom.appendChild(tagElement);
    insertNode(cursorPosition, removeTagFrom);

    return normalize(contentEditable, removeTagFrom, ["DELETED"], cursorPosition);
}

export function normalize(contentEditable: HTMLElement, removeTagFrom: HTMLElement, tags: string[], cursorPosition: CursorPosition) {
    cursorPosition = mergeEmptyTextNodes(contentEditable, cursorPosition);
    const rootElement = getRootElement(contentEditable, removeTagFrom);

    const leaves = getLeafNodes(rootElement)
        .map(node => setLeafParents(contentEditable, node))
        .filter(leaf => filterLeafParents(removeTagFrom, tags, leaf))
        .map(leaf => sortLeafParents(leaf))
        .map(leaf => removeConsecutiveDuplicates(leaf))
        .filter(leaf => isLeafEmpty(leaf));

    const fragment = collapseLeaves(leaves);
    return replaceElement(contentEditable, fragment, rootElement, cursorPosition);
}

export function replaceTags(contentEditable: HTMLElement, replaceTagFrom: HTMLElement, replaceFrom: string[], replaceTo: string[], isClosest = false) {
    const rootElement = getRootElement(contentEditable, replaceTagFrom);
    const elementsToReplace = buildElementsToReplace(replaceTo);

    const leaves = getLeafNodes(rootElement)
        .map(node => setLeafParents(contentEditable, node))
        .filter(leaf => replaceLeafParents(replaceTagFrom, elementsToReplace, replaceFrom, leaf, isClosest))
        .map(leaf => sortLeafParents(leaf))
        .map(leaf => removeConsecutiveDuplicates(leaf));

    const fragment = collapseLeaves(leaves);
    return replaceElement(contentEditable, fragment, rootElement);
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
    normalize(contentEditable, wrapper, ["DELETED"], cursorPosition);
}

export function mergeSiblingTextNodes(contentEditable: HTMLElement, cursorPosition: CursorPosition = getCursorPosition()) {
    let {startContainer, endContainer, startOffset, endOffset} = cursorPosition;

    const rootElements = getSelectedRoot(contentEditable, cursorPosition);
    const visit = (node: Node) => {
        for (const child of Array.from(node.childNodes)) {
            if (child.nodeType === Node.TEXT_NODE) {
                const previous = child.previousSibling;
                if (previous && previous.nodeType === Node.TEXT_NODE) {
                    const previousText = previous as Text;
                    const currentText = child as Text;
                    const previousLength = previousText.data.length;

                    if (startContainer === currentText) {
                        startContainer = previousText;
                        startOffset = previousLength + startOffset;
                    }
                    if (endContainer === currentText) {
                        endContainer = previousText;
                        endOffset = previousLength + endOffset;
                    }

                    previousText.appendData(currentText.data);
                    currentText.remove();
                }
            } else {
                visit(child);
            }
        }
    };

    for (const rootElement of rootElements) {
        visit(rootElement);
    }

    return getCursorPositionFrom(startContainer, startOffset, endContainer, endOffset);
}

function buildElementsToReplace(replaceTo: string[]) {
    const elementsToReplace: HTMLElement[] = [];
    for (const replaceTag of replaceTo) {
        const element = document.createElement(replaceTag);
        elementsToReplace.push(element);
    }

    return elementsToReplace;
}

function replaceElement(contentEditable: HTMLElement, fragment: DocumentFragment, replaceableElement: HTMLElement, cursorPosition: CursorPosition = getCursorPosition()) {
    selectNode(cursorPosition, replaceableElement);
    replaceableElement.remove();
    const childNodes = fragment.firstChild?.childNodes;
    const innerFragment = new DocumentFragment();
    if (childNodes) {
        innerFragment.append(...childNodes);
    }

    insertNode(cursorPosition, innerFragment);
    return mergeSiblingTextNodes(contentEditable, cursorPosition);
}