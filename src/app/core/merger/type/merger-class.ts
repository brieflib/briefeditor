import {CursorPosition} from "@/core/shared/type/cursor-position";
import {getSelectedBlocks} from "@/core/selection/selection";
import {extractContents} from "@/core/extractor/extractor";

export class Merger {
    private readonly contentEditable: HTMLElement;
    private readonly cursorPosition: CursorPosition;
    private readonly originalBlocks: Node[] = [];
    private originalByFragmentNode = new Map<Node, Node>();
    private firstInserted: Node | undefined;
    private lastInserted: Node | undefined;

    constructor(contentEditable: HTMLElement, cursorPosition: CursorPosition) {
        this.contentEditable = contentEditable;
        this.cursorPosition = cursorPosition;
        this.originalBlocks = getSelectedBlocks(contentEditable, cursorPosition);
    }

    public extractContents() {
        const {fragment, originalByFragmentNode} = extractContents(this.contentEditable, this.cursorPosition);
        this.originalByFragmentNode = originalByFragmentNode;
        return fragment;
    }

    /** Merges the fragment into the selected blocks and returns the first and the last inserted nodes. */
    public mergeIntoDom(fragment: DocumentFragment): InsertedNodes {
        this.firstInserted = undefined;
        this.lastInserted = undefined;

        const original = this.originalBlocks.at(0);
        if (original instanceof Element) {
            this.mergeChildren(fragment, original);
        }

        return {first: this.firstInserted, last: this.lastInserted};
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
            const firstConnectedOriginal = this.getConnectedOriginal(fragment);
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

        return original instanceof Element && original.isConnected ? original : undefined;
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