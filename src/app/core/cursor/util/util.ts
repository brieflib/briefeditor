import {CursorPosition} from "@/core/cursor/type/cursor-position";
import {getFirstLevelElement} from "@/core/shared/element-util";

interface NodeOffset {
    node: HTMLElement | null,
    offset: number
}

export function createRange(contentEditable: HTMLElement, cursorPosition: CursorPosition): Range {
    const range: Range = document.createRange();
    range.selectNode(contentEditable);

    const start = findNodeAndOffset(contentEditable, cursorPosition.startOffset);
    const end = findNodeAndOffset(contentEditable, cursorPosition.endOffset);

    if (start.node) {
        range.setStart(start.node, start.offset);
    } else {
        range.setStart(contentEditable, 0);
    }

    if (end.node) {
        range.setEnd(end.node, end.offset);
    } else {
        range.setEnd(contentEditable, 0);
    }

    return range;
}

export function findNodeAndOffset(contentEditable: HTMLElement, targetPosition: number): NodeOffset {
    let position = 0;
    const stack = [contentEditable];
    while (stack.length > 0) {
        const current: Node | undefined = stack.pop();
        if (!current) {
            break;
        }

        if (current.nodeType === Node.TEXT_NODE) {
            const textContentLength = current.textContent.length;

            if (position + textContentLength >= targetPosition) {
                return {node: current as HTMLElement, offset: targetPosition - position};
            }
            position += textContentLength;
        } else if (current.childNodes && current.childNodes.length > 0) {
            for (let i = current.childNodes.length - 1; i >= 0; i--) {
                stack.push(current.childNodes[i] as HTMLElement);
            }
        }
    }

    return {node: null, offset: 0};
}

export function isOutsideElement(element: HTMLElement, start: Node, end: Node): boolean {
    const startParent = getFirstLevelElement(element, start as HTMLElement);
    const endParent = getFirstLevelElement(element, end as HTMLElement);

    return startParent.nodeName === "HTML" || endParent.nodeName === "HTML"
}