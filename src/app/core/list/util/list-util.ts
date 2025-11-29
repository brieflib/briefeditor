import {Display, isSchemaContain} from "@/core/normalize/type/schema";
import {restoreRange} from "@/core/cursor/cursor";
import {CursorPosition} from "@/core/cursor/type/cursor-position";
import {getSelectedListWrapper} from "@/core/selection/selection";

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

export function moveListWrapperToPreviousLi(rootElement: HTMLElement) {
    const listWrappers = rootElement.querySelectorAll("ul, ol");

    for (const listWrapper of listWrappers) {
        let previousLi = listWrapper.previousElementSibling;
        if (previousLi && isSchemaContain(previousLi, [Display.List])) {
            previousLi.appendChild(listWrapper);
            continue;
        }

        const previousListWrapper = listWrapper.parentElement?.previousElementSibling;
        if (previousListWrapper && isSchemaContain(previousListWrapper, [Display.ListWrapper])) {
            previousListWrapper.appendChild(listWrapper);
        }
        previousLi = listWrapper.previousElementSibling;
        if (previousLi && isSchemaContain(previousLi, [Display.List])) {
            previousLi.appendChild(listWrapper);
        }
    }
}

function isGrandParentNodeNameEqual(listWrapper: HTMLElement | null) {
    const grandParent = listWrapper?.parentElement?.parentElement;
    if (!grandParent) {
        return true;
    }

    return grandParent.nodeName === listWrapper?.nodeName;
}