import {getSiblingTarget, isOnEdgeLine} from "@/core/cursor/util/cursor-util";
import {BlockCursor} from "@/core/cursor/util/block-cursor";
import {getRootElement, isImageBlock} from "@/core/shared/element-util";
import {getSelectedBlock} from "@/core/selection/selection";
import {CursorPosition} from "@/core/shared/type/cursor-position";

/**
 * Keeps the cursor out of an image block - a paragraph holding an image and nothing else,
 * where there is no line to type on. An arrow move into the block, and a click on the image,
 * are redirected to the block on the far side.
 */
export class ImageCursor extends BlockCursor {
    protected readonly keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];

    /**
     * A click on the image goes to the nearest block: the one above when the click is in the
     * image's upper half, the one below otherwise.
     */
    protected getClickTarget(event: MouseEvent, cursorPosition: CursorPosition): CursorPosition | null {
        const imageBlock = this.getImageBlock(cursorPosition.startContainer);
        if (!imageBlock) {
            return null;
        }

        const rect = imageBlock.getBoundingClientRect();
        const isBefore = event.clientY < rect.top + rect.height / 2;

        return getSiblingTarget(imageBlock, isBefore) ?? getSiblingTarget(imageBlock, !isBefore);
    }

    /** The image block the move is about to enter. */
    protected getEnteredBlock(key: string, cursorPosition: CursorPosition, isBefore: boolean): HTMLElement | null {
        const neighbour = this.getNeighbour(cursorPosition, isBefore);
        if (!neighbour || !isImageBlock(neighbour.sibling)) {
            return null;
        }

        return this.isLeavingRoot(key, neighbour.root, cursorPosition, isBefore) ? neighbour.sibling as HTMLElement : null;
    }

    protected getMoveTarget(imageBlock: HTMLElement, cursorPosition: CursorPosition, isBefore: boolean): CursorPosition | null {
        return getSiblingTarget(imageBlock, isBefore);
    }

    /** Whether the move leaves the root: a horizontal one does at the root's very edge, a vertical one from its edge line. */
    private isLeavingRoot(key: string, root: HTMLElement, cursorPosition: CursorPosition, isBefore: boolean) {
        if (key === "ArrowLeft" || key === "ArrowRight") {
            return this.isAtRootEdge(root, cursorPosition, isBefore);
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
