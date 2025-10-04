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

export function getParentTags(leaf: Node, findTill: HTMLElement, parents: string[] = []) {
    const parent = leaf.parentElement;

    if (parent && parent !== findTill) {
        parents.push(parent.nodeName)
        getParentTags(parent, findTill, parents);
    }

    return parents;
}

export function GetElementsBetween(start: HTMLElement, end: HTMLElement): HTMLElement[] {
    const between: HTMLElement[] = [];
    if (start === end) {
        between.push(start);
        return between;
    }

    while (start !== end) {
        between.push(start);
        if (!start.nextSibling) {
            return between;
        }
        start = start.nextSibling as HTMLElement;
    }
    between.push(end);

    return between;
}