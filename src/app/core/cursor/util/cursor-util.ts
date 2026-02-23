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