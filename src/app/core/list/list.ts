import {getFirstSelectedRoot, getSelectedBlock, getSelectedRoot} from "@/core/selection/selection";
import {Display, isSchemaContain} from "@/core/normalize/type/schema";
import {appendTags, normalizeRootElements, removeDistantTags} from "@/core/normalize/normalize";
import {
    countListWrapperParents,
    getDirectChildren,
    isChildrenContain,
    moveListWrappersOutOfLi,
    moveListWrapperToPreviousLi
} from "@/core/list/util/list-util";
import {getNextNode} from "@/core/shared/element-util";
import {getCursorPosition} from "@/core/shared/type/cursor-position";

export function isNextListNested(contentEditable: HTMLElement, lists: HTMLElement[] = getSelectedBlock(contentEditable)) {
    const lastList = lists[lists.length - 1];
    if (!lastList) {
        return false;
    }
    if (!isSchemaContain(lastList, [Display.List])) {
        return false;
    }
    const listWrapperChildren = getDirectChildren(lastList, [Display.ListWrapper]);
    if (listWrapperChildren.length) {
        return true;
    }
    const maybeNextList = getNextNode(contentEditable, lastList);
    if (!maybeNextList) {
        return false;
    }
    const nestedLevel = countListWrapperParents(contentEditable, maybeNextList as HTMLElement);
    if (isSchemaContain(maybeNextList, [Display.List])) {
        return nestedLevel !== 1;
    }
    if (isSchemaContain(maybeNextList, [Display.ListWrapper])) {
        return nestedLevel !== 0;
    }

    return false;
}

export function isPlusIndentEnabled(contentEditable: HTMLElement, lists: HTMLElement[] = getSelectedBlock(contentEditable)) {
    const firstList = lists[0];
    if (!firstList) {
        return false;
    }

    const previousListWrapper = firstList.parentElement?.previousElementSibling;
    if (previousListWrapper && previousListWrapper && isSchemaContain(previousListWrapper, [Display.ListWrapper])) {
        return true;
    }

    if (!firstList.previousElementSibling || !isSchemaContain(firstList.previousElementSibling, [Display.List, Display.ListWrapper])) {
        return false;
    }

    for (const list of lists) {
        if (!isSchemaContain(list, [Display.List])) {
            return false;
        }

        if (countListWrapperParents(contentEditable, list) >= 5) {
            return false;
        }
    }

    return true;
}

export function plusIndent(contentEditable: HTMLElement, lists: HTMLElement[] = getSelectedBlock(contentEditable)) {
    if (!isPlusIndentEnabled(contentEditable, lists)) {
        return;
    }

    const cursorPosition = getCursorPosition();

    for (let i = 0; i < lists.length; i++) {
        const li = getSelectedBlock(contentEditable, cursorPosition)[i];
        if (!li) {
            continue;
        }

        const listWrapper = li.parentElement;
        if (!listWrapper) {
            continue;
        }

        appendTags(contentEditable, li, [listWrapper.nodeName]);
    }

    const rootElements = getSelectedRoot(contentEditable, cursorPosition);
    for (const rootElement of rootElements) {
        moveListWrapperToPreviousLi(rootElement);
    }
    normalizeRootElements(contentEditable, cursorPosition);
}

export function isMinusIndentEnabled(contentEditable: HTMLElement) {
    const lists = getSelectedBlock(contentEditable);
    for (const list of lists) {
        if (!list) {
            return false;
        }

        if (!isSchemaContain(list, [Display.List])) {
            return false;
        }

        const listNesting = countListWrapperParents(contentEditable, list);
        if (listNesting === 1) {
            return false;
        }

        const nextList = list.querySelectorAll("ul, ol")[0];
        if (!nextList) {
            continue;
        }

        if (!isChildrenContain(nextList.children, lists) && isSchemaContain(nextList, [Display.ListWrapper])) {
            return false;
        }
    }

    return true;
}

export function minusIndent(contentEditable: HTMLElement, lists: HTMLElement[] = getSelectedBlock(contentEditable)) {
    if (!isMinusIndentEnabled(contentEditable)) {
        return;
    }

    let cursorPosition = getCursorPosition();
    let firstRootElement = getFirstSelectedRoot(contentEditable, cursorPosition);
    removeDistantTags(contentEditable, firstRootElement, lists, [firstRootElement.nodeName, "LI"]);
    firstRootElement = getFirstSelectedRoot(contentEditable, cursorPosition);
    moveListWrappersOutOfLi(contentEditable, firstRootElement);
    normalizeRootElements(contentEditable, cursorPosition);
}

export function isListMergeAllowed(contentEditable: HTMLElement): boolean {
    const cursorPosition = getCursorPosition();
    const blocks = getSelectedBlock(contentEditable, cursorPosition);
    const firstBlock = blocks[0];
    const lastBlock = blocks[blocks.length - 1];
    if (!firstBlock || !lastBlock) {
        return false;
    }

    const nodeAfterLast = getNextNode(contentEditable, cursorPosition.endContainer);
    const firstNestingLevel = countListWrapperParents(contentEditable, firstBlock);
    const lastNestingLevel = countListWrapperParents(contentEditable, lastBlock);

    const nextNodeIsListWrapper = isSchemaContain(nodeAfterLast, [Display.ListWrapper]);
    const nextNodeIsOutsideSelection = !lastBlock.contains(nodeAfterLast);
    const nestingLevelsMismatch = firstNestingLevel !== lastNestingLevel;
    if (nextNodeIsListWrapper && (nextNodeIsOutsideSelection || nestingLevelsMismatch)) {
        return false;
    }

    const selectionContainsFirstLevel = isSchemaContain(firstBlock, [Display.FirstLevel]) || isSchemaContain(lastBlock, [Display.FirstLevel]);
    const nextNodeIsNotListItem = !isSchemaContain(nodeAfterLast, [Display.List]);
    if (selectionContainsFirstLevel && nextNodeIsNotListItem) {
        return true;
    }

    if (lastNestingLevel === 1) {
        return true;
    }

    return firstNestingLevel === lastNestingLevel || firstNestingLevel === lastNestingLevel - 1;
}