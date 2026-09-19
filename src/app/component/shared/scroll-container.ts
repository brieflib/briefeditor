/**
 * The element the contentEditable scrolls inside: its box is what the user sees of the editor.
 * Controls laid over the content sit in the document, not in this element, so nothing clips
 * them - each has to keep itself inside the box on its own.
 */
export function getScrollContainer(): HTMLElement | null {
    return document.querySelector("#be-content");
}

/**
 * Whether `rect`, a box in viewport coordinates, lies within the editor's visible box. A missing
 * scroll container clips nothing, so everything counts as visible.
 */
export function isInsideScrollContainer(rect: DOMRect): boolean {
    const container = getScrollContainer()?.getBoundingClientRect();
    if (!container) {
        return true;
    }

    return rect.top >= container.top && rect.bottom <= container.bottom &&
        rect.left >= container.left && rect.right <= container.right;
}
