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

export function moveConsecutive(startLi: HTMLElement) {
    const listWrapper = startLi.parentElement;
    if (!listWrapper) {
        return;
    }
    const parentLi = listWrapper.parentElement;
    if (!parentLi) {
        return;
    }

    const newListWrapper = document.createElement(listWrapper.nodeName);
    let nextElementSibling = startLi.nextElementSibling;
    while (nextElementSibling) {
        newListWrapper.appendChild(nextElementSibling);
        nextElementSibling = startLi.nextElementSibling;
    }
    if (isGrandParentNodeNameEqual(listWrapper)) {
        parentLi.after(startLi);
        if (newListWrapper.textContent) {
            startLi.appendChild(newListWrapper);
        }
    } else {
        if (newListWrapper.textContent) {
            listWrapper.parentElement?.parentElement?.after(newListWrapper);
            newListWrapper.prepend(startLi);
        }
    }

    if (!parentLi.textContent) {
        parentLi.remove();
    }
    if (!listWrapper.textContent) {
        listWrapper.remove();
    }
}

function isGrandParentNodeNameEqual(listWrapper: HTMLElement | null) {
    const grandParent = listWrapper?.parentElement?.parentElement;
    if (!grandParent) {
        return true;
    }

    return grandParent.nodeName === listWrapper?.nodeName;
}