import {Display, isSchemaContain} from "@/core/normalize/type/schema";

export function getFirstLevelElement(findTill: HTMLElement, child: HTMLElement) {
    while (child.parentElement && child.parentElement !== findTill) {
        child = child.parentElement;
    }

    return child;
}

export function getBlockElement(findTill: HTMLElement, child: HTMLElement) {
    while (child.parentElement !== findTill && !isSchemaContain(child, [Display.FirstLevel, Display.List])) {
        if (!child.parentElement) {
            return child;
        }
        child = child.parentElement;
    }

    return child;
}