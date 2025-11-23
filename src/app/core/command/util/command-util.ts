import {getRange} from "@/core/shared/range-util";
import normalize, {removeTag, replaceListWrapper, replaceTag} from "@/core/normalize/normalize";
import {getBlockElement, getRootElement} from "@/core/shared/element-util";
import {Display, getOfType, isSchemaContain, isSchemaContainNodeName} from "@/core/normalize/type/schema";
import {getSelectedBlock, getSelectedElements, getSelectedListWrapper} from "@/core/selection/selection";
import {getSelectionOffset, restoreRange} from "@/core/cursor/cursor";
import {Action} from "@/core/command/type/command";
import {CursorPosition} from "@/core/cursor/type/cursor-position";
import {isMinusIndentEnabled} from "@/core/list/list";

export function tag(tag: string, contentEditable: HTMLElement, action: Action) {
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
        switch (action) {
            case Action.Wrap:
                wrapRangeInTag(contentEditable, range, tag);
                break;
            case Action.Unwrap:
                unwrapRangeFromTag(contentEditable, range, tag);
                break;
        }
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
            switch (action) {
                case Action.Wrap:
                    wrapRangeInTag(contentEditable, cloneRange, tag);
                    break
                case Action.Unwrap:
                    unwrapRangeFromTag(contentEditable, cloneRange, tag);
                    break;
            }
            continue;
        }

        if (element === endContainer.parentElement as HTMLElement) {
            cloneRange.setStart(element, 0);
            cloneRange.setEnd(endContainer, endOffset);
            switch (action) {
                case Action.Wrap:
                    wrapRangeInTag(contentEditable, cloneRange, tag);
                    break
                case Action.Unwrap:
                    unwrapRangeFromTag(contentEditable, cloneRange, tag);
                    break;
            }
            continue;
        }

        cloneRange.setStart(element, 0);
        cloneRange.setEnd(element, element.childNodes.length);
        switch (action) {
            case Action.Wrap:
                wrapRangeInTag(contentEditable, cloneRange, tag);
                break
            case Action.Unwrap:
                unwrapRangeFromTag(contentEditable, cloneRange, tag);
                break;
        }
    }
}

export function changeFirstLevel(contentEditable: HTMLElement, tags: string[]) {
    const initialCursorPosition = getSelectionOffset(contentEditable);
    if (!initialCursorPosition) {
        return;
    }

    const blocks = getSelectedBlock(contentEditable);
    for (let i = 0; i < blocks.length; i++) {
        let block = getInitialBlocks(contentEditable, initialCursorPosition)[i];
        if (!block) {
            continue;
        }
        const replaceFrom = getOfType([Display.FirstLevel, Display.List]).filter(item => !tags.includes(item));
        replaceTag(contentEditable, block, replaceFrom, tags);
    }
    normalizeRootElements(contentEditable, initialCursorPosition);
}

function getInitialBlocks(contentEditable: HTMLElement, initialCursorPosition: CursorPosition) {
    const initialRange = restoreRange(contentEditable, initialCursorPosition);
    return getSelectedBlock(contentEditable, initialRange);
}

export function changeListWrapper(contentEditable: HTMLElement, tags: string[]) {
    const initialCursorPosition = getSelectionOffset(contentEditable);
    if (!initialCursorPosition) {
        return;
    }

    const lists = getSelectedBlock(contentEditable);
    for (let i = 0; i < lists.length; i++) {
        const initialRange = restoreRange(contentEditable, initialCursorPosition);
        let list = getSelectedBlock(contentEditable, initialRange)[i];
        let listWrapper = getSelectedListWrapper(contentEditable, initialRange)[i];
        if (!list || !listWrapper) {
            continue;
        }
        const replaceFrom = getOfType([Display.FirstLevel]).filter(item => !tags.includes(item));
        replaceListWrapper(listWrapper, list, replaceFrom, tags);
    }
    normalizeRootElements(contentEditable, initialCursorPosition);
}

export function isElementsEqualToTags(tags: string[], elements: HTMLElement[]) {
    for (const element of elements) {
        if (!tags.includes(element.nodeName)) {
            return false;
        }
    }

    return true;
}

function normalizeRootElements(contentEditable: HTMLElement, initialCursorPosition: CursorPosition) {
    const initialBlocks = getInitialBlocks(contentEditable, initialCursorPosition);
    const rootElements: HTMLElement[] = [];
    for (let i = 0; i < initialBlocks.length; i++) {
        const block = initialBlocks[i];
        if (!block) {
            continue;
        }
        const rootElement = getRootElement(contentEditable, block as HTMLElement);
        if (!rootElements.includes(rootElement)) {
            rootElements.push(rootElement);
        }
    }

    let firstRootElement = rootElements[0];
    if (!firstRootElement) {
        return;
    }
    let previousListWrapper = firstRootElement.previousElementSibling;
    while (previousListWrapper && isSchemaContain(previousListWrapper, [Display.ListWrapper])) {
        rootElements.unshift(previousListWrapper as HTMLElement);
        previousListWrapper = previousListWrapper.previousElementSibling;
    }

    const lastRootElement = rootElements[rootElements.length - 1];
    if (!lastRootElement) {
        return;
    }
    let nextListWrapper = lastRootElement.nextElementSibling;
    while (nextListWrapper && isSchemaContain(nextListWrapper, [Display.ListWrapper])) {
        rootElements.push(nextListWrapper as HTMLElement);
        nextListWrapper = nextListWrapper.nextElementSibling;
    }

    const wrapper = document.createElement("DELETED");
    firstRootElement = rootElements[0];
    if (!firstRootElement) {
        return;
    }
    firstRootElement.before(wrapper);
    for (const rootElement of rootElements) {
        wrapper.appendChild(rootElement);
    }
    removeTag(contentEditable, wrapper, ["DELETED"]);
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

    removeTag(contentEditable, removeTagFrom, [tag, "DELETED"]);
}

export function isListWrapper(contentEditable: HTMLElement, tag: string) {
    if (isSchemaContainNodeName(tag, [Display.ListWrapper])) {
        const listWrapperElement = getSelectedListWrapper(contentEditable);
        const isUl = isElementsEqualToTags(["UL"], listWrapperElement);
        const isOl = isElementsEqualToTags(["OL"], listWrapperElement);

        if ((isUl && tag === "UL") || (isOl && tag === "OL")) {
            return false;
        }

        if (isUl || isOl) {
            return true;
        }
    }

    return false;
}