import {Display, isSchemaContain} from "@/core/normalize/type/schema";
import {getRange} from "@/core/shared/range-util";

export function getRootElement(findTill: HTMLElement, child: HTMLElement) {
    while (child.parentElement && child.parentElement !== findTill) {
        child = child.parentElement;
    }

    return child;
}

export function getElement(findTill: HTMLElement, child: HTMLElement, display: Display[]) {
    while (child.parentElement && child.parentElement !== findTill && !isSchemaContain(child, display)) {
        child = child.parentElement;
    }

    if (child.parentElement === findTill && !isSchemaContain(child, display)) {
        return null;
    }

    return child;
}

export function getElementByTagName(findTill: HTMLElement, tagName: string, range = getRange()) {
    let child = range.commonAncestorContainer;
    while (child.parentElement && child.parentElement !== findTill && child.nodeName !== tagName) {
        child = child.parentElement;
    }

    if (child.parentElement === findTill && child.nodeName !== tagName) {
        return null;
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

export function cleanElementWhitespace(element: HTMLElement) {
    Array.from(element.childNodes).forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
            const textContent = node.textContent;
            if (textContent) {
                node.textContent = textContent.replace(/ +/g, " ");
            }
        }

        if (isSchemaContain(element, [Display.List]) &&
            node.nodeType === Node.TEXT_NODE &&
            isSchemaContain(node.nextSibling, [Display.ListWrapper])) {
            const textContent = node.textContent
            if (textContent) {
                node.textContent = textContent.trimEnd();
            }
        }

        if (isSchemaContain(element, [Display.FirstLevel, Display.List]) &&
            !node.nextSibling &&
            node.nodeType === Node.TEXT_NODE) {
            const textContent = node.textContent;
            if (textContent) {
                node.textContent = textContent.trimEnd();
            }
        }

        if (isSchemaContain(element, [Display.FirstLevel, Display.List]) &&
            !node.previousSibling &&
            node.nodeType === Node.TEXT_NODE) {
            const textContent = node.textContent;
            if (textContent) {
                node.textContent = textContent.trimStart();
            }
        }

        if (node.nodeType === Node.TEXT_NODE &&
            node.textContent?.trim() === "") {
            node.remove();
        }
    });

    element.querySelectorAll("*").forEach(child => {
        cleanElementWhitespace(child as HTMLElement);
    });
}

export function pasteParagraph(contentEditable: HTMLElement) {
    if (!contentEditable.firstChild) {
        const p = document.createElement("p");
        p.innerHTML = "<br>";
        contentEditable.appendChild(p);
    }
}