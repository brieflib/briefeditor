// import {getFirstText, getNextNode} from "@/core/shared/element-util";
//
// export interface NodeOffset {
//     node: Node,
//     offset: number
// }
//
// export function computeNodeOffset(contentEditable: HTMLElement, node: Node, originalOffset: number): NodeOffset {
//     let resultNode: Node = node;
//     if (resultNode.textContent && resultNode.textContent.length > originalOffset) {
//         return {node: resultNode, offset: originalOffset};
//     }
//     if (resultNode.textContent && resultNode.textContent.length === originalOffset) {
//         return {node: resultNode, offset: originalOffset};
//         //const currentNode = getNextTextNode(contentEditable, resultNode);
//         // if (currentNode && currentNode.textContent) {
//         //     return {node: currentNode, offset: 0};
//         // }
//     }
//
//     let offset = 0;
//     let sumOffset = node.textContent?.length ?? 0;
//     while (sumOffset < originalOffset || sumOffset === 0) {
//         const currentNode = getNextTextNode(contentEditable, resultNode);
//         if (!currentNode) {
//             return {node: resultNode, offset: offset};
//         }
//         const nodeLength = currentNode.textContent?.length ?? 0;
//         offset = Math.min(originalOffset - sumOffset, nodeLength);
//         sumOffset += nodeLength;
//         resultNode = currentNode;
//     }
//
//     return {node: resultNode, offset: offset};
// }
//
// function getNextTextNode(contentEditable: HTMLElement, node: Node) {
//     const nextNode = getNextNode(contentEditable, node);
//     if (!nextNode) {
//         return null;
//     }
//     return getFirstText(nextNode);
// }