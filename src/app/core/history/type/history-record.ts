export interface CursorPath {
    readonly startPath: number[];
    readonly startOffset: number;
    readonly endPath: number[];
    readonly endOffset: number;
}

export interface Mutation {
    readonly type: MutationRecordType;
    readonly target: Node;
    readonly nextSibling: Node | null;
    readonly attributeName: string | null;
    readonly oldValue: string | null;
    newValue: string | null;
    /** Original node references (for childList mutations), preserving identity for cursors/selections. */
    readonly addedNodes: Node[];
    readonly removedNodes: Node[];
    /**
     * Snapshots each added subtree's node arrangement at command end, since commands can
     * assemble subtrees while detached (see `replaceElement` in normalize.ts), where the
     * MutationObserver records nothing. Lets redo re-place descendants that undo pulled out
     * via the recorded removals.
     */
    readonly addedLayouts: NodeLayout[];
}

export interface NodeLayout {
    readonly node: Node;
    readonly children: NodeLayout[];
}

export interface HistoryEntry {
    /** A carrier-only command appends here rather than opening its own entry, riding along on redo. */
    readonly mutations: Mutation[];
    readonly cursorBefore: CursorPath | null;
    cursorAfter: CursorPath | null;
}
