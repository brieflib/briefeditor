import {getLeafNodes} from "@/shared/node-util";

export function getSharedTags(findFrom: Node[], findTill: HTMLElement) {
    const leafNodes = findFrom.flatMap(node => getLeafNodes(node));

    const shared: string[][] = [];
    for (const leaf of leafNodes) {
        const parents = getParentTags(leaf, findTill);
        shared.push(parents);
    }

    return shared[0]?.filter(element =>
        shared.every(arr => arr.includes(element))
    );
}

export function getParentTags(leaf: Node, findTill: HTMLElement, parents: string[] = []) {
    const parent = leaf.parentElement;

    if (parent && parent !== findTill) {
        parents.push(parent.nodeName)
        getParentTags(parent, findTill, parents);
    }

    return parents;
}

