import {getRange} from "@/core/shared/range-util";
import {normalizeRootElements, removeTags, replaceTags} from "@/core/normalize/normalize";
import {getElement} from "@/core/shared/element-util";
import {Display, getOfType, isSchemaContain, isSchemaContainNodeName} from "@/core/normalize/type/schema";
import {
    getInitialBlocks,
    getSelectedBlock,
    getSelectedListWrapper,
    getSelectedParentElements
} from "@/core/selection/selection";
import {getSelectionOffset, restoreRange} from "@/core/cursor/cursor";
import {Action, Attributes} from "@/core/command/type/command";

export function tag(contentEditable: HTMLElement, tag: string, action: Action, attributes?: Attributes) {
    const initialCursorPosition = getSelectionOffset(contentEditable);
    if (!initialCursorPosition) {
        return;
    }

    const range: Range = getRange();

    const startFirstLevel = getElement(contentEditable, range.startContainer as HTMLElement, [Display.FirstLevel, Display.List]);
    const endFirstLevel = getElement(contentEditable, range.endContainer as HTMLElement, [Display.FirstLevel, Display.List]);

    if (startFirstLevel === endFirstLevel) {
        tagAction(contentEditable, range, tag, action, attributes);
        normalizeRootElements(contentEditable, initialCursorPosition);
        return;
    }

    let length = getSelectedBlock(contentEditable).length;
    for (let i = 0; i < length; i++) {
        const initialRange = restoreRange(contentEditable, initialCursorPosition);
        const elements = getSelectedBlock(contentEditable, initialRange);

        const element = elements[i];
        if (!element) {
            continue;
        }

        const cloneRange = initialRange.cloneRange();

        if (i === 0) {
            cloneRange.setEnd(element, element.childNodes.length);
            tagAction(contentEditable, cloneRange, tag, action, attributes);
            continue;
        }

        if (i === length - 1) {
            cloneRange.setStart(element, 0);
            cloneRange.setEnd(initialRange.endContainer, initialRange.endOffset);
            tagAction(contentEditable, cloneRange, tag, action, attributes);
            continue;
        }

        cloneRange.setStart(element, 0);
        cloneRange.setEnd(element, element.childNodes.length);
        tagAction(contentEditable, cloneRange, tag, action, attributes);
    }
    normalizeRootElements(contentEditable, initialCursorPosition);
}

function tagAction(contentEditable: HTMLElement, cloneRange: Range, tag: string, action: Action, attributes?: Attributes) {
    switch (action) {
        case Action.Wrap:
            wrapRangeInTag(contentEditable, cloneRange, tag, attributes);
            break
        case Action.Unwrap:
            unwrapRangeFromTag(contentEditable, cloneRange, tag);
            break;
    }
}

export function applyAttributes(element: HTMLElement, attributes?: Attributes) {
    if (attributes) {
        for (const key in attributes) {
            if (attributes.hasOwnProperty(key)) {
                const value = attributes[key as keyof Attributes];
                if (!value) {
                    element.removeAttribute(key);

                    continue;
                }
                if (typeof value === "string") {
                    element.setAttribute(key, value);
                }
            }
        }
    }
}

function wrapRangeInTag(contentEditable: HTMLElement, range: Range, tag: string, attributes?: Attributes) {
    const documentFragment: DocumentFragment = range.extractContents();

    const tagElement = document.createElement(tag);
    applyAttributes(tagElement, attributes);
    tagElement.appendChild(documentFragment);
    range.insertNode(tagElement);
}

function unwrapRangeFromTag(contentEditable: HTMLElement, range: Range, tag: string) {
    const documentFragment: DocumentFragment = range.extractContents();

    const removeTagFrom = document.createElement("DELETED");
    removeTagFrom.appendChild(documentFragment);
    range.insertNode(removeTagFrom);

    removeTags(contentEditable, removeTagFrom, [tag, "DELETED"]);
}

export function changeBlock(contentEditable: HTMLElement, replaceTo: string[]) {
    const isList = replaceTo.length === 1 && isSchemaContainNodeName(replaceTo[0], [Display.ListWrapper]);

    const initialCursorPosition = getSelectionOffset(contentEditable);
    if (!initialCursorPosition) {
        return;
    }

    const blocks = getSelectedBlock(contentEditable);
    for (let i = blocks.length - 1; i >= 0; i--) {
        const block = getInitialBlocks(contentEditable, initialCursorPosition)[i];
        if (!block) {
            continue;
        }
        const displays = isList ? [Display.FirstLevel] : [Display.FirstLevel, Display.List];
        const replaceFrom = getOfType(displays).filter(item => !replaceTo.includes(item));
        replaceTags(contentEditable, block, replaceFrom, replaceTo, isList);
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

export function isListWrapper(contentEditable: HTMLElement) {
    const maybeListWrappers = getSelectedListWrapper(contentEditable);

    for (const element of maybeListWrappers) {
        if (!isSchemaContain(element, [Display.ListWrapper])) {
            return false;
        }
    }

    return true;
}