import {getCursorPosition, isCollapsed} from "@/core/shared/type/cursor-position";
import {getCursorOffsetInElement} from "@/core/cursor/util/cursor-util";
import {getSelectedBlock} from "@/core/selection/selection";
import {Display, isSchemaContain} from "@/core/normalize/type/schema";

export function isCursorAtEndOfBlock(contentEditable: HTMLElement, cursorPosition = getCursorPosition()) {
    if (!isCollapsed(cursorPosition)) {
        return false;
    }

    const block = getSelectedBlock(contentEditable)[0];
    if (!block) {
        return false;
    }

    const endOffset = getCursorOffsetInElement(block, cursorPosition);
    if (!isSchemaContain(block, [Display.List])) {
        return endOffset === block.textContent.length;
    }

    const blockWithoutListWrappers = block.cloneNode(true) as HTMLElement;
    const nestedListWrappers = blockWithoutListWrappers.querySelectorAll("ul, ol");
    nestedListWrappers.forEach(listWrapper => {
        listWrapper.remove();
    });
    const elementLength = blockWithoutListWrappers.textContent.length;

    return endOffset === elementLength;
}

export function isCursorAtStartOfBlock(contentEditable: HTMLElement, cursorPosition = getCursorPosition()) {
    if (!isCollapsed(cursorPosition)) {
        return false;
    }

    const block = getSelectedBlock(contentEditable, cursorPosition)[0];
    if (!block) {
        return false;
    }

    return getCursorOffsetInElement(block, cursorPosition) === 0;
}

export function isCursorIntersectBlocks(contentEditable: HTMLElement, cursorPosition = getCursorPosition()) {
    if (isCollapsed(cursorPosition)) {
        return false;
    }

    return getSelectedBlock(contentEditable).length > 1;
}

