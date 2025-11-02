import {getRange} from "@/core/shared/range-util";
import normalize, {removeTag} from "@/core/normalize/normalize";
import {getBlockElement, getFirstLevelElement} from "@/core/shared/element-util";
import {Display, getOfType, isSchemaContain} from "@/core/normalize/type/schema";

export function wrap(tag: string, contentEditable: HTMLElement) {
    const range: Range = getRange();

    const startFirstLevel = getBlockElement(contentEditable, range.startContainer as HTMLElement);
    const endFirstLevel = getBlockElement(contentEditable, range.endContainer as HTMLElement);

    const documentFragment: DocumentFragment = range.extractContents();
    const fillChildNodes = Array.from(documentFragment.childNodes).filter(node => node.textContent);
    if (fillChildNodes.length === 1 || startFirstLevel === endFirstLevel) {
        const tagElement = document.createElement(tag);
        tagElement.appendChild(documentFragment);
        range.insertNode(tagElement);
        const firstLevel = getBlockElement(contentEditable, tagElement);
        normalize(contentEditable, firstLevel);
        return;
    }

    for (let i = 0; i < fillChildNodes.length; i++) {
        const tagElement = document.createElement(tag);
        const currentChild = fillChildNodes[i] as HTMLElement;
        tagElement.appendChild(currentChild);

        if (i === 0) {
            startFirstLevel.appendChild(tagElement);
            normalize(contentEditable, startFirstLevel);
            continue;
        }

        if (i === fillChildNodes.length - 1) {
            endFirstLevel.insertBefore(tagElement, endFirstLevel.firstChild);
            normalize(contentEditable, endFirstLevel);
            continue;
        }

        endFirstLevel.before(tagElement);
        normalize(contentEditable, tagElement);
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