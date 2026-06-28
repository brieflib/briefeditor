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
    // childList: cloned subtrees to insert on redo, original nodes to restore on undo,
    // and the nodes currently occupying the slot so they can be removed on the next replay.
    readonly addedTemplate: Node[];
    readonly removedNodes: Node[];
    live: Node[];
}

export interface HistoryEntry {
    readonly mutations: Mutation[];
    readonly cursorBefore: CursorPath | null;
    readonly cursorAfter: CursorPath | null;
}
