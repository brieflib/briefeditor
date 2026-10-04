import {CursorPosition} from "@/core/shared/type/cursor-position";
import {getSelectedBlocks} from "@/core/selection/selection";
import {extractContents} from "@/core/extractor/extractor";
import {getBlockElement} from "@/core/shared/element-util";
import {Display, isSchemaContain} from "@/core/normalize/type/schema";

export class Merger {
    private readonly contentEditable: HTMLElement;
    private readonly cursorPosition: CursorPosition;
    private readonly originalBlocks: Node[] = [];
    private originalByFragmentNode = new Map<Node, Node>();
    private cut: number | undefined;
    private firstInserted: Node | undefined;
    private lastInserted: Node | undefined;

    constructor(contentEditable: HTMLElement, cursorPosition: CursorPosition) {
        this.contentEditable = contentEditable;
        this.cursorPosition = cursorPosition;
        this.originalBlocks = getSelectedBlocks(contentEditable, cursorPosition);
    }

    /**
     * extractContents gives two kinds of originals:
     * - Partly selected ones stay in the DOM and keep their parents.
     * - Fully selected ones move into the fragment and already map to themselves in originalByFragmentNode.
     */
    public extractContents() {
        const {fragment, originalByFragmentNode, cut} = extractContents(this.contentEditable, this.cursorPosition);
        this.originalByFragmentNode = originalByFragmentNode;
        this.cut = cut;
        return fragment;
    }

    /** Merges the fragment into the selected blocks and returns the first and the last inserted nodes. */
    public mergeIntoDom(fragment: DocumentFragment): InsertedNodes {
        // Read before the merge, which moves the fragment nodes into the DOM
        const dropped = this.getDroppedOriginals(fragment);
        this.joinAbsorbedBlocks(fragment);
        this.joinMovedItems(fragment);

        // Joining the moved items merges into originals, which isn't an insertion the caller should see
        this.firstInserted = undefined;
        this.lastInserted = undefined;
        const original = this.originalBlocks.at(0);
        if (original instanceof HTMLElement) {
            this.mergeChildren(fragment, original);
        }
        this.removeEmptied(dropped);

        return {first: this.firstInserted, last: this.lastInserted};
    }

    /**
     * Returns the originals left in the DOM whose fragment nodes normalization dropped, e.g. a tag joined into its
     * neighbour. Fully selected nodes map to themselves and aren't in the DOM, so they never count.
     */
    private getDroppedOriginals(fragment: DocumentFragment) {
        return Array.from(this.originalByFragmentNode)
            .filter(([fragmentNode, original]) => !fragment.contains(fragmentNode) && original.isConnected)
            .map(([, original]) => original);
    }

    /** Removes the dropped originals the extraction left empty; one still holding unselected content stays. */
    private removeEmptied(dropped: Node[]) {
        for (const original of dropped) {
            if (original.isConnected && !original.textContent) {
                original.parentNode?.removeChild(original);
            }
        }
    }

    /**
     * Moves the blocks normalization joined into a fragment root's block (e.g. the second of two lists) into that block,
     * so the fragment and the DOM have the same structure again.
     */
    private joinAbsorbedBlocks(fragment: DocumentFragment) {
        for (const root of fragment.childNodes) {
            const block = this.getConnectedOriginal(root);
            if (!block) {
                continue;
            }

            // A partly selected child keeps its original in the DOM, inside the block it came from
            for (const child of root.childNodes) {
                const original = this.getConnectedOriginal(child);
                if (!original) {
                    continue;
                }

                const absorbed = getBlockElement(this.contentEditable, original);
                if (absorbed !== block) {
                    block.append(...absorbed.childNodes);
                    absorbed.remove();
                }
            }
        }
    }

    /**
     * Puts the partly selected items back in place of their clones, which normalization moved under another list, e.g.
     * an item of a nested list joined into the list before it. The item keeps its unselected content and attributes.
     */
    private joinMovedItems(fragmentParent: Node) {
        for (const fragmentNode of Array.from(fragmentParent.childNodes)) {
            const original = this.getConnectedOriginal(fragmentNode);
            if (original && isSchemaContain(original, [Display.List]) && !this.getOriginalInPlace(fragmentNode)) {
                fragmentNode.replaceWith(original);
                this.mergeChildren(fragmentNode, original);
                continue;
            }

            this.joinMovedItems(fragmentNode);
        }
    }

    /**
     * Puts the fragment children into the original standing for their parent: a partly selected child is merged
     * into its original, the rest is inserted where the extraction took it from.
     */
    private mergeChildren(fragmentParent: Node, originalParent: Node) {
        let insertion: Node[] = [];

        /**
         * 1. If the first fragment has a connected original, omit the insertion.
         * 2. If all fragments lack connected originals, exit the loop. Fill the originalParent with fragments.
         * 3. If some fragments have connected originals, insert them inside the firstConnectedOriginal.
         */
        for (const fragment of fragmentParent.childNodes) {
            const firstConnectedOriginal = this.getOriginalInPlace(fragment);
            if (!firstConnectedOriginal) {
                insertion.push(fragment);
                continue;
            }

            firstConnectedOriginal.before(...insertion);
            this.trackInserted(insertion);
            insertion = [];
            this.mergeChildren(fragment, firstConnectedOriginal);
        }

        this.insertNodes(originalParent, insertion);
        this.trackInserted(insertion);
    }

    /**
     * Returns the connected original of a fragment node when it still stands under the original of the node's parent.
     * A root stands for a block, so its original always counts; an original moved elsewhere, such as one inside a
     * removed tag, doesn't, and the node is inserted as new.
     */
    private getOriginalInPlace(fragmentNode: Node) {
        const original = this.getConnectedOriginal(fragmentNode);
        const fragmentParent = fragmentNode.parentNode;
        if (!original || !fragmentParent || fragmentParent instanceof DocumentFragment) {
            return original;
        }

        return this.originalByFragmentNode.get(fragmentParent) === original.parentNode ? original : undefined;
    }

    /** Remembers the first and the last inserted nodes, as the nodes are inserted in document order. */
    private trackInserted(insertion: Node[]) {
        this.firstInserted ??= insertion.at(0);
        this.lastInserted = insertion.at(-1) ?? this.lastInserted;
    }

    /** Inserts the nodes right after the start container or right before the end container, otherwise appends them. */
    private insertNodes(originalParent: Node, insertion: Node[]) {
        for (const original of originalParent.childNodes) {
            const contentPosition = this.getContentPosition(original);
            if (contentPosition === ContentPosition.Start) {
                original.after(...insertion);
                return;
            }
            if (contentPosition === ContentPosition.End) {
                original.before(...insertion);
                return;
            }
        }

        insertion.forEach(node => originalParent.appendChild(node));
    }

    /** Returns the original element of a fragment node while it's still in the DOM, i.e. the node was only partly selected. */
    private getConnectedOriginal(fragmentNode: Node) {
        const original = this.originalByFragmentNode.get(fragmentNode);

        return original instanceof HTMLElement && original.isConnected ? original : undefined;
    }

    /** Checks whether the node holds the start or the end container of the cursor, where the extracted content was cut off. */
    private getContentPosition(node: Node): ContentPosition {
        const {startContainer, endContainer} = this.cursorPosition;

        if (node.contains(startContainer)) {
            return ContentPosition.Start;
        }
        if (node.contains(endContainer)) {
            return ContentPosition.End;
        }

        // The extraction cut between the children of the parent, so the insertion stands before the node following it
        const parent = this.originalBlocks.at(0);
        if (this.cut !== undefined && node.parentNode === parent && parent.childNodes[this.cut] === node) {
            return ContentPosition.End;
        }

        return ContentPosition.None;
    }
}

/** The first and the last nodes a merge put into the DOM, undefined when nothing was inserted. */
export interface InsertedNodes {
    readonly first: Node | undefined,
    readonly last: Node | undefined
}

enum ContentPosition {
    None = "None",
    Start = "Start",
    End = "End"
}