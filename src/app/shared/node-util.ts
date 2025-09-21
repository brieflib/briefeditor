export function getLeafNodes(element: Node, leafNodes: Node[] = []) {
    if (!element) {
        return leafNodes;
    }

    if (element.nodeType === Node.TEXT_NODE) {
        leafNodes.push(element);
        return leafNodes;
    }

    if (element.childNodes.length === 0) {
        leafNodes.push(element);
        return leafNodes;
    }

    for (const child of element.childNodes) {
        getLeafNodes(child, leafNodes);
    }

    return leafNodes;
}