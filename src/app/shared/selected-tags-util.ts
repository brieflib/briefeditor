import {getRange} from "@/shared/range-util";

export function getSharedTags(findTill: HTMLElement) {
    const leafNodes = getSelectedLeaves();

    const shared: string[][] = [];
    for (const leaf of leafNodes) {
        const parents = getParentTags(leaf, findTill);
        shared.push(parents);
    }

    return shared[0]?.filter(element => shared.every(arr => arr.includes(element)));
}

export function getSelectedLeaves() {
    const nodes: Node[] = [];

    const range = getRange();

    const sameElement = getSameElementSelected(range);
    if (sameElement) {
        return [sameElement];
    }

    const walker = document.createTreeWalker(
        range.commonAncestorContainer,
        NodeFilter.SHOW_ALL,
        {
            acceptNode: function (node) {
                return range.intersectsNode(node) ?
                    NodeFilter.FILTER_ACCEPT :
                    NodeFilter.FILTER_REJECT;
            }
        }
    );

    while (walker.nextNode()) {
        nodes.push(walker.currentNode);
    }

    return nodes.filter(node => node.nodeType === Node.TEXT_NODE);
}

function getParentTags(leaf: Node, findTill: HTMLElement, parents: string[] = []) {
    const parent = leaf.parentElement;

    if (parent && parent !== findTill) {
        parents.push(parent.nodeName)
        getParentTags(parent, findTill, parents);
    }

    return parents;
}

function getSameElementSelected(range: Range) {
    if (range.startContainer === range.endContainer) {
        return range.startContainer;
    }

    if (range.startContainer.textContent?.length === range.startOffset && range.endContainer.textContent?.length === range.endOffset) {
        return range.endContainer;
    }

    if (range.startOffset === 0 && range.endOffset === 0) {
        return range.startContainer;
    }

    return null;
}

