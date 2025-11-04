import {getRange} from "@/core/shared/range-util";
import normalize, {removeTag} from "@/core/normalize/normalize";
import {getBlockElement, getElementsBetween, getFirstLevelElement} from "@/core/shared/element-util";
import {Display, getOfType, isSchemaContain} from "@/core/normalize/type/schema";

export function wrap(tag: string, contentEditable: HTMLElement) {
    const range: Range = getRange();

    const startContainer = range.startContainer as HTMLElement;
    const endContainer = range.endContainer as HTMLElement;
    const endOffset = range.endOffset;
    const startFirstLevel = getBlockElement(contentEditable, startContainer);
    const endFirstLevel = getBlockElement(contentEditable, endContainer);

    if (startFirstLevel === endFirstLevel) {
        wrapRangeInTag(range, tag, contentEditable);
        return;
    }

    const elementsBetween = getElementsBetween(startFirstLevel, endFirstLevel);
    for (const element of elementsBetween) {
        const cloneRange = range.cloneRange();

        if (element === startFirstLevel) {
            cloneRange.setEnd(element, element.childNodes.length);
            wrapRangeInTag(cloneRange, tag, contentEditable);
            continue;
        }

        if (element === endFirstLevel) {
            cloneRange.setStart(element, 0);
            cloneRange.setEnd(endContainer, endOffset);
            wrapRangeInTag(cloneRange, tag, contentEditable);
            continue;
        }

        cloneRange.setStart(element, 0);
        cloneRange.setEnd(element, element.childNodes.length);
        wrapRangeInTag(cloneRange, tag, contentEditable);
    }
}

export function unwrap(tag: string, contentEditable: HTMLElement) {
    const range: Range = getRange();
    const cloneRange: Range = range.cloneRange();
    const documentFragment: DocumentFragment = cloneRange.extractContents();

    const removeTagFrom = document.createElement("DELETED");
    removeTagFrom.appendChild(documentFragment);
    cloneRange.insertNode(removeTagFrom);

    const firstLevel = getFirstLevelElement(contentEditable, removeTagFrom);
    removeTag(contentEditable, removeTagFrom, firstLevel, [tag, "DELETED"])
}

export function changeFirstLevel(tagsToAdd: string[], changeElement: HTMLElement, contentEditable: HTMLElement) {
    const removeTagFrom = addTagsToElement(tagsToAdd, changeElement);
    const tagsToDelete = getOfType([Display.FirstLevel, Display.List]).filter(item => !tagsToAdd.includes(item));
    const firstLevel = getFirstLevelElement(contentEditable, removeTagFrom);

    removeTag(contentEditable, removeTagFrom, firstLevel, tagsToDelete);
}

export function isFirstLevelsEqualToTags(tags: string[], firstLevels: HTMLElement[]) {
    for (const firstLevel of firstLevels) {
        if (!tags.includes(firstLevel.nodeName)) {
            return false;
        }
    }

    return true;
}

function wrapRangeInTag(range: Range, tag: string, contentEditable: HTMLElement) {
    const documentFragment: DocumentFragment = range.extractContents();
    const tagElement = document.createElement(tag);
    tagElement.appendChild(documentFragment);
    range.insertNode(tagElement);
    const firstLevel = getFirstLevelElement(contentEditable, tagElement);
    normalize(contentEditable, firstLevel);
}

function addTagsToElement(tags: string[], toElement: HTMLElement): HTMLElement {
    const replace = document.createElement(tags[0] || "P");

    let lastChild;
    for (let i = 1; i < tags.length; i++) {
        const tag = tags[i];
        if (tag) {
            lastChild = document.createElement(tag);
            replace.appendChild(lastChild);
        }
    }

    const changeContent = lastChild ? lastChild : replace;
    if (toElement.nodeType === Node.TEXT_NODE) {
        changeContent.innerHTML = toElement.textContent;
    } else {
        changeContent.innerHTML = isSchemaContain(toElement, [Display.FirstLevel]) ? toElement.outerHTML : toElement.innerHTML;
    }
    toElement.replaceWith(replace);

    return replace;
}