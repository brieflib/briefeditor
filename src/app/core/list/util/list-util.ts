import {Display, isSchemaContain} from "@/core/normalize/type/schema";

export function countParentsWithDisplay(element: HTMLElement, display: Display[]) {
    let count = 0;
    let current = element.parentElement;

    while (current) {
        if (isSchemaContain(current, display)) {
            count++;
        }
        current = current.parentElement;
    }

    return count;
}

export function isChildrenContain(containIn: HTMLElement[], children: HTMLCollection) {
    for (const child of children) {
        if (containIn.includes(child as HTMLElement)) {
            return true;
        }
    }

    return false;
}