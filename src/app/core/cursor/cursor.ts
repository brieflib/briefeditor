import {getCursorPosition, isCollapsed} from "@/core/shared/type/cursor-position";
import {getCursorOffsetInElement} from "@/core/cursor/util/cursor-util";
import {getSelectedBlock} from "@/core/selection/selection";
import {Display, isSchemaContain} from "@/core/normalize/type/schema";
import {getLine} from "@/core/list/util/list-util";
import {getElement, hasSelfCloseDescendant} from "@/core/shared/element-util";

export function isCursorAtEndOfBlock(contentEditable: HTMLElement, cursorPosition = getCursorPosition()) {
    if (!isCollapsed(cursorPosition)) {
        return false;
    }

    // The block is read from the cursor handed in rather than from the live selection: a command asks this
    // in the middle of its own work, where the selection still stands where the writer left it and the
    // cursor has already moved on to what the command has written.
    const block = getSelectedBlock(contentEditable, cursorPosition)[0];
    if (!block) {
        return false;
    }

    const endOffset = getCursorOffsetInElement(block, cursorPosition);
    if (!isSchemaContain(block, [Display.List])) {
        return endOffset === block.textContent.length;
    }

    return endOffset === getLine(block).textContent.length;
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

    return getSelectedBlock(contentEditable, cursorPosition).length > 1;
}

/** Whether the point stands at the very start of its line: no text and no self-close tag before it. */
export function isAtLineStart(contentEditable: HTMLElement, container: Node, offset: number) {
    const line = getElement(contentEditable, container as HTMLElement, [Display.Line, Display.List]);
    if (!line) {
        return false;
    }

    const range = new Range();
    range.setStart(line, 0);
    // A caret on a self-close tag stands before it, so the tag itself is not before the caret.
    if (isSchemaContain(container, [Display.SelfClose])) {
        range.setEndBefore(container);
    } else {
        range.setEnd(container, offset);
    }

    const before = range.cloneContents();
    return !before.textContent && !hasSelfCloseDescendant(before);
}
