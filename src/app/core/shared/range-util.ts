export function getRange(): Range {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
        return selection.getRangeAt(0);
    }

    const range = new Range();
    range.setStart(document.body, 0);
    range.setEnd(document.body, 0);
    return range;
}

export function addRange(range: Range) {
    window.getSelection().removeAllRanges();
    document.getSelection().addRange(range)
}