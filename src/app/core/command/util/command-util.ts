import {getRange} from "@/core/shared/range-util";
import normalize, {removeTag, replaceTag} from "@/core/normalize/normalize";
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
        wrapRangeInTag(range, tag);
        const firstLevel = getFirstLevelElement(contentEditable, startFirstLevel);
        normalize(contentEditable, firstLevel);
        return;
    }

    for (const element of getSelectedElements()) {
        const cloneRange = range.cloneRange();

        if (element === startContainer.parentElement as HTMLElement) {
            cloneRange.setEnd(element, element.childNodes.length);
            wrapRangeInTag(cloneRange, tag);
            continue;
        }

        if (element === endContainer.parentElement as HTMLElement) {
            cloneRange.setStart(element, 0);
            cloneRange.setEnd(endContainer, endOffset);
            wrapRangeInTag(cloneRange, tag);
            continue;
        }

        cloneRange.setStart(element, 0);
        cloneRange.setEnd(element, element.childNodes.length);
        wrapRangeInTag(cloneRange, tag);
    }

    const firstLevel = getFirstLevelElement(contentEditable, startFirstLevel);
    normalize(contentEditable, firstLevel);
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

export function changeFirstLevel(replaceTo: string[], changeElement: HTMLElement, contentEditable: HTMLElement) {
    const replaceFrom = getOfType([Display.FirstLevel, Display.List]).filter(item => !replaceTo.includes(item));

    return replaceTag(contentEditable, changeElement, replaceFrom, replaceTo);
}

export function isFirstLevelsEqualToTags(tags: string[], firstLevels: HTMLElement[]) {
    for (const firstLevel of firstLevels) {
        if (!tags.includes(firstLevel.nodeName)) {
            return false;
        }
    }

    return true;
}

function wrapRangeInTag(range: Range, tag: string) {
    const documentFragment: DocumentFragment = range.extractContents();
    const tagElement = document.createElement(tag);
    tagElement.appendChild(documentFragment);
    range.insertNode(tagElement);
}

function unwrapRangeFromTag(range: Range, tag: string, contentEditable: HTMLElement) {
    const cloneRange: Range = range.cloneRange();
    const documentFragment: DocumentFragment = cloneRange.extractContents();

    const removeTagFrom = document.createElement("DELETED");
    removeTagFrom.appendChild(documentFragment);
    cloneRange.insertNode(removeTagFrom);

    removeTag(contentEditable, removeTagFrom, [tag, "DELETED"]);
}

export function mergeLists(contentEditable: HTMLElement, lists: Node[]) {
    if (!lists) {
        return;
    }

    const wrapper = document.createElement("DELETED");
    const allLists: HTMLElement[] = lists.map(list => getFirstLevelElement(contentEditable, list as HTMLElement));

    const firstList = allLists[0];
    if (!firstList) {
        return;
    }

    let previousList = firstList.previousElementSibling;
    while (previousList && isSchemaContain(previousList, [Display.ListWrapper])) {
        allLists.push(previousList as HTMLElement);
        previousList = previousList.previousElementSibling as HTMLElement;
    }

    let nextList = allLists[allLists.length - 1]?.nextElementSibling;
    while (nextList && isSchemaContain(nextList, [Display.ListWrapper])) {
        allLists.push(nextList as HTMLElement);
        nextList = nextList.nextElementSibling;
    }

    allLists[allLists.length - 1]?.after(wrapper);
    wrapper.append(...allLists);
    removeTag(contentEditable, wrapper, ["DELETED"]);
}