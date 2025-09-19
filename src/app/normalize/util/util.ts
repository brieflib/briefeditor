import {Leaf} from "@/normalize/type/leaf";
import tagHierarchy, {TagHierarchy} from "@/normalize/type/tag-hierarchy";
import {Display, isSchemaContain} from "@/normalize/type/schema";

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
    if (isSchemaContain(leafElement as HTMLElement,[Display.SelfClose])) {
        leaf.addParent(leafElement);
    }
    if (parent && parent !== findTill) {
        leaf.addParent(parent);
        findLeafParents(parent, findTill, leaf);
    }
    return leaf;
}

export function sortTags(toSort: HTMLElement[] | undefined) {
    if (!toSort) {
        return [];
    }

    return toSort
        .map(element => ({
            element: element,
            name: element.nodeName,
            priority: tagHierarchy.get(element.nodeName) ?? -1
        } as TagHierarchy))
        .sort((first, second) => second.priority - first.priority)
        .map(item => item.element)
        .filter((value, index, self) => self.indexOf(value) === index);
}

export function getLeavesWithTheSameFirstParent(leaves: Leaf[]): Leaf[] {
    const leavesWithTheSameFirstParent: Leaf[] = [];
    const parent: string | undefined = leaves[0]?.parents[0]?.nodeName;

    for (const leaf of leaves) {
        if (parent === leaf?.parents[0]?.nodeName) {
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
    const otherNodes = leaves.filter((leaf, index) => !duplicateParents[index]);

    let element;

    for (const duplicate of duplicateParents) {
        element = duplicate.parents.shift();
        // Node to duplicate
        if (element && isSchemaContain(element, [Display.SelfClose, Display.NotCollapse])) {
            container.appendChild(element);
            element.appendChild(document.createTextNode(duplicate.text ?? ""));
            duplicate.text = null;
        }
    }
    // Node
    if (element && !isSchemaContain(element, [Display.SelfClose, Display.NotCollapse])) {
        container.appendChild(element);
    }
    // Text
    if (!element) {
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