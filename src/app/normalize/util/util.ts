import {Leaf} from "@/normalize/type/leaf";
import tagHierarchy, {TagHierarchy} from "@/normalize/type/tag-hierarchy";
import {Display, isSchemaContain} from "@/normalize/type/schema";
import {getLeafNodes} from "@/shared/node-util";

export function setLeafParents(leafElement: Node | null | undefined, findTill: HTMLElement, leaf: Leaf = new Leaf()) {
    if (!leafElement) {
        return;
    }

    const parent = leafElement.parentElement;
    if (isSchemaContain(leafElement as HTMLElement,[Display.SelfClose])) {
        leaf.addParent(leafElement);
    }
    if (parent && parent !== findTill) {
        leaf.addParent(parent);
        setLeafParents(parent, findTill, leaf);
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
        .map(item => item.element)
        .filter((value, index, self) => self.indexOf(value) === index);
    toSort.setParents(sortedParents);

    return toSort;
}

export function getLeavesWithTheSameFirstParent(leaves: Leaf[]): Leaf[] {
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

    const duplicateParents = getLeavesWithTheSameFirstParent(leaves);
    const otherNodes = leaves.filter((leaf, index) => !duplicateParents[index]);

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

    if (otherNodes.length !== 0) {
        collapseLeaves(otherNodes, container);
    }
    collapseLeaves(duplicateParents, element);

    return container;
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