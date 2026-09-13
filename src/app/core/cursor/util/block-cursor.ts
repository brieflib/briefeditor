import {CursorPosition, getCursorPosition, isCollapsed, setCursorPosition} from "@/core/shared/type/cursor-position";
import {getCursorOffsetInElement, getCursorPositionFromPoint} from "@/core/cursor/util/cursor-util";
import {getRootElement} from "@/core/shared/element-util";

/** The cursor's first-level root and the block beside it in a move's direction. */
export interface Neighbour {
    root: HTMLElement;
    sibling: Element | null;
}

/**
 * Keeps the cursor out of a block it must never rest in, by taking over the two actions that
 * lead there - an arrow move and a click - before the browser acts on them, so the cursor never
 * reaches the block and never needs correcting. A subclass names the block and where the cursor
 * goes instead.
 */
export abstract class BlockCursor {
    protected readonly contentEditable: HTMLElement;
    /** The arrow keys the guard takes over. */
    protected abstract readonly keys: string[];

    constructor(contentEditable: HTMLElement) {
        this.contentEditable = contentEditable;

        // Capture wins when the event targets a descendant; registering before the editor's
        // own keydown listener covers the case where the editor itself is the target. A
        // default action only runs once the whole dispatch is over, so preventDefault here
        // still stops it either way.
        contentEditable.addEventListener("keydown", (event) => this.onKeyDown(event), true);
        contentEditable.addEventListener("mousedown", (event) => this.onMouseDown(event), true);
    }

    /**
     * Redirects a click that would land the cursor in the block. Unlike a key, a click can't
     * be intercepted after the fact since the browser places the cursor itself - so this asks
     * where it would land before it does.
     */
    onMouseDown(event: MouseEvent, resolved?: CursorPosition | null): CursorPosition | null {
        // A shifted click extends the selection instead of placing the cursor, so the hit
        // test below only runs once the click is known to be a plain one.
        if (!isPlainClick(event)) {
            return null;
        }

        const cursorPosition = resolved === undefined
            ? getCursorPositionFromPoint(event.clientX, event.clientY)
            : resolved;
        const target = cursorPosition && this.getClickTarget(event, cursorPosition);
        if (!target) {
            return null;
        }

        event.preventDefault();
        // A prevented click no longer focuses the editor, and focusing would drop the selection.
        this.contentEditable.focus();

        return applyCursor(this.contentEditable, target);
    }

    /**
     * Redirects an arrow-key move that would carry the cursor into the block. Done before the
     * browser moves the cursor itself, since correcting it afterwards would still paint one
     * frame with the cursor there. A move with nowhere to go is dropped, leaving the cursor put.
     */
    onKeyDown(event: KeyboardEvent): CursorPosition | null {
        if (!isArrowKey(event, this.keys)) {
            return null;
        }

        const cursorPosition = getCursorPosition();
        if (!isCollapsed(cursorPosition) || !this.contentEditable.contains(cursorPosition.startContainer)) {
            return null;
        }

        const isBefore = event.key === "ArrowLeft" || event.key === "ArrowUp";
        const block = this.getEnteredBlock(event.key, cursorPosition, isBefore);
        if (!block) {
            return null;
        }

        event.preventDefault();
        const target = this.getMoveTarget(block, cursorPosition, isBefore);

        return target ? applyCursor(this.contentEditable, target) : null;
    }

    /** Where a click resolving to `cursorPosition` is redirected, or `null` to leave it to the browser. */
    protected abstract getClickTarget(event: MouseEvent, cursorPosition: CursorPosition): CursorPosition | null;

    /** The block the move is about to enter or leave, or `null` if the browser's own move is fine. */
    protected abstract getEnteredBlock(key: string, cursorPosition: CursorPosition, isBefore: boolean): HTMLElement | null;

    /** Where the cursor goes once the move over `block` is taken over, or `null` when nothing lies beyond. */
    protected abstract getMoveTarget(block: HTMLElement, cursorPosition: CursorPosition, isBefore: boolean): CursorPosition | null;

    /** The cursor's root and the block beside it, or `null` when the cursor stands in no first-level root. */
    protected getNeighbour(cursorPosition: CursorPosition, isBefore: boolean): Neighbour | null {
        // getRootElement stops at the editor's own child, so its parent doubles as the containment test.
        const root = getRootElement(this.contentEditable, cursorPosition.startContainer);
        if (root.parentElement !== this.contentEditable) {
            return null;
        }

        return {root, sibling: isBefore ? root.previousElementSibling : root.nextElementSibling};
    }

    /**
     * Whether a horizontal move leaves the root. Measured against the whole root element so a
     * list's inner blocks are stepped through first, and only its very edge carries the cursor out.
     */
    protected isAtRootEdge(root: HTMLElement, cursorPosition: CursorPosition, isBefore: boolean) {
        const offset = getCursorOffsetInElement(root, cursorPosition);

        return offset === (isBefore ? 0 : root.textContent.length);
    }
}

/** Whether a key press is an unmodified arrow among `keys` - a plain cursor move a guard may take over. */
function isArrowKey(event: KeyboardEvent, keys: string[]) {
    if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) {
        return false;
    }

    return keys.includes(event.key);
}

/** Whether a click places the cursor: a shifted or non-primary click extends or ignores the selection instead. */
function isPlainClick(event: MouseEvent) {
    return event.button === 0 && !event.shiftKey;
}

function applyCursor(contentEditable: HTMLElement, target: CursorPosition) {
    setCursorPosition(contentEditable, target);

    return target;
}
