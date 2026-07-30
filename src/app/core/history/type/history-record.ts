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
    // childList: original node references, so undo/redo preserve node identity for
    // cursors and selections that still point at them.
    readonly addedNodes: Node[];
    readonly removedNodes: Node[];
    // Commands assemble added subtrees while detached (see replaceElement in normalize.ts),
    // where the MutationObserver records nothing. addedLayouts snapshots each added
    // subtree's node arrangement at command end so redo can re-place descendants that an
    // undo pulled back out through the recorded removals.
    readonly addedLayouts: NodeLayout[];
}

export interface NodeLayout {
    readonly node: Node;
    readonly children: NodeLayout[];
}

export interface HistoryEntry {
    // A carrier-only command appends its mutations here instead of opening an entry of its own, so both
    // the list and the cursor it redoes to move on with it.
    readonly mutations: Mutation[];
    readonly cursorBefore: CursorPath | null;
    cursorAfter: CursorPath | null;
}
