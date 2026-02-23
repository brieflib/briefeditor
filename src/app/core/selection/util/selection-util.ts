import {Display, isSchemaContainNodeName} from "@/core/normalize/type/schema";
import {getElement, getNextNode, getRootElement} from "@/core/shared/element-util";
import {
    commonAncestorContainer,
    CursorPosition,
    getCursorPosition,
} from "@/core/shared/type/cursor-position";

export enum SelectionType {
    Root = "Root",
    Block = "Block",
    ParentElement = "ParentElement",
    ListWrapper = "ListWrapper",
    Link = "Link"
}

export function getSelectedLeaves(findTill: HTMLElement, cursorPosition: CursorPosition = getCursorPosition()) {
    if (cursorPosition.startContainer === cursorPosition.endContainer) {
        return [cursorPosition.startContainer];
    }

    const textNodes: Node[] = [];
    let current: Node | null = cursorPosition.startContainer;

    while (current) {
        if (current.nodeType === Node.TEXT_NODE) {
            textNodes.push(current);
        }
        if (current === cursorPosition.endContainer) {
            break;
        }
        current = nextInOrder(findTill, current);
    }

    return textNodes;
}

function nextInOrder(findTill: HTMLElement, node: Node): Node | null {
    if (node.firstChild) {
        return node.firstChild;
    }
    return getNextNode(findTill, node);
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

export function getSelected(findTill: HTMLElement, cursorPosition: CursorPosition, type: SelectionType) {
    const selected: HTMLElement[] = [];
    const leafNodes = getSelectedLeaves(findTill, cursorPosition);

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