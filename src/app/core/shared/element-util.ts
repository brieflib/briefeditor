import {Display, isSchemaContain} from "@/core/normalize/type/schema";
import {commonAncestorContainer, getCursorPosition} from "@/core/shared/type/cursor-position";

export function getChildFragment(child: Element) {
    const fragment = new DocumentFragment();
    for (const node of Array.from(child.childNodes)) {
        if (!isSchemaContain(node, [Display.ListWrapper])) {
            fragment.appendChild(node);
        }
    }

    return fragment;
}

export function getRootElement(findTill: HTMLElement, child: HTMLElement | Node) {
    while (child.parentElement && child.parentElement !== findTill) {
        child = child.parentElement;
    }

    return child as HTMLElement;
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

export function getElementByTagName(findTill: HTMLElement, tagName: string, cursorPosition = getCursorPosition()) {
    let child = commonAncestorContainer(cursorPosition);
    while (child.parentElement && child.parentElement !== findTill && child.nodeName !== tagName) {
        child = child.parentElement;
    }

    if (child.parentElement === findTill && child.nodeName !== tagName) {
        return null;
    }

    return child;
}

export function getNextNode(findTill: HTMLElement, node: Node) {
    while (node.parentElement && node !== findTill && !node.nextSibling) {
        node = node.parentElement;
    }

    return node.nextSibling;
}

export function getPreviousNode(findTill: HTMLElement, node: Node) {
    while (node.parentElement && node !== findTill && !node.previousSibling) {
        node = node.parentElement;
    }

    return node.previousSibling;
}

export function getFirstText(node: Node) {
    while (node && node.firstChild && node.nodeType !== Node.TEXT_NODE) {
        node = node.firstChild;
    }

    return node as HTMLElement;
}

export function getLastText(node: Node) {
    let currentNode: Node = node;

    while (currentNode.nodeType !== Node.TEXT_NODE) {
        const childNodes = currentNode.childNodes;
        const lastChild = childNodes[childNodes.length - 1];

        if (!lastChild) {
            return currentNode as HTMLElement;
        }

        currentNode = lastChild;
    }

    return currentNode as HTMLElement;
}

export function getLastNonEmptyText(node: Node): HTMLElement {
    if (node.nodeType === Node.TEXT_NODE && node.textContent) {
        return node as HTMLElement;
    }

    const children = Array.from(node.childNodes);
    for (let i = children.length - 1; i >= 0; i--) {
        const child = children[i];
        if (child && child.textContent) {
            return getLastNonEmptyText(child);
        }
    }

    return getLastText(node);
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