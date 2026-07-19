import {CursorPath, Mutation, NodeLayout} from "@/core/history/type/history-record";
import {CursorPosition, getCursorPositionFrom} from "@/core/shared/type/cursor-position";

export const OBSERVER_OPTIONS: MutationObserverInit = {
    childList: true,
    subtree: true,
    characterData: true,
    characterDataOldValue: true,
    attributes: true,
    attributeOldValue: true,
};

export function buildMutations(records: MutationRecord[]): Mutation[] {
    const mutations = records.map(toMutation);
    resolveNewValues(mutations);
    return mutations;
}

export function applyMutations(mutations: Mutation[]) {
    for (const mutation of mutations) {
        applyMutation(mutation, mutation.removedNodes, mutation.addedNodes, mutation.newValue);
    }

    // Recorded mutations only cover the observed tree, so replaying them leaves nodes that
    // were pulled out of added subtrees by a previous undo at their old recorded positions.
    // Re-placing every added subtree into its command-end layout moves them back.
    for (const mutation of mutations) {
        for (const layout of mutation.addedLayouts) {
            restoreLayout(layout);
        }
    }
}

export function revertMutations(mutations: Mutation[]) {
    for (const mutation of [...mutations].reverse()) {
        applyMutation(mutation, mutation.addedNodes, mutation.removedNodes, mutation.oldValue);
    }
}

function toMutation(record: MutationRecord): Mutation {
    return {
        type: record.type,
        target: record.target,
        nextSibling: record.nextSibling,
        attributeName: record.attributeName,
        oldValue: record.oldValue,
        newValue: null,
        addedNodes: Array.from(record.addedNodes),
        removedNodes: Array.from(record.removedNodes),
        addedLayouts: Array.from(record.addedNodes).map(captureLayout),
    };
}

function captureLayout(node: Node): NodeLayout {
    return {
        node: node,
        children: Array.from(node.childNodes).map(captureLayout),
    };
}

function restoreLayout(layout: NodeLayout) {
    for (const child of layout.children) {
        layout.node.appendChild(child.node);
        restoreLayout(child);
    }
}

function resolveNewValues(mutations: Mutation[]) {
    const latest = new Map<Node, Map<string, Mutation>>();
    for (const mutation of mutations) {
        if (mutation.type === "childList") {
            continue;
        }

        const key = mutation.type === "attributes" ? mutation.attributeName ?? "" : "characterData";
        let byKey = latest.get(mutation.target);
        if (!byKey) {
            byKey = new Map<string, Mutation>();
            latest.set(mutation.target, byKey);
        }
        const previous = byKey.get(key);
        if (previous) {
            previous.newValue = mutation.oldValue;
        }
        byKey.set(key, mutation);
    }

    for (const byKey of latest.values()) {
        for (const mutation of byKey.values()) {
            mutation.newValue = readValue(mutation);
        }
    }
}

function readValue(mutation: Mutation): string | null {
    if (mutation.type === "characterData") {
        return (mutation.target as CharacterData).data;
    }
    return (mutation.target as Element).getAttribute(mutation.attributeName ?? "");
}

function applyMutation(mutation: Mutation, toRemove: Node[], toInsert: Node[], value: string | null) {
    switch (mutation.type) {
        case "childList":
            replaceNodes(mutation.target, mutation.nextSibling, toRemove, toInsert);
            break;
        case "characterData":
            (mutation.target as CharacterData).data = value ?? "";
            break;
        case "attributes":
            setAttribute(mutation.target as Element, mutation.attributeName ?? "", value);
            break;
    }
}

function replaceNodes(target: Node, nextSibling: Node | null, toRemove: Node[], toInsert: Node[]) {
    for (const node of toRemove) {
        if (node.parentNode === target) {
            target.removeChild(node);
        }
    }

    const anchor = nextSibling && nextSibling.parentNode === target ? nextSibling : null;
    for (const node of toInsert) {
        target.insertBefore(node, anchor);
    }
}

function setAttribute(target: Element, name: string, value: string | null) {
    if (value === null) {
        target.removeAttribute(name);
    } else {
        target.setAttribute(name, value);
    }
}

export function captureCursorPath(root: Node, cursorPosition: CursorPosition): CursorPath | null {
    const startPath = capturePath(root, cursorPosition.startContainer);
    const endPath = capturePath(root, cursorPosition.endContainer);
    if (!startPath || !endPath) {
        return null;
    }

    return {
        startPath: startPath,
        startOffset: cursorPosition.startOffset,
        endPath: endPath,
        endOffset: cursorPosition.endOffset,
    };
}

export function resolveCursorPath(root: Node, cursorPath: CursorPath): CursorPosition | null {
    const startContainer = resolveNode(root, cursorPath.startPath);
    const endContainer = resolveNode(root, cursorPath.endPath);
    if (!startContainer || !endContainer) {
        return null;
    }

    return getCursorPositionFrom(
        startContainer, clampOffset(startContainer, cursorPath.startOffset),
        endContainer, clampOffset(endContainer, cursorPath.endOffset)
    );
}

function capturePath(root: Node, node: Node): number[] | null {
    const path: number[] = [];
    let current: Node | null = node;
    while (current && current !== root) {
        const parent: Node | null = current.parentNode;
        if (!parent) {
            return null;
        }
        path.unshift(Array.prototype.indexOf.call(parent.childNodes, current));
        current = parent;
    }

    return current === root ? path : null;
}

function resolveNode(root: Node, path: number[]): Node | null {
    let current: Node = root;
    for (const index of path) {
        const child: Node | undefined = current.childNodes[index];
        if (!child) {
            return null;
        }
        current = child;
    }

    return current;
}

function clampOffset(node: Node, offset: number): number {
    const max = node.nodeType === Node.TEXT_NODE ? (node.nodeValue?.length ?? 0) : node.childNodes.length;
    return Math.min(offset, max);
}
