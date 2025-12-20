import {Display, isSchemaContain} from "@/core/normalize/type/schema";
import {getRootElement} from "@/core/shared/element-util";

export function countListWrapperParents(element: Element) {
    let count = 0;
    let current = element.parentElement;

    while (current) {
        if (isSchemaContain(current, [Display.ListWrapper])) {
            count++;
        }
        current = current.parentElement;
    }

    return count;
}

export function isChildrenContain(children: HTMLCollection, containIn: HTMLElement[]) {
    for (const child of children) {
        if (containIn.includes(child as HTMLElement)) {
            return true;
        }
    }

    return false;
}

export function moveListWrapperToPreviousLi(rootElement: HTMLElement) {
    const listWrappers = rootElement.querySelectorAll("ul, ol");

    for (const listWrapper of listWrappers) {
        moveToPreviousLi(listWrapper);
    }

    for (const listWrapper of listWrappers) {
        moveToPreviousListWrapper(listWrapper);
        moveToPreviousLi(listWrapper);
    }
}

export function getLisWithFirstChildListWrapper(contentEditable: HTMLElement, element: HTMLElement) {
    const lis: HTMLElement[] = [];

    fillLisWithFirstChildListWrapper(element, lis);

    let nextElement = getRootElement(contentEditable, element).nextElementSibling;
    while (nextElement && isSchemaContain(nextElement, [Display.ListWrapper])) {
        fillLisWithFirstChildListWrapper(nextElement as HTMLElement, lis);
        nextElement = nextElement.nextElementSibling;
    }

    return lis;
}

export function moveListWrappersOutOfLi(contentEditable: HTMLElement, element: HTMLElement) {
    const lis = getLisWithFirstChildListWrapper(contentEditable, element);

    for (let i = lis.length; i >= 0; i--) {
        const li = lis[i];
        if (!li) {
            continue;
        }
        let previousLi: Element | undefined | null = lis[i - 1];
        if (!previousLi) {
            previousLi = li.previousElementSibling;
        }
        if (!previousLi) {
            previousLi = li.parentElement?.previousElementSibling;
        }
        if (!previousLi) {
            previousLi = li.parentElement?.parentElement?.previousElementSibling
        }

        const listWrappers = getDirectChildren(li, [Display.ListWrapper]);
        if (previousLi && countListWrapperParents(li) > countListWrapperParents(previousLi)) {
            const liToAppend = previousLi.querySelector(":scope li:nth-last-child(1)");
            listWrappers.forEach(listWrapper => liToAppend?.appendChild(listWrapper));
            continue;
        }

        if (previousLi) {
            listWrappers.forEach(listWrapper => previousLi?.appendChild(listWrapper));
            continue;
        }

        listWrappers.forEach(listWrapper => li.before(listWrapper));
    }
}

function getDirectChildren(li: Element, display: Display[]) {
    const listWrappers: Element[] = [];

    Array.from(li.children).forEach(element => {
        if (isSchemaContain(element, display)) {
            listWrappers.push(element);
        }
    });

    return listWrappers;
}

function moveToPreviousLi(listWrapper: Element) {
    const previousLi = listWrapper.previousElementSibling;
    if (previousLi && isSchemaContain(previousLi, [Display.List])) {
        previousLi.appendChild(listWrapper);
    }
}

function moveToPreviousListWrapper(listWrapper: Element) {
    const parent = listWrapper.parentElement;
    const previousListWrapper = parent?.previousElementSibling;
    if (previousListWrapper && isSchemaContain(previousListWrapper, [Display.ListWrapper])) {
        previousListWrapper.appendChild(listWrapper);
        if (!parent.textContent) {
            parent.remove();
        }
    }
}

function fillLisWithFirstChildListWrapper(element: HTMLElement, lis: HTMLElement[]) {
    const nestedLis = element.querySelectorAll("li");
    const lisWithFirstChild = Array.from(nestedLis).filter(isLiWithFirstChildListWrapper);
    lis.push(...lisWithFirstChild);
}

function isLiWithFirstChildListWrapper(element: HTMLElement) {
    const maybeListWrapper = element.firstChild;
    const maybeText = maybeListWrapper?.firstChild?.firstChild;

    return isSchemaContain(element, [Display.List]) &&
        isSchemaContain(maybeListWrapper, [Display.ListWrapper]) &&
        maybeText?.nodeType === Node.TEXT_NODE;
}