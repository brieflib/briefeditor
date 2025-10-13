import {getRange} from "@/core/shared/range-util";
import normalize, {removeTag} from "@/core/normalize/normalize";
import {getFirstLevelElement} from "@/core/shared/element-util";
import {Display, getOfType, isSchemaContain} from "@/core/normalize/type/schema";

export function wrap(tag: string, contentEditable: HTMLElement) {
    const range: Range = getRange();
    const cloneRange: Range = range.cloneRange();
    const documentFragment: DocumentFragment = cloneRange.extractContents();

    const tagElement = document.createElement(tag);
    tagElement.appendChild(documentFragment);
    cloneRange.insertNode(tagElement);

    const firstLevel = getFirstLevelElement(contentEditable, tagElement);
    firstLevel.innerHTML = normalize(firstLevel).innerHTML;
}

export function unwrap(tag: string, contentEditable: HTMLElement) {
    const range: Range = getRange();
    const cloneRange: Range = range.cloneRange();
    const documentFragment: DocumentFragment = cloneRange.extractContents();

    const removeTagFrom = document.createElement("DELETED");
    removeTagFrom.appendChild(documentFragment);
    cloneRange.insertNode(removeTagFrom);

    const firstLevel = getFirstLevelElement(contentEditable, removeTagFrom);
    if (isSchemaContain(firstLevel, [Display.FirstLevel])) {
        firstLevel.innerHTML = removeTag(firstLevel, removeTagFrom, [tag]).innerHTML;
    } else {
        contentEditable.innerHTML = removeTag(contentEditable, removeTagFrom, [tag]).innerHTML;
    }
}

export function changeFirstLevel(tagsToAdd: string[], block: HTMLElement, contentEditable: HTMLElement) {
    const firstLevel = getFirstLevelElement(contentEditable, block);
    const isBlockFirstLevel = firstLevel === block;
    const replace = addTagsToElement(tagsToAdd, block);
    const tagsToDelete = getOfType([Display.FirstLevel, Display.List]).filter(item => !tagsToAdd.includes(item));
    if (isBlockFirstLevel) {
        replace.innerHTML = removeTag(replace, replace, tagsToDelete).innerHTML;
        return;
    }
    firstLevel.outerHTML = removeTag(contentEditable, replace, tagsToDelete).innerHTML;
}

export function isFirstLevelsEqualToTags(tags: string[], firstLevels: HTMLElement[]) {
    for (const firstLevel of firstLevels) {
        if (!tags.includes(firstLevel.nodeName)) {
            return false;
        }
    }

    return true;
}

function addTagsToElement(tags: string[], block: HTMLElement): HTMLElement {
    const replace = document.createElement(tags[0] || "P");

    let lastChild;
    for (let i = 1; i < tags.length; i++) {
        const tag = tags[i];
        if (tag) {
            lastChild = document.createElement(tag);
            replace.appendChild(lastChild);
        }
    }

    let changeContent = lastChild ? lastChild : replace;
    if (block.nodeType === Node.TEXT_NODE) {
        changeContent.innerHTML = block.textContent;
    } else {
        changeContent.innerHTML = isSchemaContain(block, [Display.FirstLevel]) ? block.outerHTML : block.innerHTML;
    }
    block.after(replace);
    block.remove();

    return replace;
}