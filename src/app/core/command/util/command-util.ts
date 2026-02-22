import normalize, {normalizeRootElements, removeTags, replaceTags} from "@/core/normalize/normalize";
import {getElement, getFirstText, getLastText, getRootElement} from "@/core/shared/element-util";
import {Display, getOfType, isSchemaContain, isSchemaContainNodeName} from "@/core/normalize/type/schema";
import {getInitialBlocks, getSelectedBlock, getSelectedListWrapper} from "@/core/selection/selection";
import {getCursorPosition, getCursorPosition2, restoreRange} from "@/core/cursor/cursor";
import {Action, Attributes} from "@/core/command/type/command";
import {CursorPosition} from "@/core/shared/type/cursor-position";

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
        const initialRange = restoreRange(contentEditable, cursorPosition);
        const elements = getSelectedBlock(contentEditable, initialRange);

        const element = elements[i];
        if (!element) {
            continue;
        }

        //const cloneRange = initialRange.cloneRange();

        if (i === 0) {
            const cursorPositionClone = {
                startContainer: cursorPosition.startContainer,
                startOffset: cursorPosition.startOffset,
                endContainer: element,
                endOffset: element.childNodes.length
            }
            //cloneRange.setEnd(element, element.childNodes.length);
            const cp = tagAction(contentEditable, cursorPositionClone, tag, action, attributes);
            cursorPosition = {
                startContainer: cp.startContainer,
                startOffset: cp.startOffset,
                endContainer: cursorPosition.endContainer,
                endOffset: cursorPosition.endOffset
            }
            continue;
        }

        if (i === length - 1) {
            const cursorPositionClone = {
                startContainer: element,
                startOffset: 0,
                endContainer: cursorPosition.endContainer,
                endOffset: cursorPosition.endOffset
            }
            const cp = tagAction(contentEditable, cursorPositionClone, tag, action, attributes);
            cursorPosition = {
                startContainer: cursorPosition.startContainer,
                startOffset: cursorPosition.startOffset,
                endContainer: cp.endContainer,
                endOffset: cp.endOffset
            }
            continue;
        }

        const cursorPositionClone = {
            startContainer: element,
            startOffset: 0,
            endContainer: element,
            endOffset: element.childNodes.length
        }
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
    const range = restoreRange(contentEditable, cursorPosition);
    const documentFragment: DocumentFragment = range.extractContents();
    const cp = getCursorPosition(range, documentFragment);

    const tagElement = document.createElement(tag);
    applyAttributes(tagElement, attributes);
    tagElement.appendChild(documentFragment);
    range.insertNode(tagElement);

    const rootElement = getRootElement(contentEditable, tagElement);
    const df = normalize(contentEditable, rootElement);

    return getCursorPosition2(cp, df);
}

function unwrapRangeFromTag(contentEditable: HTMLElement, cursorPosition: CursorPosition, tag: string): CursorPosition {
    const range = restoreRange(contentEditable, cursorPosition);
    const documentFragment: DocumentFragment = range.extractContents();
    const cp = getCursorPosition(range, documentFragment);

    const removeTagFrom = document.createElement("DELETED");
    removeTagFrom.appendChild(documentFragment);
    range.insertNode(removeTagFrom);

    removeTags(contentEditable, removeTagFrom, [tag, "DELETED"]);

    return cp;
}

export function changeBlock(contentEditable: HTMLElement, replaceTo: string[]) {
    const isList = replaceTo.length === 1 && isSchemaContainNodeName(replaceTo[0], [Display.ListWrapper]);

    const initialCursorPosition = getCursorPosition();
    const blocks = getSelectedBlock(contentEditable);
    let df;
    for (let i = blocks.length - 1; i >= 0; i--) {
        const block = getInitialBlocks(contentEditable, initialCursorPosition)[i];
        if (!block) {
            continue;
        }
        const displays = isList ? [Display.FirstLevel] : [Display.FirstLevel, Display.List];
        const replaceFrom = getOfType(displays).filter(item => !replaceTo.includes(item));
        df = replaceTags(contentEditable, block, replaceFrom, replaceTo, isList);
    }

    if (df) {
        const cp = getCursorPosition2(initialCursorPosition, df);
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