import {Leaf, LeafGroup} from "@/core/normalize/type/leaf";
import tagHierarchy, {TagHierarchy} from "@/core/normalize/type/tag-hierarchy";
import {Display, isSchemaContain} from "@/core/normalize/type/schema";
import {CursorPosition, getCursorPosition, getCursorPositionFrom} from "@/core/shared/type/cursor-position";
import {getLastText} from "@/core/shared/element-util";

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

export function appendLeafParents(element: HTMLElement, elementsToAppend: HTMLElement[], leaf: Leaf) {
    const parents = leaf.getParents();
    if (!parents.includes(element)) {
        return leaf;
    }

    const lastParent = parents[parents.length - 1];
    if (!lastParent) {
        return leaf;
    }
    const childListWrappers = element.querySelectorAll("ul, ol");
    for (const childListWrapper of childListWrappers) {
        if (childListWrapper.contains(lastParent)) {
            const liIndex = leaf.getParents().indexOf(childListWrapper) - 1;
            leaf.getParents().splice(liIndex, 1);
            return leaf;
        }
    }

    const insertBeforeIndex = leaf.getParents().indexOf(element);
    leaf.getParents().splice(insertBeforeIndex, 0, ...elementsToAppend);
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
                               currentContainer: DocumentFragment = nodeToFragment(document.createElement("div")),
                               previousContainer?: DocumentFragment): ContainerAndCursorPosition {
    const parent = getSameFirstParent(leaves);

    for (const leafGroup of parent) {
        let firstParentElement = shiftFirstParent(leafGroup.leaves);
        firstParentElement = clearElementHTML(firstParentElement);

        if (!firstParentElement) {
            return {container: currentContainer, cursorPosition: cursorPosition};
        }
        const fragment = collapseLeaves(leafGroup.leaves, cursorPosition, nodeToFragment(firstParentElement), currentContainer);
        cursorPosition = insertAfterLastChild(currentContainer, fragment.container, fragment.cursorPosition, previousContainer);
    }

    return {container: currentContainer, cursorPosition: cursorPosition};
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

export function isLeafEmpty(leaf: Leaf) {
    for (const node of leaf.getParents()) {
        if (isSchemaContain(node, [Display.SelfClose])) {
            return true;
        }
    }

    for (const node of leaf.getParents()) {
        if (!isSchemaContain(node, [Display.SelfClose]) && !node.textContent) {
            return false;
        }
    }

    return true;
}

function nodeToFragment(node: Node) {
    const fragment = new DocumentFragment();
    fragment.appendChild(node);
    return fragment;
}

function insertAfterLastChild(container: DocumentFragment, insertElement: DocumentFragment, cursorPosition: CursorPosition, previousContainer?: DocumentFragment) {
    const containerChild = container.lastChild;
    if (!containerChild) {
        return cursorPosition;
    }

    let containerText = containerChild.lastChild;
    const insertText = insertElement.firstChild;
    if (containerText && containerText.nodeType === Node.TEXT_NODE &&
        insertText && insertText.nodeType === Node.TEXT_NODE) {
        (containerText as Text).appendData((insertText as Text).data);
    } else if (insertElement.textContent) {
        containerChild.appendChild(insertElement);
    }

    containerText = containerChild.lastChild;
    cursorPosition = calculateCursorPosition(containerText, insertText, cursorPosition, previousContainer);

    return cursorPosition;
}

function calculateCursorPosition(containerText: ChildNode | null, textToInsert: ChildNode | null, cursorPosition: CursorPosition, previousContainer?: DocumentFragment): CursorPosition {
    let container = containerText;
    if (!container && previousContainer) {
        container = getLastText(previousContainer.firstChild as Node);
    }
    if (!container || !textToInsert) {
        return cursorPosition;
    }
    if (container.nodeType !== Node.TEXT_NODE || textToInsert.nodeType !== Node.TEXT_NODE) {
        return cursorPosition;
    }

    const insertLength = (textToInsert as Text).length;
    const mergedOffsetBase = (container as Text).length - insertLength;
    let result = cursorPosition;

    if (textToInsert === cursorPosition.startContainer) {
        const localOffset = cursorPosition.startOffset > insertLength ? 0 : cursorPosition.startOffset;
        result = getCursorPositionFrom(container, mergedOffsetBase + localOffset, result.endContainer, result.endOffset, false);
    }
    if (textToInsert === cursorPosition.endContainer) {
        const localOffset = cursorPosition.endOffset > insertLength ? 0 : cursorPosition.endOffset;
        result = getCursorPositionFrom(result.startContainer, result.startOffset, container, mergedOffsetBase + localOffset, false);
    }

    return result;
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

    if (node.nodeType === Node.TEXT_NODE) {
        return node;
    }

    return node.cloneNode(false) as HTMLElement;
}