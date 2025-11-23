import {Display, isSchemaContain} from "@/core/normalize/type/schema";

export function getRootElement(findTill: HTMLElement, child: HTMLElement) {
    while (child.parentElement && child.parentElement !== findTill) {
        child = child.parentElement;
    }

    return child;
}

export function getBlockElement(findTill: HTMLElement, child: HTMLElement) {
    while (child.parentElement && child.parentElement !== findTill && !isSchemaContain(child, [Display.FirstLevel, Display.List])) {
        child = child.parentElement;
    }

    return child;
}

export function getListWrapperElement(findTill: HTMLElement, child: HTMLElement) {
    while (child.parentElement && child.parentElement !== findTill && !isSchemaContain(child, [Display.ListWrapper])) {
        child = child.parentElement;
    }
    return child;
}

export function getNextNode(findTill: HTMLElement, node: Node) {
    while (node !== findTill && !node.nextSibling) {
        node = node.parentElement as HTMLElement;
    }

    node = node.nextSibling as Node;

    if (!node || !node.firstChild) {
        return;
    }

    return node;
}

export function getPreviousNode(findTill: HTMLElement, node: Node) {
    while (node !== findTill && !node.previousSibling) {
        node = node.parentElement as HTMLElement;
    }

    node = node.previousSibling as Node;

    if (node?.nodeType === Node.TEXT_NODE) {
        return node;
    }

    if (!node || !node.firstChild) {
        return;
    }

    return node;
}

export function getFirstText(node: Node) {
    while (node && node.nodeType !== Node.TEXT_NODE) {
        node = node.firstChild as Node;
    }

    return node;
}