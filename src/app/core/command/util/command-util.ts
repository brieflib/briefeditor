import {clearEmptyElements, mergeLists, removeTags, replaceTags} from "@/core/normalize/normalize";
import {getElement, getFirstText, getLastText} from "@/core/shared/element-util";
import {Display, getOfType, isSchemaContain, isSchemaContainNodeName} from "@/core/normalize/type/schema";
import {getSelectedBlock, getSelectedListWrapper} from "@/core/selection/selection";
import {Action, Attributes} from "@/core/command/type/command";
import {
    CursorPosition,
    extractContents,
    getCursorPosition,
    getCursorPositionFrom,
    insertNode
} from "@/core/shared/type/cursor-position";

export function tag(contentEditable: HTMLElement, tag: string, action: Action, attributes?: Attributes): CursorPosition {
    const cursorPosition = getCursorPosition();

    const startFirstLevel = getElement(contentEditable, cursorPosition.startContainer as HTMLElement, [Display.FirstLevel, Display.List]);
    const endFirstLevel = getElement(contentEditable, cursorPosition.endContainer as HTMLElement, [Display.FirstLevel, Display.List]);

    if (startFirstLevel === endFirstLevel) {
        tagAction(contentEditable, cursorPosition, tag, action, attributes);
        return clearEmptyElements(contentEditable, cursorPosition);
    }

    const cpt = cursorPosition;
    const length = getSelectedBlock(contentEditable).length;
    for (let i = 0; i < length; i++) {
        const elements = getSelectedBlock(contentEditable, cpt);

        const element = elements[i];
        if (!element) {
            continue;
        }

        if (i === 0) {
            const endContainer = getLastText(element);
            const firstElementCursorPosition = getCursorPositionFrom(cursorPosition.startContainer,
                cursorPosition.startOffset,
                endContainer,
                endContainer.textContent?.length ?? 0);
            tagAction(contentEditable, firstElementCursorPosition, tag, action, attributes);
            continue;
        }

        if (i === length - 1) {
            const startContainer = getFirstText(element);
            const lastElementCursorPosition = getCursorPositionFrom(startContainer,
                0,
                cursorPosition.endContainer,
                cursorPosition.endOffset);
            tagAction(contentEditable, lastElementCursorPosition, tag, action, attributes);
            continue;
        }

        const startContainer = getFirstText(element);
        const endContainer = getLastText(element);
        const middleElementCursorPosition = getCursorPositionFrom(startContainer,
            0,
            endContainer,
            endContainer.textContent?.length ?? 0);
        tagAction(contentEditable, middleElementCursorPosition, tag, action, attributes);
    }
    return clearEmptyElements(contentEditable, cursorPosition);
}

function tagAction(contentEditable: HTMLElement, cursorPosition: CursorPosition, tag: string, action: Action, attributes?: Attributes): CursorPosition {
    switch (action) {
        case Action.Wrap:
            return wrapRangeInTag(contentEditable, cursorPosition, tag, attributes);
        case Action.Unwrap:
            return unwrapRangeFromTag(contentEditable, cursorPosition, tag);
        default:
            return getCursorPosition();
    }
}

export function applyAttributes(element: HTMLElement, attributes?: Attributes) {
    if (attributes) {
        for (const key in attributes) {
            if (Object.prototype.hasOwnProperty.call(attributes, key)) {
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

function wrapRangeInTag(contentEditable: HTMLElement, cursorPosition: CursorPosition, tag: string, attributes?: Attributes): CursorPosition {
    const documentFragment: DocumentFragment = extractContents(cursorPosition);

    const tagElement = document.createElement(tag);
    applyAttributes(tagElement, attributes);
    tagElement.appendChild(documentFragment);
    insertNode(cursorPosition, tagElement);

    return cursorPosition;
}

function unwrapRangeFromTag(contentEditable: HTMLElement, cursorPosition: CursorPosition, tag: string): CursorPosition {
    const documentFragment: DocumentFragment = extractContents(cursorPosition);

    const removeTagFrom = document.createElement("DELETED");
    removeTagFrom.appendChild(documentFragment);
    insertNode(cursorPosition, removeTagFrom);
    removeTags(contentEditable, removeTagFrom, [tag, "DELETED"], cursorPosition);

    return cursorPosition;
}

export function changeBlock(contentEditable: HTMLElement, replaceTo: string[]) {
    const isList = replaceTo.length === 1 && isSchemaContainNodeName(replaceTo[0], [Display.ListWrapper]);

    const cursorPosition = getCursorPosition();
    const blocks = getSelectedBlock(contentEditable);
    for (let i = blocks.length - 1; i >= 0; i--) {
        const b = getSelectedBlock(contentEditable, cursorPosition);
        const block = b[i];
        if (!block) {
            continue;
        }
        const displays = isList ? [Display.FirstLevel] : [Display.FirstLevel, Display.List];
        const replaceFrom = getOfType(displays).filter(item => !replaceTo.includes(item));
        replaceTags(contentEditable, block, replaceFrom, replaceTo, isList);
    }
    mergeLists(contentEditable, cursorPosition);
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