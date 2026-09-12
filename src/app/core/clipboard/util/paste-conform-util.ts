import {Display, getOfType, isSchemaContain} from "@/core/normalize/type/schema";
import {imageSelector, isEmptyBlock} from "@/core/shared/element-util";

export const tableSelector = getOfType([Display.Table]).join(",");

// The blocks a paste is read as a sequence of: a line, a list or a table. Nothing else stands at the top
// level once the markup is conformed.
const blockSelector = getOfType([Display.Line, Display.ListWrapper, Display.Table]).join(",");

// What makes a half of a split block worth keeping: words, a break, an image or a block of its own.
const contentSelector = ["BR", imageSelector, blockSelector].join(",");

/**
 * The tag the words of a line are written in. An item's words stand inline in it, so a paragraph
 * stands for them; any other line is written in its own tag.
 */
export function lineTag(line: HTMLElement): string {
    return isSchemaContain(line, [Display.List]) ? "P" : line.nodeName;
}

/**
 * Rewrites the pasted lines into the shape of the line they are dropped on: the target dictates the
 * tag, and a pasted line only carries words for it.
 *
 * @remarks
 * Inline markup standing between blocks is a line too, so it's wrapped as one first. Every line is
 * then written in the target's tag; inside an item a run of lines is folded into a single paragraph
 * whose lines are divided by breaks, since an item holds one line only. Lists and tables are left as
 * they are - the placement puts them beside the target rather than into it.
 *
 * An empty line is the one target that gives its tag up: it has no words to join, so the pasted blocks
 * take its place keeping their own tags. An empty item is still filled, since it has no tag to give up.
 */
export function conformLines(body: HTMLElement, line: HTMLElement | undefined) {
    if (!line || (!isSchemaContain(line, [Display.List]) && isEmptyBlock(line))) {
        return;
    }

    const tag = lineTag(line);
    wrapInlineRuns(body, tag);
    renameLines(body, tag);

    if (isSchemaContain(line, [Display.List])) {
        foldLines(body);
    }
}

/**
 * Lifts every line, list and table nested in another block out to the top level, so the paste reads
 * as a flat sequence of blocks. Each ancestor is split around the block, and a half left holding
 * nothing is dropped rather than counted as a line of its own.
 *
 * A line or a list stays inside the item or cell holding it: an item nests a list, and a cell holds
 * whatever the table normalization makes of it. A table is lifted out of an item all the same, since
 * a table never nests in a list.
 */
export function hoistBlocks(root: HTMLElement) {
    root.querySelectorAll(blockSelector).forEach(block => hoist(root, block));
}

function hoist(root: HTMLElement, block: Element) {
    const stopAt = isSchemaContain(block, [Display.Table]) ? [] : [Display.List, Display.Cell];

    let parent = block.parentElement;
    while (parent && parent !== root && !isSchemaContain(parent, stopAt)) {
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

/** Removes a split half that holds nothing but whitespace or empty formatting. */
function dropHollow(element: HTMLElement) {
    if (!element.textContent?.trim() && !element.querySelector(contentSelector)) {
        element.remove();
    }
}

/**
 * Wraps every run of inline markup standing between blocks into a line of its own, written in the
 * target's tag. A run holding nothing but whitespace or comments is left alone: it isn't a line, and
 * a bare space must stay the space a blank paste is read as.
 */
function wrapInlineRuns(body: HTMLElement, tag: string) {
    let run: ChildNode[] = [];
    const wrap = () => {
        const first = run[0];
        if (first && run.some(isContent)) {
            const block = document.createElement(tag);
            first.before(block);
            block.append(...run);
        }
        run = [];
    };

    for (const child of Array.from(body.childNodes)) {
        if (isBlock(child)) {
            wrap();
        } else {
            run.push(child);
        }
    }
    wrap();
}

/** Writes every line in the target's tag. Attributes go with the tag, the way a div's do. */
function renameLines(body: HTMLElement, tag: string) {
    for (const child of Array.from(body.children)) {
        if (isSchemaContain(child, [Display.Line]) && child.nodeName !== tag) {
            const block = document.createElement(tag);
            block.append(...child.childNodes);
            child.replaceWith(block);
        }
    }
}

/**
 * Folds every run of two or more lines into one paragraph, dividing the lines by breaks. An empty
 * line brings no br of its own - the break dividing it from its neighbours already stands for it. A
 * lone line is left as it is: folding an empty one would leave a paragraph with no br to be read as
 * the blank it is.
 */
function foldLines(body: HTMLElement) {
    let run: Element[] = [];
    const fold = () => {
        const first = run[0];
        if (first && run.length > 1) {
            const folded = document.createElement("P");
            first.before(folded);
            run.forEach((block, index) => {
                if (index > 0) {
                    folded.append(document.createElement("BR"));
                }
                if (!isEmptyBlock(block)) {
                    folded.append(...block.childNodes);
                }
                block.remove();
            });
        }
        run = [];
    };

    for (const child of Array.from(body.childNodes)) {
        if (isSchemaContain(child, [Display.Line])) {
            run.push(child as Element);
        } else if (isContent(child)) {
            // A list or a table divides the run; the whitespace between blocks doesn't.
            fold();
        }
    }
    fold();
}

function isBlock(node: ChildNode) {
    return node.nodeType === Node.ELEMENT_NODE && isSchemaContain(node, [Display.Line, Display.ListWrapper, Display.Table]);
}

/** Whether a node is anything but a comment or whitespace. */
function isContent(node: ChildNode) {
    if (node.nodeType === Node.COMMENT_NODE) {
        return false;
    }

    return node.nodeType !== Node.TEXT_NODE || !!node.textContent?.trim();
}
