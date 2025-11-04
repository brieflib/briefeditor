import {getRange} from "@/core/shared/range-util";

export function getSelectedLeaves() {
    const textNodes: Node[] = [];

    const range = getRange();

    if (range.startContainer === range.endContainer) {
        return [range.startContainer];
    }

    const walker = document.createTreeWalker(
        range.commonAncestorContainer,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: function (node) {
                return range.intersectsNode(node) ?
                    NodeFilter.FILTER_ACCEPT :
                    NodeFilter.FILTER_REJECT;
            }
        }
    );

    while (walker.nextNode()) {
        textNodes.push(walker.currentNode);
    }

    if (textNodes.length > 1 && range.endOffset === 0) {
        textNodes.pop();
    }

    if (textNodes.length > 1 && range.startContainer.textContent?.length === range.startOffset) {
        textNodes.shift();
    }

    return textNodes;
}

export function getParentTags(node: Node, findTill: HTMLElement, parents: string[] = []) {
    let parent = node.parentElement;

    while (parent && parent !== findTill) {
        parents.push(parent.nodeName)
        parent = parent.parentElement;
    }

    return parents;
}