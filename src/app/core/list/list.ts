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

    if (!firstBlock.previousSibling || !isSchemaContain(firstBlock.previousSibling, [Display.List])) {
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

    let listWrapper: HTMLElement | undefined;
    let previousList;
    for (const block of getSelectedBlock(contentEditable)) {
        if (!previousList) {
            previousList = block.previousSibling;
        }

        const parent = block.parentElement;
        if (!listWrapper && parent) {
            listWrapper = document.createElement(parent.nodeName);
        }

        if (block.lastChild && isSchemaContain(block.lastChild, [Display.ListWrapper])) {
            listWrapper = block.lastChild as HTMLElement;
            const li = document.createElement("li");
            li.append(...Array.from(block.childNodes).filter(node => node !== listWrapper as Node));
            listWrapper.prepend(li);
            continue;
        }

        listWrapper?.appendChild(block);
    }

    if (listWrapper && previousList) {
        previousList.appendChild(listWrapper);
        const firstLevel = getFirstLevelElement(contentEditable, previousList as HTMLElement);
        normalize(contentEditable, firstLevel);
    }
}