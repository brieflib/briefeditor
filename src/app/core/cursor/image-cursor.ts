import {
    applyCursor,
    getCursorOffsetInElement,
    getCursorPositionFromPoint,
    getSiblingTarget,
    isArrowKey,
    isOnEdgeLine,
    isPlainClick
} from "@/core/cursor/util/cursor-util";
import {getRootElement, isImageBlock} from "@/core/shared/element-util";
import {getSelectedBlock} from "@/core/selection/selection";
import {CursorPosition, getCursorPosition, isCollapsed} from "@/core/shared/type/cursor-position";

/**
 * Keeps the cursor out of an image block - a paragraph holding an image and nothing else,
 * where there is no line to type on.
 *
 * @remarks
 * Works the way `TableCursor` does: an arrow move that would carry the cursor into the
 * block, and a click on the image, are each intercepted before the browser acts on them and
 * redirected to the block on the far side, so the cursor never reaches the image.
 */
export class ImageCursor {
    private readonly contentEditable: HTMLElement;

    constructor(contentEditable: HTMLElement) {
        this.contentEditable = contentEditable;

        contentEditable.addEventListener("keydown", (event) => this.onKeyDown(event), true);
        contentEditable.addEventListener("mousedown", (event) => this.onMouseDown(event), true);
    }

    /**
     * Redirects a click landing in an image block to the nearest block: the one above when
     * the click is in the image's upper half, the one below otherwise.
     */
    onMouseDown(event: MouseEvent, resolved?: CursorPosition | null): CursorPosition | null {
        if (!isPlainClick(event)) {
            return null;
        }

        const cursorPosition = resolved === undefined
            ? getCursorPositionFromPoint(event.clientX, event.clientY)
            : resolved;
        const imageBlock = cursorPosition && this.getImageBlock(cursorPosition.startContainer);
        if (!imageBlock) {
            return null;
        }

        event.preventDefault();
        // A prevented click no longer focuses the editor, and focusing would drop the selection.
        this.contentEditable.focus();

        const rect = imageBlock.getBoundingClientRect();
        const isBefore = event.clientY < rect.top + rect.height / 2;
        const target = getSiblingTarget(imageBlock, isBefore) ?? getSiblingTarget(imageBlock, !isBefore);

        return target ? applyCursor(this.contentEditable, target) : null;
    }

    /**
     * Redirects an arrow move that would carry the cursor into an image block to the block on
     * its far side. A move with no block beyond the image is dropped, leaving the cursor put.
     */
    onKeyDown(event: KeyboardEvent): CursorPosition | null {
        if (!isArrowKey(event, ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"])) {
            return null;
        }

        const cursorPosition = getCursorPosition();
        if (!isCollapsed(cursorPosition) || !this.contentEditable.contains(cursorPosition.startContainer)) {
            return null;
        }

        const isBefore = event.key === "ArrowLeft" || event.key === "ArrowUp";
        const imageBlock = this.getEnteredImageBlock(event.key, cursorPosition, isBefore);
        if (!imageBlock) {
            return null;
        }

        event.preventDefault();
        const target = getSiblingTarget(imageBlock, isBefore);

        return target ? applyCursor(this.contentEditable, target) : null;
    }

    /** The image block the move is about to enter, or `null` if the browser's own move is fine. */
    private getEnteredImageBlock(key: string, cursorPosition: CursorPosition, isBefore: boolean) {
        const root = getRootElement(this.contentEditable, cursorPosition.startContainer);
        if (root.parentElement !== this.contentEditable) {
            return null;
        }

        const sibling = isBefore ? root.previousElementSibling : root.nextElementSibling;
        if (!isImageBlock(sibling)) {
            return null;
        }

        return this.isLeavingRoot(key, root, cursorPosition, isBefore) ? sibling as HTMLElement : null;
    }

    /**
     * Whether the move leaves the root. A horizontal move does at the root's very edge, once
     * a list's inner blocks are stepped through; a vertical one from its edge line.
     */
    private isLeavingRoot(key: string, root: HTMLElement, cursorPosition: CursorPosition, isBefore: boolean) {
        if (key === "ArrowLeft" || key === "ArrowRight") {
            const offset = getCursorOffsetInElement(root, cursorPosition);
            return offset === (isBefore ? 0 : root.textContent.length);
        }

        const block = getSelectedBlock(this.contentEditable, cursorPosition)[0] ?? root;

        return isOnEdgeLine(root, block, cursorPosition, isBefore);
    }

    /** The image block holding `node`, if any. */
    private getImageBlock(node: Node): HTMLElement | null {
        if (!this.contentEditable.contains(node) || node === this.contentEditable) {
            return null;
        }

        const root = getRootElement(this.contentEditable, node);

        return isImageBlock(root) ? root : null;
    }
}
