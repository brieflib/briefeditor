/** A self-close tag Backspace or Delete removes. It is created only for a node that is a self-close tag. */
export class SelfCloseRemoval {
    /** The self-close tag to remove. */
    readonly node: Node;
    /** The line the node stands in, read while the node is still there. */
    readonly line: HTMLElement | null;
    /** Whether the line stays once it is emptied, so the caret's line is merged into it. */
    readonly isLineKept: boolean;

    constructor(node: Node, line: HTMLElement | null, isLineKept: boolean) {
        this.node = node;
        this.line = line;
        this.isLineKept = isLineKept;
    }
}

/** What removing a self-close tag left on its line. */
export interface SelfCloseRemovalResult {
    /** Whether the line holds nothing and is not kept for the caret's line to merge into. */
    readonly isLineEmptied: boolean;
    /** Whether another self-close tag still holds the line open. */
    readonly isLineHeldBySelfClose: boolean;
}
