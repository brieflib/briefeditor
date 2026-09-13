import {Display, getOfType, isSchemaContain} from "@/core/normalize/type/schema";
import {
    commonAncestorContainer,
    CursorPosition,
    getCursorPosition,
    getCursorPositionFrom
} from "@/core/shared/type/cursor-position";
import {isCursorAtEndOfBlock, isCursorAtStartOfBlock} from "@/core/cursor/cursor";
import {getFirstListWrapper} from "@/core/list/util/list-util";
import {newLine} from "@/core/keyboard/util/keyboard-util";
import {readSplitPoint, splitListAround} from "@/core/list/list";

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

function pasteParagraph(contentEditable: HTMLElement, element?: Node) {
    const paragraph = document.createElement("p");
    const elementToPaste = element ?? document.createElement("br");
    paragraph.appendChild(elementToPaste);
    contentEditable.appendChild(paragraph);
    return getCursorPositionFrom(elementToPaste, 0, elementToPaste, elementToPaste.textContent?.length ?? 0);
}

export function ensureParagraph(contentEditable: HTMLElement, cursorPosition: CursorPosition): CursorPosition {
    const firstChild = contentEditable.firstChild;
    if (!firstChild) {
        return pasteParagraph(contentEditable);
    }

    if (!firstChild.textContent?.length &&
        isSchemaContain(firstChild, [Display.FirstLevel, Display.Image]) &&
        !hasSelfCloseDescendant(firstChild)) {
        contentEditable.replaceChildren();
        return pasteParagraph(contentEditable, firstChild);
    }

    if (firstChild.nodeType === Node.TEXT_NODE) {
        contentEditable.replaceChildren();
        return pasteParagraph(contentEditable, firstChild as Text);
    }

    return cursorPosition;
}

/** Selects an image - the one thing a block can hold without any text of its own. */
export const imageSelector = getOfType([Display.Image]).join(",");

/** Whether a block holds nothing but the br standing in for its line. */
export function isEmptyBlock(block: Element) {
    return !block.textContent && !block.querySelector(imageSelector);
}

/** The class marking a paragraph that holds an image and nothing else - a block the cursor never enters. */
export const imageBlockClass = "be-image";

export function isImageBlock(node: Node | null | undefined): boolean {
    return !!node && node.nodeType === Node.ELEMENT_NODE && (node as Element).classList.contains(imageBlockClass);
}

/** A paragraph of its own for `image`, marked as an image block. */
export function createImageBlock(image: Node): HTMLElement {
    const block = document.createElement("p");
    block.classList.add(imageBlockClass);
    block.appendChild(image);

    return block;
}

/**
 * Gives every image under `root` an image block of its own, standing among `root`'s blocks. A
 * line already holding nothing but the image is replaced by the block rather than nesting it;
 * anywhere else the block takes the image's place and is lifted out of whatever held it, each
 * ancestor being split around it.
 */
export function wrapImages(root: ParentNode) {
    root.querySelectorAll(imageSelector).forEach(image => {
        const parent = image.parentElement;
        if (isImageBlock(parent)) {
            return;
        }

        const replaced = parent && isSchemaContain(parent, [Display.Line]) && holdsOnly(parent, image)
            ? parent : image;
        // The block takes its place before the image moves into it.
        const block = createImageBlock(document.createTextNode(""));
        replaced.replaceWith(block);
        block.replaceChildren(image);
        liftBlock(root, block);
    });
}

/** Whether `element` holds `child` and nothing else but whitespace. */
function holdsOnly(element: Element, child: Element) {
    return Array.from(element.childNodes).every(node =>
        node === child || (node.nodeType === Node.TEXT_NODE && !node.textContent?.trim()));
}

/** Splits every ancestor below `root` around `block`, dropping a half left holding nothing. */
function liftBlock(root: ParentNode, block: Element) {
    let parent = block.parentElement;
    while (parent && parent !== root) {
        const tail = parent.cloneNode(false) as HTMLElement;
        while (block.nextSibling) {
            tail.appendChild(block.nextSibling);
        }

        parent.after(block);
        block.after(tail);

        dropHollow(tail);
        dropHollow(parent);

        parent = block.parentElement;
    }
}

const hollowContentSelector = ["BR", imageSelector, ...getOfType([Display.FirstLevel, Display.Table])].join(",");

/** Removes a split half holding nothing but whitespace or empty formatting. */
function dropHollow(element: HTMLElement) {
    if (!element.textContent?.trim() && !element.querySelector(hollowContentSelector)) {
        element.remove();
    }
}

/**
 * Inserts a node (e.g. a table or image) between blocks rather than at the cursor itself,
 * since it isn't a first-level element and can't nest in one.
 *
 * @remarks
 * The block holding the cursor is split in two around the node, unless the cursor is at an
 * edge (no split needed) or the block is empty - an empty block has nothing worth keeping
 * beside the node, so the node takes its place instead of pushing an empty line ahead of it.
 * Both edge flags are read up front, before anything moves.
 */
export function insertBetweenBlocks(contentEditable: HTMLElement, root: HTMLElement, cursorPosition: CursorPosition, node: Node) {
    const isAtStart = isCursorAtStartOfBlock(contentEditable, cursorPosition);
    const isAtEnd = isCursorAtEndOfBlock(contentEditable, cursorPosition);

    if (isSchemaContain(getFirstListWrapper(root), [Display.ListWrapper])) {
        // An empty item needs no branch of its own: the split drops the item it leaves
        // empty, so the node takes the place of an empty line inside a list too.
        insertIntoList(contentEditable, root, cursorPosition, node);
    } else if (isSchemaContain(root, [Display.FirstLevel]) && isEmptyBlock(root)) {
        root.replaceWith(node);
    } else if (isAtStart) {
        root.before(node);
    } else {
        // The split leaves the second half right after the root, so the node still goes
        // after the root to end up between the two halves.
        if (!isAtEnd) {
            newLine(contentEditable, cursorPosition);
        }
        root.after(node);
    }
}

function insertIntoList(contentEditable: HTMLElement, root: HTMLElement, cursorPosition: CursorPosition, node: Node) {
    const splitPoint = readSplitPoint(contentEditable, root, cursorPosition);

    splitListAround(splitPoint.root, cursorPosition, node, splitPoint.splitIndex);
}