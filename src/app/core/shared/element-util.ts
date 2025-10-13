import {Display, isSchemaContain} from "@/core/normalize/type/schema";

export function getFirstLevelElement(findTill: HTMLElement, child: HTMLElement) {
    let element: HTMLElement = child;

    while (child !== findTill) {
        element = child;
        if (!child.parentElement) {
            return element;
        }
        child = child.parentElement;
    }

    return element;
}

export function getBlockElement(findTill: HTMLElement, child: HTMLElement) {
    while (child !== findTill && !isSchemaContain(child, [Display.FirstLevel, Display.List])) {
        if (!child.parentElement) {
            return child;
        }
        child = child.parentElement;
    }

    return child;
}