import {CursorPosition, extractContents} from "@/core/shared/type/cursor-position";
import {getSelectedBlocks} from "@/core/selection/selection";

export class Merger {
    private readonly cursorPosition: CursorPosition;
    private readonly originalBlocks: Node[] = [];
    private originalContentArray: OriginalContent[] = [];
    private originalContentByFragmentNode = new Map<Node, OriginalContent>;

    constructor(contentEditable: HTMLElement, cursorPosition: CursorPosition) {
        this.cursorPosition = cursorPosition;
        this.originalBlocks = getSelectedBlocks(contentEditable, cursorPosition);
        this.traverse(this.originalBlocks, this.populateOriginalContentArray.bind(this));
    }

    public initDocumentFragment(fragment: DocumentFragment) {
        this.traverse(Array.from(fragment.childNodes), this.populateOriginalContentByFragmentNode.bind(this));
    }

    public mergeIntoDom(fragment: DocumentFragment) {
        this.traverse(Array.from(fragment.childNodes), this.mergeNodes.bind(this));
    }

    private mergeNodes(fragment: Node, orderNumber: number) {
        const originalContent = this.originalContentByFragmentNode.get(fragment);
        if (!originalContent) {
            const nextOriginalContent = this.getNextPresent(orderNumber);
            if (nextOriginalContent && nextOriginalContent.originalNode instanceof HTMLElement) {
                const nextOriginal = nextOriginalContent.originalNode;
                this.insertNode(nextOriginal, fragment, nextOriginalContent.position);
            }
            return;
        }

        const original = originalContent.originalNode;
        if (original instanceof Text && fragment instanceof Text) {
            this.insertTextNode(original, fragment, originalContent.position);
        }
    }

    private insertNode(original: HTMLElement, fragment: Node, contentPosition: ContentPosition) {
        if (contentPosition === ContentPosition.Start) {
            original.parentElement?.insertBefore(fragment, original);
        }

        if (contentPosition === ContentPosition.End) {
            original.append(fragment);
        }
    }

    private insertTextNode(original: Text, fragment: Text, contentPosition: ContentPosition) {
        let text;
        if (contentPosition === ContentPosition.Start) {
            text = document.createTextNode(original.data + fragment.data);
        }

        if (contentPosition === ContentPosition.End) {
            text = document.createTextNode(fragment.data + original.data);
        }

        if (text) {
            original.replaceWith(text);
        }
    }

    private getNextPresent(orderNumber: number) {
        for (let i = orderNumber + 1; i < this.originalContentArray.length; i++) {
            const next = this.originalContentArray.at(i);
            if (next && next.originalNode.isConnected) {
                return next;
            }
        }

        return undefined;
    }

    private traverse(originalBlocks: Node[], callback: (node: Node, count: number) => void) {
        let counter = 0;

        const traverse = (node: Node) => {
            callback(node, counter);
            counter++;
            Array.from(node.childNodes).forEach(traverse);
        };

        originalBlocks.forEach(traverse);
    }

    private populateOriginalContentArray(originalNode: Node, orderNumber: number) {
        const originalContent = this.createOriginalContent(originalNode, orderNumber);
        this.originalContentArray.push(originalContent);
    }

    private populateOriginalContentByFragmentNode(fragmentNode: Node, orderNumber: number) {
        const originalContent = this.originalContentArray.at(orderNumber);
        if (!originalContent) {
            throw Error("Original content does to conform fragment content");
        }
        this.originalContentByFragmentNode.set(fragmentNode, originalContent);
    }

    private createOriginalContent(originalNode: Node, orderNumber: number): OriginalContent {
        return {
            originalNode: originalNode,
            orderNumber: orderNumber,
            position: this.getContentPosition(originalNode)
        }
    }

    private getContentPosition(contentNode: Node): ContentPosition {
        const {startContainer, endContainer} = this.cursorPosition;

        if (contentNode === startContainer) {
            return ContentPosition.Start;
        }
        if (contentNode === endContainer) {
            return ContentPosition.End;
        }

        return ContentPosition.None;
    }
}

interface OriginalContent {
    originalNode: Node,
    orderNumber: number,
    position: ContentPosition
}

enum ContentPosition {
    None = "None",
    Start = "Start",
    End = "End"
}