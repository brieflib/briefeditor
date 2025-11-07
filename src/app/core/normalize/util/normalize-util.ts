import {Leaf, LeafGroup} from "@/core/normalize/type/leaf";
import tagHierarchy, {TagHierarchy} from "@/core/normalize/type/tag-hierarchy";
import {Display, isSchemaContain} from "@/core/normalize/type/schema";

export function setLeafParents(leafElement: Node | null | undefined, findTill: HTMLElement, leaf: Leaf = new Leaf()) {
    if (!leafElement) {
        return;
    }

    const parents: HTMLElement[] = [];
    let parent = leafElement.parentElement;

    while (parent && parent !== findTill) {
        parents.unshift(parent);
        parent = parent.parentElement;
    }

    for (const add of parents) {
        leaf.addParent(add);
    }
    leaf.addParent(leafElement);
    return leaf;
}

export function sortLeafParents(toSort: Leaf | undefined) {
    if (!toSort) {
        return new Leaf();
    }

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
                               container: DocumentFragment = nodeToFragment(document.createElement("div")),
                               existingElements: HTMLElement[] = []) {
    const sameConsecutive = getSameConsecutiveFirstParent(leaves);

    for (const leafGroup of sameConsecutive) {
        let firstParentElement = shiftFirstParent(leafGroup.leaves);
        firstParentElement = clearElementHTML(firstParentElement, existingElements);

        if (!firstParentElement) {
            return container;
        }
        const fragment = collapseLeaves(leafGroup.leaves, nodeToFragment(firstParentElement), existingElements);
        insertAfterLastChild(container, fragment);
    }

    return container;
}

export function getSameConsecutiveFirstParent(leaves: Leaf[]): LeafGroup[] {
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

        if (!isElementsEqual(leaf?.getParents()[0], nextLeaf?.getParents()[0])) {
            sameConsecutive.push(leafGroup);
            leafGroup = {leaves: []};
        }
    }

    return sameConsecutive;
}

function isElementsEqual(element: Node | undefined, compareTo: Node | undefined) {
    if (!element && !compareTo) {
        return true;
    }

    if (isSchemaContain(element, [Display.SelfClose]) || isSchemaContain(compareTo, [Display.SelfClose])) {
        return false;
    }

    if (element === compareTo) {
        return true;
    }

    if (element?.nodeName === compareTo?.nodeName && !isSchemaContain(element, [Display.NotCollapse])) {
        return true;
    }

    return false;
}

export function getLeafNodes(element: Node, leafNodes: Node[] = []) {
    if (!element) {
        return leafNodes;
    }

    if (element.nodeType === Node.TEXT_NODE || isSchemaContain(element, [Display.SelfClose])) {
        leafNodes.push(element);
        return leafNodes;
    }

    for (const child of element.childNodes) {
        if (child.textContent || isSchemaContain(child, [Display.SelfClose, Display.FirstLevel, Display.List])) {
            getLeafNodes(child, leafNodes);
        }
    }

    return leafNodes;
}

export function filterLeafParents(leaf: Leaf | null | undefined, element: Node, excludeTags: string[]) {
    if (leaf) {
        for (const toFilter of getLeafNodes(element)) {
            if (leaf.getParents().includes(toFilter)) {
                if (leaf.getParents()) {
                    leaf.setParents(leaf.getParents()
                        .filter(parent => !excludeTags.includes(parent.nodeName)));
                }
            }
        }
    }

    return leaf;
}

export function removeConsecutiveDuplicates(leaf: Leaf): Leaf {
    const parents = leaf.getParents();

    if (parents.length === 0) {
        return leaf;
    }

    const result: Node[] = [];

    for (let i = 0; i < parents.length; i++) {
        const parent = parents[i];
        const nextParent = parents[i + 1];
        if (parent && isSchemaContain(parent, [Display.Nested])) {
            result.push(parent);
            continue;
        }
        if (parent && !nextParent) {
            result.push(parent);
            continue;
        }
        if (parent && nextParent && parent.nodeName !== nextParent.nodeName) {
            result.push(parent);
        }
    }

    leaf.setParents(result);

    return leaf;
}

function nodeToFragment(node: Node) {
    const fragment = new DocumentFragment();
    fragment.appendChild(node);
    return fragment;
}

function insertAfterLastChild(container: DocumentFragment, element: DocumentFragment) {
    if (container.lastChild) {
        container.lastChild.appendChild(element);
    }
}

function shiftFirstParent(leaves: Leaf[]) {
    let node;
    for (const leaf of leaves) {
        const parent = leaf.getParents().shift();
        if (parent && parent.nodeType === Node.TEXT_NODE) {
            const text = parent.textContent;
            if (!node) {
                node = parent;
            } else if (text) {
                (node as Text).appendData(text);
            }
        } else {
            node = parent;
        }
    }

    return node;
}

function clearElementHTML(node: Node | undefined, existingElements: HTMLElement[]) {
    if (!node) {
        return;
    }

    if (node.nodeType === Node.TEXT_NODE) {
        return node;
    }

    let element = node as HTMLElement;
    if (existingElements.includes(element)) {
        element = (element as Node).cloneNode(false) as HTMLElement;
    } else {
        (element as HTMLElement).innerHTML = "";
    }
    existingElements.push(element);

    return element;
}