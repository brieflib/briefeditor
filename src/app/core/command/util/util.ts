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
        firstLevel.innerHTML = removeTag(firstLevel, removeTagFrom, tag).innerHTML;
    } else {
        contentEditable.innerHTML = removeTag(contentEditable, removeTagFrom, tag).innerHTML;
    }
}

export function changeFirstLevel(tags: string[], firstLevel: HTMLElement) {
    if (firstLevel.nodeType === Node.TEXT_NODE) {
        replaceTextWithElement(tags, firstLevel, true);
        return;
    }

    for (const firstLevelTag of getOfType(Display.FirstLevel)) {
        firstLevel.innerHTML = removeTag(firstLevel, firstLevel, firstLevelTag).innerHTML;
    }

    replaceTextWithElement(tags, firstLevel, false);
}

export function isFirstLevelsEqualToTags(tags: string[], firstLevels: HTMLElement[]) {
    for (const firstLevel of firstLevels) {
        if (!tags.includes(firstLevel.nodeName)) {
            return false;
        }
    }

    return true;
}

function replaceTextWithElement(tags: string[], firstLevel: HTMLElement, isText: boolean) {
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
    if (isText) {
        changeContent.innerHTML = firstLevel.textContent;
    } else {
        const isFirstLevel = isSchemaContain(firstLevel, [Display.FirstLevel]);
        changeContent.innerHTML = isFirstLevel ? firstLevel.innerHTML : firstLevel.outerHTML;
    }

    firstLevel.after(replace);
    firstLevel.remove();
}