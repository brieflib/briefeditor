import {getRange} from "@/core/shared/range-util";
import {Display, isSchemaContainNodeName} from "@/core/normalize/type/schema";
import {getElement, getRootElement} from "@/core/shared/element-util";

export enum SelectionType {
    Root = "Root",
    Block = "Block",
    ParentElement = "ParentElement",
    ListWrapper = "ListWrapper",
    Link = "Link"
}

export function getSelectedLeaves(range = getRange()) {
    const textNodes: Node[] = [];

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

export function getParentTags(findTill: HTMLElement, node: Node) {
    const parents = [];
    let parent = node.parentElement;

    while (parent && parent !== findTill) {
        parents.push(parent.nodeName)
        parent = parent.parentElement;
    }

    return parents;
}

export function filterListWrapperTag(parents: string[]) {
    const filtered = [];

    let isFirstWrapper = false;
    for (const parent of parents) {
        if (isSchemaContainNodeName(parent, [Display.ListWrapper])) {
            if (!isFirstWrapper) {
                filtered.push(parent);
                isFirstWrapper = true;
            }

            continue;
        }

        filtered.push(parent);
    }

    return filtered;
}

export function getSelected(findTill: HTMLElement | null, range: Range, type: SelectionType) {
    const selected: HTMLElement[] = [];
    const leafNodes = getSelectedLeaves(range);

    for (const leafNode of leafNodes) {
        let block;
        switch (type) {
            case SelectionType.ParentElement:
                block = leafNode.parentElement as HTMLElement;
                break;
            case SelectionType.Root:
                if (!findTill) {
                    return [];
                }
                block = getRootElement(findTill, leafNode as HTMLElement);
                break;
            case SelectionType.Block:
                if (!findTill) {
                    return [];
                }
                block = getElement(findTill, leafNode as HTMLElement, [Display.FirstLevel, Display.List]);
                break;
            case SelectionType.ListWrapper:
                if (!findTill) {
                    return [];
                }
                block = getElement(findTill, leafNode as HTMLElement, [Display.FirstLevel, Display.ListWrapper]);
                break;
            case SelectionType.Link:
                if (!findTill) {
                    return [];
                }
                block = getElement(findTill, leafNode as HTMLElement, [Display.Link]);
                break;
        }
        if (block !== null && !selected.includes(block)) {
            selected.push(block);
        }
    }

    return selected;
}