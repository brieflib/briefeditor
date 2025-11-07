import {getRange} from "@/core/shared/range-util";
import normalize, {removeTag} from "@/core/normalize/normalize";
import {getBlockElement, getFirstLevelElement} from "@/core/shared/element-util";
import {Display, getOfType, isSchemaContain} from "@/core/normalize/type/schema";
import {getSelectedElements} from "@/core/selection/selection";

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

    for (const element of getSelectedElements()) {
        const cloneRange = range.cloneRange();

        if (element === startContainer.parentElement as HTMLElement) {
            cloneRange.setEnd(element, element.childNodes.length);
            wrapRangeInTag(cloneRange, tag, contentEditable);
            continue;
        }

        if (element === endContainer.parentElement as HTMLElement) {
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

    const startContainer = range.startContainer as HTMLElement;
    const endContainer = range.endContainer as HTMLElement;
    const endOffset = range.endOffset;
    const startFirstLevel = getBlockElement(contentEditable, startContainer);
    const endFirstLevel = getBlockElement(contentEditable, endContainer);

    if (startFirstLevel === endFirstLevel) {
        unwrapRangeFromTag(range, tag, contentEditable);
        return;
    }

    for (const element of getSelectedElements()) {
        const cloneRange = range.cloneRange();

        if (element === startContainer.parentElement as HTMLElement) {
            cloneRange.setEnd(element, element.childNodes.length);
            unwrapRangeFromTag(cloneRange, tag, contentEditable);
            continue;
        }

        if (element === endContainer.parentElement as HTMLElement) {
            cloneRange.setStart(element, 0);
            cloneRange.setEnd(endContainer, endOffset);
            unwrapRangeFromTag(cloneRange, tag, contentEditable);
            continue;
        }

        cloneRange.setStart(element, 0);
        cloneRange.setEnd(element, element.childNodes.length);
        unwrapRangeFromTag(cloneRange, tag, contentEditable);
    }
}

export function changeFirstLevel(tagsToAdd: string[], changeElement: HTMLElement, contentEditable: HTMLElement) {
    const removeTagFrom = addTagsToElement(tagsToAdd, changeElement);
    const tagsToDelete = getOfType([Display.FirstLevel, Display.List]).filter(item => !tagsToAdd.includes(item));
    const firstLevel = getFirstLevelElement(contentEditable, removeTagFrom);

    removeTag(contentEditable, removeTagFrom, firstLevel, tagsToDelete);
    return removeTagFrom;
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

function unwrapRangeFromTag(range: Range, tag: string, contentEditable: HTMLElement) {
    const cloneRange: Range = range.cloneRange();
    const documentFragment: DocumentFragment = cloneRange.extractContents();

    const removeTagFrom = document.createElement("DELETED");
    removeTagFrom.appendChild(documentFragment);
    cloneRange.insertNode(removeTagFrom);

    const firstLevel = getFirstLevelElement(contentEditable, removeTagFrom);
    removeTag(contentEditable, removeTagFrom, firstLevel, [tag, "DELETED"]);
}

function addTagsToElement(tags: string[], toElement: HTMLElement): HTMLElement {
    const replace = document.createElement(tags[0] ?? "P");

    let lastChild;
    for (let i = 1; i < tags.length; i++) {
        const tag = tags[i];
        if (tag) {
            lastChild = document.createElement(tag);
            replace.appendChild(lastChild);
        }
    }

    toElement.after(replace);
    const changeContent = replace.lastChild ? replace.lastChild : replace;
    changeContent.appendChild(toElement);

    return replace;
}

export function mergeLists(contentEditable: HTMLElement, lists: HTMLElement[]) {
    const wrapper = document.createElement("DELETED");
    const allLists: HTMLElement[] = lists.map(list => getFirstLevelElement(contentEditable, list));

    let previousList = allLists[0]?.previousElementSibling as HTMLElement;
    while (previousList && isSchemaContain(previousList, [Display.ListWrapper])) {
        allLists.unshift(previousList);
        previousList = previousList.previousElementSibling as HTMLElement;
    }

    let nextList = allLists[allLists.length - 1]?.nextElementSibling;
    while (nextList && isSchemaContain(nextList, [Display.ListWrapper])) {
        allLists.push(nextList as HTMLElement);
        nextList = nextList.nextElementSibling;
    }

    allLists[allLists.length - 1]?.after(wrapper);
    wrapper.append(...allLists);
    removeTag(contentEditable, wrapper, wrapper, ["DELETED"]);
}