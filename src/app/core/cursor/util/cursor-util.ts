import {getFirstText, getNextNode} from "@/core/shared/element-util";
import {CursorPosition} from "@/core/shared/type/cursor-position";

interface ContainerOffset {
    container: Node,
    offset: number
}

// export function updateCursorPosition(contentEditable: HTMLElement, cursorPosition: CursorPosition) {
//     const start = getContainerOffset(contentEditable, cursorPosition.startContainer, cursorPosition.startOffset);
//     const end = getContainerOffset(contentEditable, cursorPosition.endContainer, cursorPosition.endOffset);
//
//     return {
//         startContainer: start.container,
//         startOffset: start.offset,
//         endContainer: end.container,
//         endOffset: end.offset
//     };
// }

// export function getContainerOffset(contentEditable: HTMLElement, container: Node, offset: number): ContainerOffset {
//     const containerLength = container.textContent?.length ?? 0;
//     if (containerLength < offset) {
//         const nextNode = getNextNode(contentEditable, container);
//         const newContainer = getFirstText(nextNode);
//         if (!newContainer) {
//             return {container: contentEditable, offset: 0};
//         }
//
//         const newOffset = offset - containerLength;
//         return {container: newContainer, offset: newOffset};
//     }
//
//     return {container: container, offset: offset}
// }

export function isIndexInArray(index: number) {
    return index !== -1;
}

export function collectTextSiblings(node: Node): Node[] {
    const siblings: Node[] = [];
    let current: Node | null = node;
    while (current && current.previousSibling?.nodeType === Node.TEXT_NODE) {
        current = current.previousSibling;
    }
    while (current && current.nodeType === Node.TEXT_NODE) {
        siblings.push(current);
        current = current.nextSibling;
    }
    return siblings;
}

export function computeOffset(siblings: Node[], index: number, originalOffset: number): number {
    let offset = originalOffset;
    for (let i = 0; i < index; i++) {
        offset += siblings[i]?.textContent?.length ?? 0;
    }
    return offset;
}

export function replaceWithMerged(siblings: Node[]): Node {
    const mergedText = siblings.map(n => n.textContent ?? "").join("");
    const newTextNode = document.createTextNode(mergedText);
    const firstElement = siblings[0] as Node;
    const parent = firstElement.parentElement;
    parent?.insertBefore(newTextNode, firstElement);
    for (const node of siblings) {
        parent?.removeChild(node);
    }
    return newTextNode;
}

// export function findNodeAndOffset(startElement: HTMLElement, targetPosition: number, isShift: boolean): NodeOffset {
//     let position = 0;
//     const stack = [startElement as Node];
//     while (stack.length > 0) {
//         const current: Node | undefined = stack.pop();
//         if (!current) {
//             break;
//         }
//         if (current.nodeType === Node.TEXT_NODE) {
//             const textContentLength = current.textContent?.length ?? 0;
//             if (position + textContentLength >= targetPosition) {
//                 if (isShift) {
//                     const node = getNextNode(startElement, current);
//                     if (node) {
//                         const textNode = getFirstText(node);
//                         if (textNode) {
//                             return {node: textNode, offset: 0};
//                         } else {
//                             return {node: node, offset: 0};
//                         }
//                     }
//                 }
//                 return {node: current, offset: targetPosition - position};
//             }
//             position += textContentLength;
//         } else if (current.childNodes && current.childNodes.length > 0) {
//             for (let i = current.childNodes.length - 1; i >= 0; i--) {
//                 stack.push(current.childNodes[i] as Node);
//             }
//         }
//     }
//
//     return {node: null, offset: 0};
// }
//
// export function isOutsideElement(element: HTMLElement, start: Node, end: Node): boolean {
//     const startParent = getRootElement(element, start as HTMLElement);
//     const endParent = getRootElement(element, end as HTMLElement);
//
//     return startParent.nodeName === "HTML" || endParent.nodeName === "HTML"
// }
//
// export function isShift(previousText: Node | undefined, range: Range, container: Node, offset: number) {
//     if (!previousText) {
//         return false;
//     }
//
//     const previousRangeStart: Range = range.cloneRange();
//     previousRangeStart.selectNodeContents(previousText);
//     previousRangeStart.setEnd(container, offset);
//     return range.startOffset === 0 && previousText?.textContent?.length === previousRangeStart.toString().length;
// }