import {mergeLists, Normalizer} from "@/core/normalize/normalize";
import {Action, Attributes} from "@/core/command/type/command";
import {CursorPosition, getCursorPosition} from "@/core/shared/type/cursor-position";
import {atEnd, atStart} from "@/core/cursor/util/cursor-util";

/**
 * Removes a first-level block and returns the cursor position to fall back to: the end of
 * the block before it, or the start of the block after it only when the block opened the editor.
 *
 * @remarks
 * The block may have stood between two lists, which the removal leaves side by side; the run
 * the cursor falls back into is rebuilt as one so they join.
 */
export function removeBlock(contentEditable: HTMLElement, block: HTMLElement, cursorPosition: CursorPosition): CursorPosition {
    const previous = block.previousElementSibling;
    const next = block.nextElementSibling;
    block.remove();

    if (previous) {
        return mergeLists(contentEditable, atEnd(previous));
    }

    return next ? mergeLists(contentEditable, atStart(next)) : cursorPosition;
}

export function tag(contentEditable: HTMLElement, tag: string, action: Action, cursorPosition = getCursorPosition(), attributes?: Attributes) {
    const normalizer: Normalizer = new Normalizer(contentEditable);
    if (action === Action.Wrap) {
        normalizer.appendTag(tag, attributes);
    }

    if (action === Action.Unwrap) {
        normalizer.removeTags([tag]);
    }

    return cursorPosition;
}

export function applyAttributes(element: HTMLElement, attributes?: Attributes) {
    if (attributes) {
        for (const key in attributes) {
            if (Object.prototype.hasOwnProperty.call(attributes, key)) {
                const value = attributes[key as keyof Attributes];
                if (!value) {
                    element.removeAttribute(key);

                    continue;
                }
                if (typeof value === "string") {
                    element.setAttribute(key, value);
                }
            }
        }
    }
}

export function isElementsEqualToTags(elements: HTMLElement[], tags: string[]) {
    for (const element of elements) {
        if (!tags.includes(element.nodeName)) {
            return false;
        }
    }

    return true;
}