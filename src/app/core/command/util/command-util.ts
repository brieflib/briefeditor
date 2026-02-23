import normalize, {normalizeRootElements, removeTags, replaceTags} from "@/core/normalize/normalize";
import {getElement, getRootElement} from "@/core/shared/element-util";
import {Display, getOfType, isSchemaContain, isSchemaContainNodeName} from "@/core/normalize/type/schema";
import {getSelectedBlock, getSelectedListWrapper} from "@/core/selection/selection";
import {Action, Attributes} from "@/core/command/type/command";
import {
    CursorPosition, extractContents,
    getCursorPosition, getCursorPosition2, getCursorPositionFrom,
    getCursorPositionFromDocumentFragment, insertNode
} from "@/core/shared/type/cursor-position";

export function tag(contentEditable: HTMLElement, tag: string, action: Action, attributes?: Attributes) {
    let cursorPosition = getCursorPosition();

    const startFirstLevel = getElement(contentEditable, cursorPosition.startContainer as HTMLElement, [Display.FirstLevel, Display.List]);
    const endFirstLevel = getElement(contentEditable, cursorPosition.endContainer as HTMLElement, [Display.FirstLevel, Display.List]);

    if (startFirstLevel === endFirstLevel) {
        cursorPosition = tagAction(contentEditable, cursorPosition, tag, action, attributes);
        normalizeRootElements(contentEditable, cursorPosition);
        return;
    }

    let length = getSelectedBlock(contentEditable).length;
    for (let i = 0; i < length; i++) {
        const elements = getSelectedBlock(contentEditable, cursorPosition);

        const element = elements[i];
        if (!element) {
            continue;
        }

        if (i === 0) {
            const cursorPositionClone = getCursorPositionFrom(cursorPosition.startContainer,
                cursorPosition.startOffset,
                element,
                element.childNodes.length);
            const cp = tagAction(contentEditable, cursorPositionClone, tag, action, attributes);
            cursorPosition = getCursorPositionFrom(cp.startContainer,
                cp.startOffset,
                cursorPosition.endContainer,
                cursorPosition.endOffset);
            continue;
        }

        if (i === length - 1) {
            const cursorPositionClone = getCursorPositionFrom(element,
                0,
                cursorPosition.endContainer,
                cursorPosition.endOffset);
            const cp = tagAction(contentEditable, cursorPositionClone, tag, action, attributes);
            cursorPosition = getCursorPositionFrom(cursorPosition.startContainer,
                cursorPosition.startOffset,
                cp.endContainer,
                cp.endOffset);
            continue;
        }

        const cursorPositionClone = getCursorPositionFrom(element,
            0,
            element,
            element.childNodes.length);
        tagAction(contentEditable, cursorPositionClone, tag, action, attributes);
    }
    normalizeRootElements(contentEditable, cursorPosition);
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

function wrapRangeInTag(contentEditable: HTMLElement, cursorPosition: CursorPosition, tag: string, attributes?: Attributes): CursorPosition {
    const documentFragment: DocumentFragment = extractContents(cursorPosition);
    const cp = getCursorPositionFromDocumentFragment(documentFragment);

    const tagElement = document.createElement(tag);
    applyAttributes(tagElement, attributes);
    tagElement.appendChild(documentFragment);
    insertNode(cursorPosition, tagElement);

    const rootElement = getRootElement(contentEditable, tagElement);
    const df = normalize(contentEditable, rootElement);

    return getCursorPosition2(cp, df);
}

function unwrapRangeFromTag(contentEditable: HTMLElement, cursorPosition: CursorPosition, tag: string): CursorPosition {
    const documentFragment: DocumentFragment = extractContents(cursorPosition);

    const cp = getCursorPositionFromDocumentFragment(documentFragment);

    const removeTagFrom = document.createElement("DELETED");
    removeTagFrom.appendChild(documentFragment);
    insertNode(cursorPosition, removeTagFrom);
    removeTags(contentEditable, removeTagFrom, [tag, "DELETED"]);

    return cp;
}

export function changeBlock(contentEditable: HTMLElement, replaceTo: string[]) {
    const isList = replaceTo.length === 1 && isSchemaContainNodeName(replaceTo[0], [Display.ListWrapper]);

    let cursorPosition = getCursorPosition();
    const blocks = getSelectedBlock(contentEditable);
    let df;
    for (let i = blocks.length - 1; i >= 0; i--) {
        const b = getSelectedBlock(contentEditable, cursorPosition);
        const block = b[i];
        if (!block) {
            continue;
        }
        const displays = isList ? [Display.FirstLevel] : [Display.FirstLevel, Display.List];
        const replaceFrom = getOfType(displays).filter(item => !replaceTo.includes(item));
        df = replaceTags(contentEditable, block, replaceFrom, replaceTo, isList);
    }

    if (df) {
        const cp = getCursorPosition2(cursorPosition, df);
        normalizeRootElements(contentEditable, cp);
    }
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