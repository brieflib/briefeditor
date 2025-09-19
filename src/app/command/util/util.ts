export function getRange(): Range {
    return window.getSelection()!.getRangeAt(0);
}