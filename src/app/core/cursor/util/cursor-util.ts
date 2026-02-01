import {getFirstText, getNextNode, getPreviousNode, getRootElement} from "@/core/shared/element-util";

interface NodeOffset {
    node: Node | null,
    offset: number
}

export function findNodeAndOffset(contentEditable: HTMLElement, targetPosition: number, isShift: boolean): NodeOffset {
    let position = 0;
    const stack = [contentEditable as Node];
    while (stack.length > 0) {
        const current: Node | undefined = stack.pop();
        if (!current) {
            break;
        }
        if (current.nodeType === Node.TEXT_NODE) {
            const textContentLength = current.textContent?.length ?? 0;
            if (position + textContentLength >= targetPosition) {
                if (isShift) {
                    const node = getNextNode(contentEditable, current);
                    if (node) {
                        const textNode = getFirstText(node);
                        if (textNode) {
                            return {node: textNode, offset: 0};
                        } else {
                            return {node: node, offset: 0};
                        }
                    }
                }
                return {node: current, offset: targetPosition - position};
            }
            position += textContentLength;
        } else if (current.childNodes && current.childNodes.length > 0) {
            for (let i = current.childNodes.length - 1; i >= 0; i--) {
                stack.push(current.childNodes[i] as Node);
            }
        }
    }

    return {node: null, offset: 0};
}

export function isOutsideElement(element: HTMLElement, start: Node, end: Node): boolean {
    const startParent = getRootElement(element, start as HTMLElement);
    const endParent = getRootElement(element, end as HTMLElement);

    return startParent.nodeName === "HTML" || endParent.nodeName === "HTML"
}

export function isShift(previousText: Node | undefined, range: Range, container: Node, offset: number) {
    if (!previousText) {
        return false;
    }

    const previousRangeStart: Range = range.cloneRange();
    previousRangeStart.selectNodeContents(previousText);
    previousRangeStart.setEnd(container, offset);
    return range.startOffset === 0 && previousText?.textContent?.length === previousRangeStart.toString().length;
}