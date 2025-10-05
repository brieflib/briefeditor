import {getRange} from "@/core/shared/range-util";
import normalize, {removeTag} from "@/core/normalize/normalize";
import {getFirstLevelElement} from "@/core/shared/element-util";
import {Display, isSchemaContain} from "@/core/normalize/type/schema";

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