import {Leaf} from "@/core/normalize/type/leaf";
import tagHierarchy, {TagHierarchy} from "@/core/normalize/type/tag-hierarchy";
import {Display, isSchemaContain} from "@/core/normalize/type/schema";

export function setLeafParents(leafElement: Node | null | undefined, findTill: HTMLElement, leaf: Leaf = new Leaf()) {
    if (!leafElement) {
        return;
    }

    const parents: HTMLElement[] = [];
    const parent = leafElement.parentElement;
    if (leafElement && isSchemaContain(leafElement, [Display.SelfClose])) {
        parents.unshift(leafElement as HTMLElement);
    }
    if (parent && parent !== findTill) {
        parents.unshift(parent);
        setLeafParents(parent, findTill, leaf);
    }

    for (const add of parents) {
        leaf.addParent(add);
    }
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

export function getLeavesWithTheSameClosestParent(leaves: Leaf[]): Leaf[] {
    const leavesWithTheSameFirstParent: Leaf[] = [];
    const parent: string | undefined = leaves[0]?.getParents()[0]?.nodeName;

    for (const leaf of leaves) {
        if (parent === leaf?.getParents()[0]?.nodeName) {
            leavesWithTheSameFirstParent.push(leaf);
        } else {
            break;
        }
    }

    return leavesWithTheSameFirstParent;
}

export function collapseLeaves(leaves: Leaf[] | null | undefined, container: Node = document.createElement("DIV")) {
    if (!leaves || leaves.length === 0 || container.nodeType === Node.TEXT_NODE) {
        return container;
    }

    const duplicateParents = getLeavesWithTheSameClosestParent(leaves);
    const remainingNodes = leaves.filter((leaf, index) => !duplicateParents[index]);

    let element;

    for (const duplicate of duplicateParents) {
        element = duplicate.getParents().shift();
        // Node to duplicate
        if (element && isSchemaContain(element, [Display.SelfClose, Display.NotCollapse])) {
            container.appendChild(element);
            element.appendChild(document.createTextNode(duplicate.getText() ?? ""));
            duplicate.setElement(null);
        }
    }
    // Node
    if (element && !isSchemaContain(element, [Display.SelfClose, Display.NotCollapse])) {
        container.appendChild(element);
    }
    // Text
    if (!element) {
        for (const leaf of duplicateParents) {
            element = document.createTextNode(leaf.getText() ?? "");
            container.appendChild(element);
        }
    }

    if (remainingNodes.length !== 0) {
        collapseLeaves(remainingNodes, container);
    }
    collapseLeaves(duplicateParents, element);

    return container;
}

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

export function filterLeafParents(leaf: Leaf | null | undefined, element: Node, excludeTags: string[]) {
    if (leaf) {
        for (const toFilter of getLeafNodes(element)) {
            if (leaf.getElement() === toFilter) {
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

    const result: HTMLElement[] = [];

    for (let i = 0; i < parents.length; i++) {
        const parent = parents[i];
        const nextParent = parents[i + 1];
        if (parent && !nextParent) {
            result.push(parent);
        }
        if (parent && nextParent && parent.nodeName !== nextParent.nodeName) {
            result.push(parent);
        }
    }

    leaf.setParents(result);

    return leaf;
}