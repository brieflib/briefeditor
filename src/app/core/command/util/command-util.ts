import {getRange} from "@/core/shared/range-util";
import normalize, {normalizeRootElements, removeTags, replaceTags} from "@/core/normalize/normalize";
import {getBlockElement, getRootElement} from "@/core/shared/element-util";
import {Display, getOfType, isSchemaContainNodeName} from "@/core/normalize/type/schema";
import {
    getInitialBlocks,
    getSelectedBlock,
    getSelectedElements,
    getSelectedListWrapper
} from "@/core/selection/selection";
import {getSelectionOffset, restoreRange} from "@/core/cursor/cursor";
import {Action} from "@/core/command/type/command";

export function tag(contentEditable: HTMLElement, tag: string, action: Action) {
    const initialCursorPosition = getSelectionOffset(contentEditable);
    if (!initialCursorPosition) {
        return;
    }

    const range: Range = getRange();

    const startContainer = range.startContainer as HTMLElement;
    const endContainer = range.endContainer as HTMLElement;
    const endOffset = range.endOffset;
    const startFirstLevel = getBlockElement(contentEditable, startContainer);
    const endFirstLevel = getBlockElement(contentEditable, endContainer);

    if (startFirstLevel === endFirstLevel) {
        tagAction(contentEditable, range, tag, action);
        normalizeRootElements(contentEditable, initialCursorPosition);
        return;
    }

    let length = getSelectedElements(range).length;
    for (let i = 0; i < length; i++) {
        const initialRange = restoreRange(contentEditable, initialCursorPosition);
        const elements = getSelectedElements(initialRange);
        length = elements.length;

        const element = elements[i];
        if (!element) {
            continue;
        }

        const cloneRange = range.cloneRange();

        if (element === startContainer.parentElement as HTMLElement) {
            cloneRange.setEnd(element, element.childNodes.length);
            tagAction(contentEditable, cloneRange, tag, action);
            continue;
        }

        if (element === endContainer.parentElement as HTMLElement) {
            cloneRange.setStart(element, 0);
            cloneRange.setEnd(endContainer, endOffset);
            tagAction(contentEditable, cloneRange, tag, action);
            continue;
        }

        cloneRange.setStart(element, 0);
        cloneRange.setEnd(element, element.childNodes.length);
        tagAction(contentEditable, cloneRange, tag, action);
    }
    normalizeRootElements(contentEditable, initialCursorPosition);
}

function tagAction(contentEditable: HTMLElement, cloneRange: Range, tag: string, action: Action) {
    switch (action) {
        case Action.Wrap:
            wrapRangeInTag(contentEditable, cloneRange, tag);
            break
        case Action.Unwrap:
            unwrapRangeFromTag(contentEditable, cloneRange, tag);
            break;
    }
}

function wrapRangeInTag(contentEditable: HTMLElement, range: Range, tag: string) {
    const documentFragment: DocumentFragment = range.extractContents();

    const tagElement = document.createElement(tag);
    tagElement.appendChild(documentFragment);
    range.insertNode(tagElement);
    const rootElement = getRootElement(contentEditable, tagElement);

    normalize(contentEditable, rootElement);
}

function unwrapRangeFromTag(contentEditable: HTMLElement, range: Range, tag: string) {
    const documentFragment: DocumentFragment = range.extractContents();

    const removeTagFrom = document.createElement("DELETED");
    removeTagFrom.appendChild(documentFragment);
    range.insertNode(removeTagFrom);

    removeTags(contentEditable, removeTagFrom, [tag, "DELETED"]);
}

export function changeBlock(contentEditable: HTMLElement, tags: string[]) {
    const isList = tags.length === 1 && isSchemaContainNodeName(tags[0], [Display.ListWrapper])

    const initialCursorPosition = getSelectionOffset(contentEditable);
    if (!initialCursorPosition) {
        return;
    }

    const blocks = getSelectedBlock(contentEditable);
    for (let i = 0; i < blocks.length; i++) {
        const block = getInitialBlocks(contentEditable, initialCursorPosition)[i];
        if (!block) {
            continue;
        }
        const displays = isList ? [Display.FirstLevel] : [Display.FirstLevel, Display.List];
        const replaceFrom = getOfType(displays).filter(item => !tags.includes(item));
        replaceTags(contentEditable, block, replaceFrom, tags, isList);
    }
    normalizeRootElements(contentEditable, initialCursorPosition);
}

export function isElementsEqualToTags(elements: HTMLElement[], tags: string[]) {
    for (const element of elements) {
        if (!tags.includes(element.nodeName)) {
            return false;
        }
    }

    return true;
}

export function isListWrapper(contentEditable: HTMLElement, tag: string) {
    if (isSchemaContainNodeName(tag, [Display.ListWrapper])) {
        const listWrapperElement = getSelectedListWrapper(contentEditable);
        const isUl = isElementsEqualToTags(listWrapperElement, ["UL"]);
        const isOl = isElementsEqualToTags(listWrapperElement, ["OL"]);

        if ((isUl && tag === "UL") || (isOl && tag === "OL")) {
            return false;
        }

        if (isUl || isOl) {
            return true;
        }
    }

    return false;
}