import {Leaf, LeafGroup} from "@/core/normalize/type/leaf";
import tagHierarchy, {TagHierarchy} from "@/core/normalize/type/tag-hierarchy";
import {Display, isSchemaContain} from "@/core/normalize/type/schema";
import {
    CursorPosition,
    getCursorPosition,
    getCursorPositionFrom
} from "@/core/shared/type/cursor-position";
import {hasSelfCloseDescendant} from "@/core/shared/element-util";

export interface ContainerAndCursorPosition {
    container: DocumentFragment,
    cursorPosition: CursorPosition
}

export function getLeafNodes(element: Node, leafNodes: Node[] = []) {
    if (element.nodeType === Node.TEXT_NODE || isSchemaContain(element, [Display.SelfClose])) {
        leafNodes.push(element);
        return leafNodes;
    }

    for (const child of element.childNodes) {
        getLeafNodes(child, leafNodes);
    }

    return leafNodes;
}

export function setLeafParents(findTill: HTMLElement, leafNode: Node, leaf: Leaf = new Leaf()) {
    const parents: HTMLElement[] = [];
    let parent = leafNode.parentElement;

    while (parent && parent !== findTill) {
        parents.unshift(parent);
        parent = parent.parentElement;
    }

    for (const add of parents) {
        leaf.addParent(add);
    }
    leaf.addParent(leafNode);

    return leaf;
}

export function sortLeafParents(toSort: Leaf) {
    const sortedParents = toSort
        .getParents()
        .map(element => ({
            element: element,
            name: element.nodeName,
            priority: tagHierarchy.get(element.nodeName) ?? -1
        } as TagHierarchy))
        .sort((first, second) => second.priority - first.priority)
        .map(item => item.element);
    toSort.setParents(sortedParents);

    return toSort;
}

export function collapseLeaves(leaves: Leaf[],
                               cursorPosition: CursorPosition = getCursorPosition(),
                               container: DocumentFragment = nodeToFragment(document.createElement("div"))): ContainerAndCursorPosition {
    const parent = getSameFirstParent(leaves);

    for (const leafGroup of parent) {
        let firstParentElement = shiftFirstParent(leafGroup.leaves);
        firstParentElement = clearElementHTML(firstParentElement);

        if (!firstParentElement) {
            return {container: container, cursorPosition: cursorPosition};
        }
        const fragment = collapseLeaves(leafGroup.leaves, cursorPosition, nodeToFragment(firstParentElement));
        cursorPosition = insertAfterLastChild(container, fragment.container, fragment.cursorPosition);
    }

    return {container: container, cursorPosition: cursorPosition};
}

export function getSameFirstParent(leaves: Leaf[]): LeafGroup[] {
    const sameConsecutive: LeafGroup[] = [];
    let leafGroup: LeafGroup = {leaves: []};

    if (leaves.length === 1) {
        leafGroup.leaves = leaves;
        return [leafGroup];
    }

    for (let i = 0; i < leaves.length; i++) {
        const leaf = leaves[i];
        const nextLeaf = leaves[i + 1];

        if (leaf) {
            leafGroup.leaves.push(leaf);
        }

        if (!willElementsMerge(leaf?.getParents()[0], nextLeaf?.getParents()[0])) {
            sameConsecutive.push(leafGroup);
            leafGroup = {leaves: []};
        }
    }

    return sameConsecutive;
}

function willElementsMerge(element: Node | undefined, compareTo: Node | undefined) {
    if (!element && !compareTo) {
        return true;
    }

    if (element === compareTo) {
        return true;
    }

    if (element?.nodeName === compareTo?.nodeName && isSchemaContain(element, [Display.Collapse])) {
        return true;
    }

    return false;
}

export function filterLeafParents(element: Node, excludeTags: string[], leaf: Leaf) {
    const leafParents = leaf.getParents();

    if (leafParents.includes(element)) {
        leaf.setParents(leaf.getParents().filter(parent => !excludeTags.includes(parent.nodeName)));
    }

    return leaf;
}

export function replaceLeafParents(element: Node, replaceToElement: HTMLElement[], replaceFrom: string[], leaf: Leaf, isClosest = false) {
    if (leaf.getParents() && leaf.getParents().includes(element)) {
        const parents = leaf.getParents()
            .flatMap(parent => {
                if (isClosest && !Array.from(parent.childNodes).some(child => child === element)) {
                    return parent;
                }

                if (replaceFrom.includes(parent.nodeName)) {
                    return replaceToElement;
                }

                return parent;
            });
        leaf.setParents(parents);
    }

    return leaf;
}

export function removeConsecutiveDuplicates(leaf: Leaf, isDisabled = false): Leaf {
    if (isDisabled) {
        return leaf;
    }

    const parents = leaf.getParents();

    if (parents.length === 0) {
        return leaf;
    }

    const result: Node[] = [];

    for (let i = 0; i <= parents.length; i++) {
        const parent = parents[i];
        const nextParent = parents[i + 1];

        if (!parent) {
            continue;
        }

        if (i === 0 && !hasDuplicateList(parent)) {
            result.push(parent);
        }
        if (!nextParent) {
            continue;
        }

        if (hasDuplicateList(nextParent)) {
            continue;
        }
        if (isSchemaContain(nextParent, [Display.ListWrapper])) {
            result.push(nextParent);
            continue;
        }
        if (parent.nodeName !== nextParent.nodeName) {
            result.push(nextParent);
        }
    }

    leaf.setParents(result);

    return leaf;
}

function hasDuplicateList(node: Node | undefined) {
    if (!node) {
        return false;
    }

    if (isSchemaContain(node, [Display.List])) {
        if (isSchemaContain(node.firstChild, [Display.ListWrapper])) {
            return true;
        }
    }

    if (isSchemaContain(node, [Display.ListWrapper])) {
        const li = (node as Element).querySelectorAll("li")[0];
        if (li && isSchemaContain(li.firstChild, [Display.ListWrapper])) {
            return true;
        }
    }

    return false;
}

function nodeToFragment(node: Node) {
    const fragment = new DocumentFragment();
    fragment.appendChild(node);
    return fragment;
}

function insertAfterLastChild(container: DocumentFragment, insertElement: DocumentFragment, cursorPosition: CursorPosition) {
    const containerChild = container.lastChild;
    if (!containerChild) {
        return cursorPosition;
    }

    const containerText = containerChild.lastChild;
    const insertText = insertElement.firstChild;

    if (containerText && containerText.nodeType === Node.TEXT_NODE &&
        insertText && insertText.nodeType === Node.TEXT_NODE) {
        (containerText as Text).appendData((insertText as Text).data);
    } else if (insertElement.textContent || hasSelfCloseDescendant(insertElement)) {
        containerChild.appendChild(insertElement);
    }

    return calculateCursorPosition(containerChild, insertText, cursorPosition);
}

function calculateCursorPosition(containerChild: Node, textToInsert: ChildNode | null, cursorPosition: CursorPosition): CursorPosition {
    if (!textToInsert) {
        return cursorPosition;
    }

    const lastChild = containerChild.lastChild;
    const isMerged = !!lastChild && lastChild !== textToInsert &&
        lastChild.nodeType === Node.TEXT_NODE && textToInsert.nodeType === Node.TEXT_NODE;
    const isAppended = lastChild === textToInsert;
    const offsetBase = isMerged ? (lastChild as Text).length - (textToInsert as Text).length : 0;

    const remap = (container: Node, offset: number): [Node, number] => {
        if (container === textToInsert) {
            if (isMerged) {
                return [lastChild, offsetBase + offset];
            }
            if (isAppended) {
                return [container, offset];
            }
            return [containerChild, containerChild.childNodes.length];
        }
        if (container === containerChild) {
            if (isMerged) {
                return [lastChild, offsetBase];
            }
            if (isAppended && lastChild) {
                return [lastChild, 0];
            }
        }
        return [container, offset];
    };

    const [startContainer, startOffset] = remap(cursorPosition.startContainer, cursorPosition.startOffset);
    const [endContainer, endOffset] = remap(cursorPosition.endContainer, cursorPosition.endOffset);

    return getCursorPositionFrom(startContainer, startOffset, endContainer, endOffset, false);
}

function shiftFirstParent(leaves: Leaf[]) {
    let node;
    for (const leaf of leaves) {
        node = leaf.getParents().shift();
    }

    return node;
}

function clearElementHTML(node: Node | undefined) {
    if (!node) {
        return;
    }

    if (node.nodeType === Node.TEXT_NODE || isSchemaContain(node, [Display.SelfClose])) {
        return node;
    }

    return node.cloneNode(false) as HTMLElement;
}