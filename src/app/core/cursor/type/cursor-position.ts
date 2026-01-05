export interface CursorPosition {
    startOffset: number,
    endOffset: number,
    isStartShift: boolean,
    isEndShift: boolean
}

export function isCursorPositionEqual(comparable?: CursorPosition | null, compareTo?: CursorPosition | null) {
    if (!comparable || !compareTo) {
        return false;
    }

    return comparable.startOffset === compareTo.startOffset &&
        comparable.endOffset === compareTo.endOffset &&
        comparable.isStartShift === compareTo.isStartShift &&
        comparable.isEndShift === compareTo.isEndShift;
}