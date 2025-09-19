import {Leaf} from "@/normalize/type/leaf";
import tagHierarchy, {TagHierarchy} from "@/normalize/type/tag-hierarchy";
import getSchema, {Display} from "@/normalize/type/schema";

export function findLeaves(element: Node, leafElements: Node[] = []) {
    if (!element) {
        return leafElements;
    }

    if (element.nodeType === Node.TEXT_NODE) {
        leafElements.push(element);
        return leafElements;
    }

    if (element.childNodes.length === 0) {
        leafElements.push(element);
        return leafElements;
    }

    for (const child of element.childNodes) {
        findLeaves(child, leafElements);
    }

    return leafElements;
}

export function findLeafParents(leafElement: Node | null | undefined, findTill: HTMLElement, leaf: Leaf = new Leaf(leafElement?.textContent)) {
    if (!leafElement) {
        return;
    }

    const parent = leafElement.parentElement;
    if (getSchema(leafElement.nodeName).includes(Display.SelfClose)) {
        leaf.parents.push(leafElement.nodeName);
    }
    if (parent && parent !== findTill) {
        leaf.parents.push(parent.nodeName);
        findLeafParents(parent, findTill, leaf);
    }
    return leaf;
}

export function sortTags(toSort: string[] | undefined) {
    if (!toSort) {
        return [];
    }

    return toSort
        .map(tag => ({
            name: tag,
            priority: tagHierarchy.get(tag) ?? -1
        } as TagHierarchy))
        .sort((first, second) => second.priority - first.priority)
        .map(item => item.name)
        .filter((value, index, self) => self.indexOf(value) === index);
}

export function getLeavesWithTheSameFirstParent(leaves: Leaf[]): Leaf[] {
    const leavesWithTheSameFirstParent: Leaf[] = [];
    const parent: string | undefined = leaves[0]?.parents[0];

    for (const leaf of leaves) {
        if (parent === leaf?.parents[0]) {
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

    const duplicateParents = getLeavesWithTheSameFirstParent(leaves);
    const parentNode = duplicateParents[0]?.parents[0];
    const otherNodes = leaves.filter((leaf, index) => !duplicateParents[index]);

    for (const duplicate of duplicateParents) {
        duplicate.parents.shift();
    }

    let element;
    // Node
    if (parentNode && !getSchema(parentNode).includes(Display.SelfClose)) {
        element = document.createElement(parentNode);
        container.appendChild(element);
    }
    // Self close node
    if (parentNode && getSchema(parentNode).includes(Display.SelfClose)) {
        duplicateParents.forEach(() => {
            element = document.createElement(parentNode);
            container.appendChild(element);
        });
    }
    // Text
    if (!parentNode) {
        for (const leaf of duplicateParents) {
            element = document.createTextNode(leaf.text ?? "");
            container.appendChild(element);
        }
    }

    if (otherNodes.length !== 0) {
        collapseLeaves(otherNodes, container);
    }
    collapseLeaves(duplicateParents, element);

    return container;
}