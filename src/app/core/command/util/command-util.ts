import {appendTag, mergeLists, removeTags, replaceTags} from "@/core/normalize/normalize";
import {getElement, getFirstText, getLastText} from "@/core/shared/element-util";
import {Display, getOfType, isSchemaContain, isSchemaContainNodeName} from "@/core/normalize/type/schema";
import {getSelectedBlock, getSelectedListWrapper} from "@/core/selection/selection";
import {Action, Attributes} from "@/core/command/type/command";
import {
    CursorPosition,
    getCursorPosition,
    getCursorPositionFrom,
    setCursorPositionEndAsLastTextOfElement, setCursorPositionStartAsFirstTextOfElement
} from "@/core/shared/type/cursor-position";

export function tag(contentEditable: HTMLElement, tag: string, action: Action, attributes?: Attributes): CursorPosition {
    const cursorPosition = getCursorPosition();
    let resultCursorPosition = cursorPosition;

    const startFirstLevel = getElement(contentEditable, cursorPosition.startContainer as HTMLElement, [Display.FirstLevel, Display.List]);
    const endFirstLevel = getElement(contentEditable, cursorPosition.endContainer as HTMLElement, [Display.FirstLevel, Display.List]);

    if (startFirstLevel === endFirstLevel) {
        return tagAction(contentEditable, cursorPosition, tag, action, attributes);
    }

    const length = getSelectedBlock(contentEditable).length;
    for (let i = 0; i < length; i++) {
        const elements = getSelectedBlock(contentEditable, resultCursorPosition);

        const element = elements[i];
        if (!element) {
            continue;
        }

        if (i === 0) {
            const firstElementCursorPosition = setCursorPositionEndAsLastTextOfElement(cursorPosition, element);
            resultCursorPosition = tagAction(contentEditable, firstElementCursorPosition, tag, action, attributes);
            resultCursorPosition = getCursorPositionFrom(resultCursorPosition.startContainer, resultCursorPosition.startOffset, cursorPosition.endContainer, cursorPosition.endOffset);
            continue;
        }

        if (i === length - 1) {
            const lastElementCursorPosition = setCursorPositionStartAsFirstTextOfElement(cursorPosition, element);
            const cursorStartContainer = resultCursorPosition.startContainer;
            const cursorStartOffset = resultCursorPosition.startOffset;
            resultCursorPosition = tagAction(contentEditable, lastElementCursorPosition, tag, action, attributes);
            resultCursorPosition = getCursorPositionFrom(cursorStartContainer, cursorStartOffset, resultCursorPosition.endContainer, resultCursorPosition.endOffset);
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
    return resultCursorPosition;
}

function tagAction(contentEditable: HTMLElement, cursorPosition: CursorPosition, tag: string, action: Action, attributes?: Attributes): CursorPosition {
    switch (action) {
        case Action.Wrap:
            return appendTag(contentEditable, cursorPosition, tag, attributes);
        case Action.Unwrap:
            return removeTags(contentEditable, [tag], cursorPosition);
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