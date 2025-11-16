import {getRange} from "@/core/shared/range-util";
import normalize, {removeTag, replaceTag} from "@/core/normalize/normalize";
import {getBlockElement, getFirstLevelElement} from "@/core/shared/element-util";
import {Display, getOfType, isSchemaContain, isSchemaContainNodeName} from "@/core/normalize/type/schema";
import {getSelectedBlock, getSelectedElements, getSelectedFirstLevels} from "@/core/selection/selection";
import {getSelectionOffset, restoreRange} from "@/core/cursor/cursor";
import {Action} from "@/core/command/type/command";
import {CursorPosition} from "@/core/cursor/type/cursor-position";

export function tag(tag: string, contentEditable: HTMLElement, action: Action) {
    const initialCursorPosition = getSelectionOffset(contentEditable);
    if (!initialCursorPosition) {
        return;
    }

    const range: Range = getRange();

    const startContainer = range.startContainer as HTMLElement;
    const endContainer = range.endContainer as HTMLElement;
    const endOffset = range.endOffset;
    const startFirstLevel = getBlockElement(contentEditable, startContainer);
    const endFirstLevel = getBlockElement(contentEditable, endContainer);

    if (startFirstLevel === endFirstLevel) {
        switch (action) {
            case Action.Wrap:
                wrapRangeInTag(contentEditable, range, tag);
                break
            case Action.Unwrap:
                unwrapRangeFromTag(contentEditable, range, tag);
                break;
        }
        return;
    }

    const length = getSelectedElements(range).length;
    for (let i = 0; i < length; i++) {
        const initialRange = restoreRange(contentEditable, initialCursorPosition);
        const element = getSelectedElements(initialRange)[i];
        if (!element) {
            continue;
        }
        const cloneRange = range.cloneRange();

        if (element === startContainer.parentElement as HTMLElement) {
            cloneRange.setEnd(element, element.childNodes.length);
            switch (action) {
                case Action.Wrap:
                    wrapRangeInTag(contentEditable, cloneRange, tag);
                    break
                case Action.Unwrap:
                    unwrapRangeFromTag(contentEditable, cloneRange, tag);
                    break;
            }
            continue;
        }

        if (element === endContainer.parentElement as HTMLElement) {
            cloneRange.setStart(element, 0);
            cloneRange.setEnd(endContainer, endOffset);
            switch (action) {
                case Action.Wrap:
                    wrapRangeInTag(contentEditable, cloneRange, tag);
                    break
                case Action.Unwrap:
                    unwrapRangeFromTag(contentEditable, cloneRange, tag);
                    break;
            }
            continue;
        }

        cloneRange.setStart(element, 0);
        cloneRange.setEnd(element, element.childNodes.length);
        switch (action) {
            case Action.Wrap:
                wrapRangeInTag(contentEditable, cloneRange, tag);
                break
            case Action.Unwrap:
                unwrapRangeFromTag(contentEditable, cloneRange, tag);
                break;
        }
    }
}

export function firstLevel(contentEditable: HTMLElement, tag: string | string[] | undefined) {
    const initialCursorPosition = getSelectionOffset(contentEditable);
    if (!initialCursorPosition) {
        return;
    }

    const tags = (tag as string[]).map(tag => tag.toUpperCase());
    const firstLevels = getSelectedFirstLevels(contentEditable);
    const isParagraph = isFirstLevelsEqualToTags(tags, firstLevels);
    const blocks = getSelectedBlock(contentEditable, getRange());

    for (let i = 0; i < blocks.length; i++) {
        let block = getBlock(contentEditable, initialCursorPosition, i);
        if (!block) {
            continue;
        }
        changeFirstLevel(isParagraph ? ["P"] : tags, block, contentEditable);
    }
    const updatedBlocks: Node[] = [];
    for (let i = 0; i < blocks.length; i++) {
        const block = getBlock(contentEditable, initialCursorPosition, i);
        if (!block) {
            continue;
        }
        updatedBlocks.push(block);
    }
    if (!isParagraph && isSchemaContainNodeName(tags[0], [Display.ListWrapper])) {
        mergeLists(contentEditable, updatedBlocks);
    }
    for (let i = 0; i < blocks.length; i++) {
        const block = getBlock(contentEditable, initialCursorPosition, i);
        if (!block) {
            continue;
        }
        const firstLevel = getFirstLevelElement(contentEditable, block as HTMLElement);
        normalize(contentEditable, firstLevel);
    }
}

function getBlock(contentEditable: HTMLElement, initialCursorPosition: CursorPosition, i: number) {
    const initialRange = restoreRange(contentEditable, initialCursorPosition);
    return getSelectedBlock(contentEditable, initialRange)[i];
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

function wrapRangeInTag(contentEditable: HTMLElement, range: Range, tag: string) {
    const documentFragment: DocumentFragment = range.extractContents();
    const tagElement = document.createElement(tag);
    tagElement.appendChild(documentFragment);
    range.insertNode(tagElement);
    const firstLevel = getFirstLevelElement(contentEditable, tagElement);
    normalize(contentEditable, firstLevel);
}

function unwrapRangeFromTag(contentEditable: HTMLElement, range: Range, tag: string) {
    const documentFragment: DocumentFragment = range.extractContents();

    const removeTagFrom = document.createElement("DELETED");
    removeTagFrom.appendChild(documentFragment);
    range.insertNode(removeTagFrom);

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