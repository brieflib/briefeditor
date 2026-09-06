import {Display, getOfType, isSchemaContain} from "@/core/normalize/type/schema";
import {
    commonAncestorContainer,
    CursorPosition,
    getCursorPosition,
    getCursorPositionFrom
} from "@/core/shared/type/cursor-position";
import {isCursorAtEndOfBlock, isCursorAtStartOfBlock} from "@/core/cursor/cursor";
import {getFirstListWrapper, getListsOrderNumbers} from "@/core/list/util/list-util";
import {newLine} from "@/core/keyboard/util/keyboard-util";
import {splitListAround} from "@/core/list/list";

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

export function getNextNotEmptyNode(findTill: HTMLElement, node: Node | null) {
    while (node && !node.textContent) {
        node = getNextNode(findTill, node);
    }

    return node;
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

export function hasSelfCloseDescendant(node: Node): boolean {
    if (isSchemaContain(node, [Display.SelfClose])) {
        return true;
    }
    for (const child of Array.from(node.childNodes)) {
        if (hasSelfCloseDescendant(child)) {
            return true;
        }
    }
    return false;
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

// The editable element is a first level tag itself, so with every block deleted the cursor is left on the root
// and the editor takes the root for the block it is editing. The br that stands in for an emptied block, or the
// character typed over the selection, is then written straight into the root, outside of any paragraph, and the
// document is left with no line to hold the next one. Such a leftover is wrapped in the paragraph it belongs in
// and the cursor follows it there. Only a text or a self closing tag counts as one: an element opening the
// document is markup its author put there, and it is left where it is.
export function ensureParagraph(contentEditable: HTMLElement, cursorPosition: CursorPosition): CursorPosition {
    const stray = contentEditable.firstChild;
    if (stray && stray.nodeType !== Node.TEXT_NODE && !isSchemaContain(stray, [Display.SelfClose])) {
        return cursorPosition;
    }

    const paragraph = document.createElement("p");
    paragraph.appendChild(stray ?? document.createElement("br"));
    contentEditable.prepend(paragraph);

    if (paragraph.contains(cursorPosition.startContainer)) {
        return cursorPosition;
    }

    const firstText = getFirstText(paragraph);
    return getCursorPositionFrom(firstText, 0, firstText, 0);
}

export function clone(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
        return node;
    }

    const cloned = document.createElement(node.nodeName);

    node.childNodes.forEach(child => {
        cloned.appendChild(child);
    });

    return cloned;
}

// An image is the one thing that can be in a block without any text of its own, so it is asked for by name.
export const imageSelector = getOfType([Display.Image]).join(",");

// A block that holds nothing but the br standing in for its line.
export function isEmptyBlock(block: HTMLElement) {
    return !block.textContent && !block.querySelector(imageSelector);
}

// A node is not a first level element and cannot be nested in one, so it never goes at the cursor
// itself. It goes before or after the first level element holding the cursor, and only a cursor in the
// middle of one splits it in two for the node to sit between the halves. A block that holds nothing but
// the br standing in for its line has nothing to divide and nothing worth keeping beside the node: the
// node takes its place, so an inserted table or image lands on the empty line the cursor is on instead
// of pushing an empty line ahead of itself. Both flags are read from the cursor before anything moves,
// so they must be the first thing done.
export function insertBetweenBlocks(contentEditable: HTMLElement, root: HTMLElement, cursorPosition: CursorPosition, node: Node) {
    const isAtStart = isCursorAtStartOfBlock(contentEditable, cursorPosition);
    const isAtEnd = isCursorAtEndOfBlock(contentEditable, cursorPosition);

    if (isSchemaContain(getFirstListWrapper(root), [Display.ListWrapper])) {
        // An empty item goes the same way without a branch of its own: the split drops the item it leaves
        // empty, so the node takes the place of an empty line inside a list too.
        insertIntoList(contentEditable, root, cursorPosition, node, isAtStart, isAtEnd);
    } else if (isSchemaContain(root, [Display.FirstLevel]) && isEmptyBlock(root)) {
        root.replaceWith(node);
    } else if (isAtStart) {
        root.before(node);
    } else {
        // The split leaves the second half right after the root, so the node still goes after the root
        // to end up between the two halves.
        if (!isAtEnd) {
            newLine(contentEditable, cursorPosition);
        }
        root.after(node);
    }
}

function insertIntoList(contentEditable: HTMLElement, root: HTMLElement, cursorPosition: CursorPosition,
                        node: Node, isAtStart: boolean, isAtEnd: boolean) {
    // Read before the split: it inserts the second half after the item the cursor is in, which leaves
    // that item's own position untouched but carries the cursor over to the new one.
    const index = getListsOrderNumbers(contentEditable, cursorPosition)[0] ?? 0;
    let splitIndex = index;
    if (!isAtStart) {
        if (!isAtEnd) {
            // Dividing an item rebuilds the list it stands in, which leaves the root read above gone. The
            // cursor keeps to the half of the line written before it, so the list that took its place is
            // read back from there.
            newLine(contentEditable, cursorPosition);
            root = getRootElement(contentEditable, cursorPosition.startContainer);
        }
        splitIndex = index + 1;
    }

    splitListAround(root, cursorPosition, node, splitIndex);
}