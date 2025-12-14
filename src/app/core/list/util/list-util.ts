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

export function isChildrenContain(containIn: HTMLElement[], children: HTMLCollection) {
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

export function getLisWithFirstChildListWrapper(element: HTMLElement, contentEditable: HTMLElement) {
    const lis: HTMLElement[] = [];

    fillLisWithFirstChildListWrapper(lis, element);

    let nextElement = getRootElement(contentEditable, element).nextElementSibling;
    while (nextElement && isSchemaContain(nextElement, [Display.ListWrapper])) {
        fillLisWithFirstChildListWrapper(lis, nextElement as HTMLElement);
        nextElement = nextElement.nextElementSibling;
    }

    return lis;
}

export function moveListWrappersOutOfLi(element: HTMLElement, contentEditable: HTMLElement) {
    const lis = getLisWithFirstChildListWrapper(element, contentEditable);

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
            const previousWrapper = getRootElement(contentEditable, li).previousElementSibling;
            if (previousWrapper) {
                const previousLis = getChildren(previousWrapper, [Display.List]);
                previousLi = previousLis.pop();
            }
        }

        const listWrappers = getChildren(li, [Display.ListWrapper]);
        if (previousLi && countListWrapperParents(li) > countListWrapperParents(previousLi)) {
            const liToAppend = previousLi.querySelector(":scope li:nth-last-child(1)");
            listWrappers.forEach(listWrapper => liToAppend?.appendChild(listWrapper));
            continue;
        }

        if (previousLi) {
            listWrappers.forEach(listWrapper => previousLi.appendChild(listWrapper));
            continue;
        }

        listWrappers.forEach(listWrapper => li.before(listWrapper));
        console.log();
    }
}

function getChildren(li: Element, display: Display[]) {
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

function fillLisWithFirstChildListWrapper(lis: HTMLElement[], element: HTMLElement) {
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