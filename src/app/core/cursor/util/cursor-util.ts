import {getFirstText, getNextNode} from "@/core/shared/element-util";

export interface NodeOffset {
    node: Node,
    offset: number
}

export function computeNodeOffset(contentEditable: HTMLElement, node: Node, originalOffset: number): NodeOffset {
    let offset = 0;
    let sumOffset = 0;
    let resultNode: Node | null = node;
    while (sumOffset < originalOffset || sumOffset === 0) {
        const currentNode = getNextTextNode(contentEditable, resultNode);
        if (!currentNode) {
            return {node: resultNode, offset: offset};
        }
        resultNode = currentNode;
        const nodeLength = resultNode.textContent?.length ?? 0;
        offset = Math.min(originalOffset - sumOffset, nodeLength);
        sumOffset += nodeLength;
    }

    return {node: resultNode, offset: offset};
}

function getNextTextNode(contentEditable: HTMLElement, node: Node) {
    const nextNode = getNextNode(contentEditable, node);
    if (!nextNode) {
        return null;
    }
    return getFirstText(nextNode);
}