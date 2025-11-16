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

export function getNextElement(findTill: HTMLElement, node: HTMLElement) {
    while (node !== findTill && !node.nextElementSibling) {
        node = node.parentElement as HTMLElement;
    }

    if (node !== findTill) {
        return node.nextElementSibling;
    }

    return null;
}