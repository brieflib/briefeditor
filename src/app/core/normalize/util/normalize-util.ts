import {Leaf, LeafGroup} from "@/core/normalize/type/leaf";
import tagHierarchy, {TagHierarchy} from "@/core/normalize/type/tag-hierarchy";
import {Display, isSchemaContain} from "@/core/normalize/type/schema";

export function getLeafNodes(element: Node, leafNodes: Node[] = []) {
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
                               container: DocumentFragment = nodeToFragment(document.createElement("div"))) {
    const parent = getSameFirstParent(leaves);

    for (const leafGroup of parent) {
        let firstParentElement = shiftFirstParent(leafGroup.leaves);
        firstParentElement = clearElementHTML(firstParentElement);

        if (!firstParentElement) {
            return container;
        }
        const fragment = collapseLeaves(leafGroup.leaves, nodeToFragment(firstParentElement));
        insertAfterLastChild(container, fragment);
    }

    return container;
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

export function filterDistantLeafParents(elements: HTMLElement[], excludeTags: string[], leaf: Leaf) {
    const leafParents = leaf.getParents();
    const lastHTMLElementIndex = leafParents.length - 2;
    if (elements.includes(leafParents[lastHTMLElementIndex] as HTMLElement)) {
        const filteredParents = [];

        for (const parent of leafParents) {
            if (excludeTags.length) {
                const firstExclude = excludeTags[0];
                if (firstExclude === parent.nodeName) {
                    excludeTags.shift();
                } else {
                    filteredParents.push(parent);
                }

                continue;
            }

            if (!excludeTags.includes(parent.nodeName)) {
                filteredParents.push(parent);
            }
        }

        leaf.setParents(filteredParents);
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

        if (i === 0) {
            result.push(parent);
        }
        if (!nextParent) {
            continue;
        }
        if (isSchemaContain(nextParent, [Display.Nested])) {
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

export function filterEmptyParents(leaf: Leaf) {
    leaf.setParents(leaf.getParents().filter(parent => !(isSchemaContain(parent, [Display.SelfClose]) && parent.textContent?.length)));
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