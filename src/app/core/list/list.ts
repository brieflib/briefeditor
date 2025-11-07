import {getSelectedBlock} from "@/core/selection/selection";
import {Display, isSchemaContain} from "@/core/normalize/type/schema";
import normalize from "@/core/normalize/normalize";
import {getFirstLevelElement} from "@/core/shared/element-util";

export function isPlusIndentEnabled(contentEditable: HTMLElement) {
    const blocks = getSelectedBlock(contentEditable);
    const firstBlock = blocks[0];

    if (!firstBlock) {
        return false;
    }

    if (!firstBlock.previousElementSibling || !isSchemaContain(firstBlock.previousElementSibling, [Display.List, Display.ListWrapper])) {
        return false;
    }

    for (const block of blocks) {
        if (!isSchemaContain(block, [Display.List])) {
            return false;
        }
    }

    return true;
}

export function plusIndent(contentEditable: HTMLElement) {
    if (!isPlusIndentEnabled(contentEditable)) {
        return;
    }

    const lists = getSelectedBlock(contentEditable);
    const firstList = lists[0];
    if (!firstList) {
        return;
    }

    const previousList = firstList.previousSibling;
    const parentElement = firstList.parentElement;
    if (!previousList || !parentElement) {
        return;
    }

    const listWrapper = document.createElement(parentElement.nodeName);
    listWrapper.append(...lists);

    if (listWrapper && previousList) {
        previousList.after(listWrapper);
        const firstLevel = getFirstLevelElement(contentEditable, listWrapper);
        normalize(contentEditable, firstLevel);
    }
}