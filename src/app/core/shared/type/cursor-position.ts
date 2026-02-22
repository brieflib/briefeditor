export interface CursorPosition {
    readonly startContainer: Node,
    readonly endContainer: Node,
    readonly startOffset: number,
    readonly endOffset: number
}

export function isCursorPositionEqual(comparable?: CursorPosition | null, compareTo?: CursorPosition | null) {
    if (!comparable || !compareTo) {
        return false;
    }

    return comparable.startContainer === compareTo.startContainer &&
        comparable.endContainer === compareTo.endContainer &&
        comparable.startOffset === compareTo.startOffset &&
        comparable.endOffset === compareTo.endOffset;
}