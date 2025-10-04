import {getRange} from "@/core/shared/range-util";
import normalize, {removeTag} from "@/core/normalize/normalize";
import {getFirstLevelElement} from "@/core/shared/element-util";

export function wrap(tag: string, contentEditable: HTMLElement) {
    const range: Range = getRange();
    const cloneRange: Range = range.cloneRange();
    const documentFragment: DocumentFragment = range.extractContents();

    const tagElement = document.createElement(tag);
    tagElement.appendChild(documentFragment);
    cloneRange.deleteContents();
    cloneRange.insertNode(tagElement);

    const firstLevel = getFirstLevelElement(contentEditable, tagElement);
    firstLevel.innerHTML = normalize(firstLevel).innerHTML;
}

export function unwrap(tag: string, contentEditable: HTMLElement) {
    const range: Range = getRange();
    const cloneRange: Range = range.cloneRange();
    const documentFragment: DocumentFragment = range.extractContents();

    const removeTagFrom = document.createElement("DELETED");
    removeTagFrom.appendChild(documentFragment);
    cloneRange.deleteContents();
    cloneRange.insertNode(removeTagFrom);

    const firstLevel = getFirstLevelElement(contentEditable, removeTagFrom);
    firstLevel.innerHTML = removeTag(firstLevel, removeTagFrom, tag).innerHTML;
}

export function changeFirstLevel(tag: string, firstLevel: HTMLElement, isWrap?: boolean) {
    const replace = document.createElement(tag);
    if (firstLevel.nodeType === Node.TEXT_NODE) {
        replace.innerHTML = firstLevel.textContent;
        firstLevel.after(replace);
        firstLevel.remove();
        return;
    }

    replace.innerHTML = isWrap ? firstLevel.outerHTML : firstLevel.innerHTML;
    firstLevel.outerHTML = replace.outerHTML;
}