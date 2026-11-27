import {Leaf, LeafGroup} from "@/core/normalize/type/leaf";
import tagHierarchy, {TagHierarchy} from "@/core/normalize/type/tag-hierarchy";
import {Display, isSchemaContain, isSchemaContainNodeName} from "@/core/normalize/type/schema";
import {CursorPosition, getCursorPositionFrom} from "@/core/shared/type/cursor-position";
import {
    charLengthBefore,
    getBlockElement,
    hasSelfCloseDescendant,
    imageBlockClass,
    imageSizeClasses
} from "@/core/shared/element-util";
import {Carrier} from "@/core/carrier/carrier";
import {Attributes} from "@/core/command/type/command";
import {applyAttributes} from "@/core/command/util/command-util";
import {AvailableClasses} from "@/core/shared/available-classes";

/** A node and offset in a rebuilt fragment. */
export interface LeafPosition {
    readonly node: Node;
    readonly offset: number;
}

/** A rebuilt fragment together with the cursor endpoints mapped through the rebuild. */
export interface CollapsedLeaves {
    readonly node: Node;
    readonly start: LeafPosition | undefined;
    readonly end: LeafPosition | undefined;
}

/**
 * Rebuilds a detached fragment into the schema: every leaf is read with the tags that stood
 * over it, any of `tagsToRemove` is dropped, the rest are ordered by the tag hierarchy with
 * consecutive duplicates removed.
 *
 * @returns A new fragment built of cloned elements around the leaves themselves, which are
 * moved out of `toNormalize`, and the cursor endpoints mapped onto those leaves.
 */
export function normalizeNew(contentEditable: Node,
                             block: DocumentFragment,
                             cursorPosition: CursorPosition): CollapsedLeaves {
    const leaves = getTextNodes(block)
        .map(textNode => toLeafWithParents(contentEditable, textNode))
        .map(leaf => divideFirstLevels(leaf))
        .map(leaf => sortLeafParents(leaf))
        .map(leaf => removeSelfCloseInlines(leaf))
        .map(leaf => removeConsecutiveDuplicates(leaf));

    return collapseLeavesNew(leaves, cursorPosition);
}

/**
 * Rebuilds a detached fragment into the schema like {@link normalizeNew}, dropping `tagsToRemove` only from the
 * parents of `selectedTexts`.
 */
export function normalizeRemoveNew(contentEditable: Node,
                                   toNormalize: DocumentFragment,
                                   selectedTexts: Node[],
                                   tagsToRemove: string[],
                                   cursorPosition: CursorPosition): CollapsedLeaves {
    const leaves = getTextNodes(toNormalize)
        .map(textNode => toLeafWithParents(contentEditable, textNode))
        .map(leaf => filterSelectedLeafParentsNew(selectedTexts, tagsToRemove, leaf))
        .map(leaf => divideFirstLevels(leaf))
        .map(leaf => sortLeafParents(leaf))
        .map(leaf => removeSelfCloseInlines(leaf))
        .map(leaf => removeConsecutiveDuplicates(leaf));

    return collapseLeavesNew(leaves, cursorPosition);
}

/** Drops `tagsToRemove` from the leaf's parents when its leaf node is one of `selectedTexts`; other leaves are left as is. */
function filterSelectedLeafParentsNew(selectedTexts: Node[], tagsToRemove: string[], leaf: Leaf) {
    const leafNode = leaf.getNode();
    if (!leafNode || !selectedTexts.includes(leafNode)) {
        return leaf;
    }

    return filterLeafParentsNew(tagsToRemove, leaf);
}

/**
 * Rebuilds a detached fragment into the schema, replacing the selected `blocks`, list items or lines, with
 * `targetTags`. A line the replacement left in a list is divided out of it.
 */
export function normalizeReplaceBlockNew(contentEditable: Node,
                                         toNormalize: DocumentFragment,
                                         blocks: Node[],
                                         targetTags: string[],
                                         cursorPosition: CursorPosition): CollapsedLeaves {
    // Leaves under the same block share its replacement, so they collapse into one block again
    const replacements = new Map<Node, HTMLElement[]>();
    const leaves = getTextNodes(toNormalize)
        .map(textNode => toLeafWithParents(contentEditable, textNode))
        .map(leaf => replaceLeafParentsNew(blocks, targetTags, replacements, leaf))
        .map(leaf => divideFirstLevels(leaf))
        .map(leaf => sortLeafParents(leaf))
        .map(leaf => removeConsecutiveDuplicates(leaf));

    return collapseLeavesNew(leaves, cursorPosition);
}

/**
 * Rebuilds a detached fragment into the schema, moving the leaves of `lastBlock` into `firstBlock`. Both blocks
 * must stand in `toNormalize`.
 */
export function normalizeMergeNew(contentEditable: HTMLElement,
                                  toNormalize: DocumentFragment,
                                  firstBlock: Node,
                                  lastBlock: Node,
                                  cursorPosition: CursorPosition): CollapsedLeaves {
    const lastChild = firstBlock.lastChild;
    if (lastChild && isSchemaContain(lastChild, [Display.SelfClose])) {
        lastChild.remove();
    }

    // Inside the fragment the chain stops at the fragment, so it holds only the first block and its wrappers
    const firstBlockLeaf = toLeafWithParents(contentEditable, firstBlock);
    const firstBlockParents = firstBlockLeaf.getParents();

    let leaves = getTextNodes(toNormalize).map(textNode => toLeafWithParents(contentEditable, textNode));
    // Two empty blocks have no text node to stand for them, so the first block keeps its own chain
    if (leaves.length === 0) {
        leaves.push(firstBlockLeaf);
    }
    leaves = leaves
        .map(leaf => mergeLeafParentsNew(firstBlockParents, lastBlock, leaf))
        .map(leaf => divideFirstLevels(leaf))
        .map(leaf => sortLeafParents(leaf))
        .map(leaf => removeSelfCloseInlines(leaf))
        .map(leaf => removeConsecutiveDuplicates(leaf));

    return addPlaceholderIfEmpty(leaves, cursorPosition);
}

/**
 * Adds a placeholder br when no rebuilt leaf holds content; otherwise collapses the leaves with the existing
 * cursor position.
 */
function addPlaceholderIfEmpty(leaves: Leaf[], cursorPosition: CursorPosition): CollapsedLeaves {
    const leaf = leaves.at(0);
    // The merged result has nothing to render, so add a placeholder br.
    if (leaf && leaves.every(item => !item.hasNodeContent())) {
        const br = addPlaceholderBr(leaf);
        return collapseLeavesNew(leaves, getCursorPositionFrom(br, 0, br, 0));
    }

    return collapseLeavesNew(leaves, cursorPosition);
}

/**
 * Puts a br in place of `leaf`, inside it when the leaf itself stands for a block, and returns it.
 */
function addPlaceholderBr(leaf: Leaf) {
    const node = leaf.getNode();
    if (node instanceof Text) {
        const br = document.createElement("br");
        leaf.replaceNode(br);
        return br;
    }

    if (isSchemaContain(node, [Display.SelfClose])) {
        return node as HTMLElement;
    }

    const br = document.createElement("br");
    leaf.addParent(br);
    return br;
}

/**
 * Replaces the leaf's parents up to and including `lastBlock` with `firstBlockParents`, so the leaf collapses into
 * the first block. A leaf outside `lastBlock` is left as is.
 */
export function mergeLeafParentsNew(firstBlockParents: Node[], lastBlock: Node, leaf: Leaf) {
    const parents = leaf.getParents();
    const lastBlockIndex = parents.indexOf(lastBlock);
    if (lastBlockIndex < 0) {
        return leaf;
    }

    // The same element instances as the first block's own leaves, so collapseLeavesNew groups them together
    leaf.setParents([...firstBlockParents, ...parents.slice(lastBlockIndex + 1)]);

    return leaf;
}

/**
 * Rebuilds a detached fragment into the schema, dividing `block` at `breakText`: the leaves after it go into a new
 * block of the same tag. `block` must stand in `toNormalize`.
 */
export function normalizeBreakNew(contentEditable: Node,
                                  toNormalize: DocumentFragment,
                                  block: Node,
                                  breakText: Text,
                                  cursorPosition: CursorPosition): CollapsedLeaves {
    addEmptyLinePlaceholders(block, breakText);

    // A new element rather than a clone, so the block's attributes and classes stay with the first line only
    const newBlock = document.createElement(block.nodeName);
    const leaves = getTextNodes(toNormalize)
        .map(textNode => toLeafWithParents(contentEditable, textNode))
        .map(leaf => breakLeafParentsNew(block, newBlock, breakText, leaf))
        .map(leaf => divideFirstLevels(leaf))
        .map(leaf => sortLeafParents(leaf))
        .map(leaf => removeSelfCloseInlines(leaf))
        .map(leaf => removeConsecutiveDuplicates(leaf));

    return collapseLeavesNew(leaves, cursorPosition);
}

/**
 * Puts a br on each side of `breakText` holding no leaf of `block`, since an empty line shows a br. A nested list
 * is a line of its own, so its leaves don't count.
 */
function addEmptyLinePlaceholders(block: Node, breakText: Text) {
    const lineLeaves = Array.from(block.childNodes)
        .filter(child => !isSchemaContain(child, [Display.ListWrapper]))
        .flatMap(child => getTextNodes(child));

    const hasLeafBefore = lineLeaves.some(leaf => breakText.compareDocumentPosition(leaf) & Node.DOCUMENT_POSITION_PRECEDING);
    if (!hasLeafBefore) {
        breakText.before(document.createElement("br"));
    }

    const hasLeafAfter = lineLeaves.some(leaf => breakText.compareDocumentPosition(leaf) & Node.DOCUMENT_POSITION_FOLLOWING);
    if (!hasLeafAfter) {
        breakText.after(document.createElement("br"));
    }
}

/**
 * Replaces `block` among the leaf's parents with `newBlock` when the leaf follows `breakText`. A leaf before the break
 * or outside `block` is left as is.
 */
export function breakLeafParentsNew(block: Node, newBlock: HTMLElement, breakText: Text, leaf: Leaf) {
    const parents = leaf.getParents();
    const blockIndex = parents.indexOf(block);
    const leafNode = leaf.getNode();
    const isAfterBreak = !!leafNode && !!(breakText.compareDocumentPosition(leafNode) & Node.DOCUMENT_POSITION_FOLLOWING);
    if (blockIndex < 0 || !isAfterBreak) {
        return leaf;
    }

    // The same instance for every leaf after the break, so collapseLeavesNew groups them into one block
    leaf.setParents([...parents.slice(0, blockIndex), newBlock, ...parents.slice(blockIndex + 1)]);

    return leaf;
}

/**
 * Rebuilds the block holding the carrier, dropping `tagsToRemove` from the carrier's parents only. Self-closing
 * leaves keep their inline tags, so an empty line like <strong><br></strong> stays as it is.
 */
export function normalizeCarrierNew(contentEditable: Node,
                                    toNormalize: DocumentFragment,
                                    carrierText: Text,
                                    tagsToRemove: string[],
                                    cursorPosition: CursorPosition): CollapsedLeaves {
    const leaves = getTextNodes(toNormalize)
        .map(textNode => toLeafWithParents(contentEditable, textNode))
        .map(leaf => leaf.getNode() === carrierText ? filterLeafParentsNew(tagsToRemove, leaf) : leaf)
        .map(leaf => sortLeafParents(leaf))
        .map(leaf => removeConsecutiveDuplicates(leaf));

    return collapseLeavesNew(leaves, cursorPosition);
}

// interface BackspaceContext {
//     readonly contentEditable: HTMLElement;
//     readonly cursorPosition: CursorPosition;
//     readonly isWholeBlockSelected: boolean | undefined;
//     readonly br: HTMLElement;
//     cursor: CursorPosition;
//     cursorLeaf?: Leaf;
//     previousLeaf?: Leaf;
//     nextLeaf?: Leaf;
//     block?: Node;
//     previousBlock?: Node;
//     blockParents?: Node[];
//     previousBlockParents?: Node[];
// }
// /** Whether `node` is a block Backspace may merge or replace. */
// function isBackspaceBlock(node: Node) {
//     return isSchemaContain(node, [Display.FirstLevel, Display.List]) &&
//         !isSchemaContain(node, [Display.ListWrapper]);
// }
//
// /** Records the cursor leaf, the previous leaf and the blocks they belong to. */
// function backspaceFindLeafNew(leaf: Leaf, context: BackspaceContext) {
//     if (context.cursorLeaf) {
//         if (!context.nextLeaf) {
//             context.nextLeaf = leaf;
//         }
//
//         return leaf;
//     }
//
//     if (leaf.getParents().at(-1) === context.cursorPosition.startContainer) {
//         context.cursorLeaf = leaf;
//         const parents = leaf.getParents();
//         const blockIndex = parents.findLastIndex(isBackspaceBlock);
//         const block = parents[blockIndex];
//
//         if (block) {
//             context.block = block;
//         }
//
//         if (context.isWholeBlockSelected === true) {
//             context.blockParents = blockIndex >= 0 ? parents.slice(0, blockIndex + 1) : parents;
//         } else if (context.cursorPosition.startOffset === 0 && context.previousLeaf) {
//             const previousParents = context.previousLeaf.getParents();
//             const previousBlockIndex = previousParents.findLastIndex(isBackspaceBlock);
//             const previousBlock = previousParents[previousBlockIndex];
//
//             if (previousBlock) {
//                 context.previousBlock = previousBlock;
//                 context.previousBlockParents = previousParents.slice(0, previousBlockIndex + 1);
//             }
//         }
//
//         return leaf;
//     }
//
//     context.previousLeaf = leaf;
//     return leaf;
// }
//
// /** Maps every leaf of a whole-block selection to the same br leaf under the first block's parents. */
// function backspaceSelectionNew(leaf: Leaf, context: BackspaceContext) {
//     if (context.isWholeBlockSelected !== true) {
//         return leaf;
//     }
//
//     context.cursor = getCursorPositionFrom(context.br, 0, context.br, 0);
//
//     return new Leaf([...(context.blockParents ?? leaf.getParents()), context.br]);
// }
//
// /** Deletes the br Backspace removes when the cursor stands on one or right after one. */
// function backspaceSelfCloseNew(leaf: Leaf, context: BackspaceContext) {
//     if (context.isWholeBlockSelected !== undefined) {
//         return leaf;
//     }
//
//     const cursorLeaf = context.cursorLeaf;
//     const previousLeaf = context.previousLeaf;
//     if (!cursorLeaf || !previousLeaf) {
//         return leaf;
//     }
//
//     const previousNode = previousLeaf.getParents().at(-1);
//     const cursor = context.cursorPosition.startContainer;
//
//     if (!isSchemaContain(cursor, [Display.SelfClose])) {
//         if (isSchemaContain(previousNode, [Display.SelfClose]) && leaf === previousLeaf) {
//             leaf.setParents([...cursorLeaf.getParents()]);
//         }
//
//         return leaf;
//     }
//
//     const isSameBlock = context.block && context.previousBlock &&
//         context.block === context.previousBlock;
//
//     // Another br stands before the cursor br: drop the previous br and keep the cursor on its own br.
//     if (isSameBlock && isSchemaContain(previousNode, [Display.SelfClose])) {
//         if (leaf === previousLeaf) {
//             leaf.setParents([...cursorLeaf.getParents()]);
//         }
//
//         return leaf;
//     }
//
//     // The br is all its block holds: drop the block and move the caret onto the previous leaf.
//     if (leaf === cursorLeaf && context.block && isOnlySelfClose(context.block)) {
//         leaf.setParents([...previousLeaf.getParents()]);
//         context.cursor = previousNode instanceof Text
//             ? getCursorPositionFrom(previousNode, previousNode.data.length, previousNode, previousNode.data.length)
//             : getCursorPositionFrom(previousNode as Node, 0, previousNode as Node, 0);
//     }
//
//     return leaf;
// }
//
// /** Edits the cursor leaf or the previous leaf, or merges the block into the one before it. */
// function backspaceCharacterNew(leaf: Leaf, context: BackspaceContext) {
//     if (context.isWholeBlockSelected !== undefined) {
//         return leaf;
//     }
//
//     const text = context.cursorPosition.startContainer;
//     if (!(text instanceof Text) || !context.cursorLeaf) {
//         return leaf;
//     }
//
//     if (context.cursorPosition.startOffset > 0) {
//         if (leaf === context.cursorLeaf) {
//             const length = charLengthBefore(text.data, context.cursorPosition.startOffset);
//             text.deleteData(context.cursorPosition.startOffset - length, length);
//
//             const ownContent = context.block
//                 ? Array.from(context.block.childNodes)
//                     .filter(node => !isSchemaContain(node, [Display.ListWrapper]))
//                     .some(node => !!node.textContent || hasSelfCloseDescendant(node))
//                 : true;
//
//             if (!text.data && !ownContent) {
//                 const br = document.createElement("br");
//                 leaf.setParents([...leaf.getParents().slice(0, -1), br]);
//                 context.cursor = getCursorPositionFrom(br, 0, br, 0);
//             } else if (!text.data) {
//                 const nextLeaf = context.nextLeaf;
//                 const nextBlock = nextLeaf?.getParents().findLast(isBackspaceBlock);
//                 const previousLeaf = context.previousLeaf;
//                 const previousBlock = previousLeaf?.getParents().findLast(isBackspaceBlock);
//
//                 if (nextLeaf && nextBlock === context.block) {
//                     leaf.setParents([...nextLeaf.getParents()]);
//                     const nextNode = nextLeaf.getParents().at(-1);
//                     context.cursor = nextNode instanceof Text
//                         ? getCursorPositionFrom(nextNode, 0, nextNode, 0)
//                         : getCursorPositionFrom(nextNode as Node, 0, nextNode as Node, 0);
//                 } else if (previousLeaf && previousBlock === context.block) {
//                     leaf.setParents([...previousLeaf.getParents()]);
//                     const previousNode = previousLeaf.getParents().at(-1);
//                     context.cursor = previousNode instanceof Text
//                         ? getCursorPositionFrom(previousNode, previousNode.data.length,
//                             previousNode, previousNode.data.length)
//                         : getCursorPositionFrom(previousNode as Node, 0, previousNode as Node, 0);
//                 } else {
//                     context.cursor = getCursorPositionFrom(text, 0, text, 0);
//                 }
//             } else {
//                 context.cursor = getCursorPositionFrom(
//                     text,
//                     context.cursorPosition.startOffset - length,
//                     text,
//                     context.cursorPosition.endOffset - length);
//             }
//         }
//
//         return leaf;
//     }
//
//     const previousLeaf = context.previousLeaf;
//     const previousText = previousLeaf?.getParents().at(-1);
//     if (!previousLeaf || (!(previousText instanceof Text) && !isSchemaContain(previousText, [Display.SelfClose]))) {
//         return leaf;
//     }
//
//     if (previousText instanceof Text) {
//         if (context.block && context.previousBlock &&
//             context.block !== context.previousBlock && context.previousBlockParents) {
//             return mergeLeafParentsNew(context.previousBlockParents, context.block, leaf);
//         }
//
//         if (leaf === previousLeaf) {
//             const length = charLengthBefore(previousText.data, previousText.data.length);
//             previousText.deleteData(previousText.data.length - length, length);
//
//             if (!previousText.data && context.cursorLeaf) {
//                 leaf.setParents([...context.cursorLeaf.getParents()]);
//             }
//         }
//     }
//
//     return leaf;
// }

/** Rebuilds `toNormalize` after Backspace through the Backspace mapper passes. */
export function normalizeBackspaceNew(contentEditable: HTMLElement,
                                      toNormalize: DocumentFragment,
                                      cursorPosition: CursorPosition): CollapsedLeaves {
    let leaves = getTextNodes(toNormalize)
        .map(textNode => toLeafWithParents(contentEditable, textNode));

    cursorPosition = backspaceCharacterNew(leaves, cursorPosition);
    cursorPosition = backspaceSelfCloseNew(leaves, cursorPosition);
    cursorPosition = backspaceEmptyLineNew(leaves, cursorPosition);

    leaves = leaves.filter(leaf => {
        const node = leaf.getNode();
        return !(node instanceof Text && !node.data && leaf.hasContent());
    });

    return collapseLeavesNew(leaves, cursorPosition);
}

/** Gives a line Backspace emptied a br to stand on, moving the cursor onto it. */
function backspaceEmptyLineNew(leaves: Leaf[], cursorPosition: CursorPosition) {
    const leaf = leaves.find(leaf => leaf.getNode() === cursorPosition.startContainer);
    if (!leaf) {
        return cursorPosition;
    }

    if (!leaf.hasContent()) {
        const br = addPlaceholderBr(leaf);
        return getCursorPositionFrom(br, 0, br, 0);
    }

    return cursorPosition;
}

/**
 * Removes the character before the cursor, stepping back over both units of an emoji. With the
 * cursor at the start of its text, the character goes from the closest text before it, found by
 * walking up the leaf's parents.
 */
function backspaceCharacterNew(leaves: Leaf[], cursorPosition: CursorPosition) {
    const leafIndex = leaves.findIndex(leaf => leaf.getNode() === cursorPosition.startContainer);
    const leaf = leaves[leafIndex];
    const text = leaf?.getNode();
    if (!leaf || !(text instanceof Text)) {
        return cursorPosition;
    }

    if (cursorPosition.startOffset > 0) {
        const offset = removeCharacterBefore(text, cursorPosition.startOffset);
        // Text is cleared - move cursor to the previous node.
        if (!text.data && leaf.hasContent()) {
            const previousNode = leaves[leafIndex - 1]?.getNode();
            if (previousNode) {
                const previousOffset = previousNode instanceof Text ? previousNode.data.length : 0;
                return getCursorPositionFrom(previousNode, previousOffset, previousNode, previousOffset);
            }
        }
        
        return getCursorPositionFrom(text, offset, text, offset);
    }

    const previousText = getPreviousText(leaf, leaves[leafIndex - 1]);
    if (!previousText) {
        return cursorPosition;
    }

    const offset = removeCharacterBefore(previousText, previousText.data.length);
    if (!previousText.data) {
        return getCursorPositionFrom(text, 0, text, 0);
    }
    return getCursorPositionFrom(previousText, offset, previousText, offset);
}

/** Removes the br at the caret, or the br before it, keeping the caret's own br when one still holds it. */
function backspaceSelfCloseNew(leaves: Leaf[], cursorPosition: CursorPosition) {
    const leafIndex = leaves.findIndex(leaf => leaf.getNode() === cursorPosition.startContainer);
    const leaf = leaves[leafIndex];
    const node = leaf?.getNode();
    if (!leaf || !node || cursorPosition.startOffset > 0) {
        return cursorPosition;
    }

    const previousLeaf = leaves[leafIndex - 1];
    const previousNode = previousLeaf?.getNode();

    // A br stands before the caret: remove it, the caret keeps its own br.
    if (previousLeaf?.getFirstLine() === leaf.getFirstLine() &&
        isSchemaContain(previousNode, [Display.SelfClose])) {
        leaves.splice(leafIndex - 1, 1);
        return cursorPosition;
    }

    // The caret is not on a br, so there is no current br to remove.
    if (!isSchemaContain(node, [Display.SelfClose]) || !previousNode) {
        return cursorPosition;
    }

    // The caret br opens its line: remove it and step back to the line above.
    leaves.splice(leafIndex, 1);
    const offset = previousNode instanceof Text ? previousNode.data.length : 0;
    return getCursorPositionFrom(previousNode, offset, previousNode, offset);
}

/** Deletes the character before `offset` and returns the offset it now stands at. */
function removeCharacterBefore(text: Text, offset: number) {
    const length = charLengthBefore(text.data, offset);
    text.deleteData(offset - length, length);

    return offset - length;
}

/**
 * The text holding the character before `leaf`: the previous leaf's text, when it stands on the
 * same line. A br, an image or a text of another line has no character to take.
 */
function getPreviousText(leaf: Leaf, previousLeaf: Leaf | undefined) {
    if (!previousLeaf || previousLeaf.getFirstLine() !== leaf.getFirstLine()) {
        return;
    }

    const text = previousLeaf.getNode();
    return text instanceof Text && text.data ? text : undefined;
}

function replaceWithBr(leaf: Leaf, replaceable: Node, isReplace: boolean) {
    const firstLine = leaf.getFirstLine();
    if (!firstLine) {
        leaf.setParents([document.createElement(replaceable.nodeName), document.createElement("br")]);
        return leaf;
    }

    if (!isReplace || !firstLine.contains(replaceable)) {
        return leaf;
    }

    const parents = leaf.getParents();
    const upper = parents.slice(0, parents.indexOf(firstLine));
    leaf.setParents([...upper, firstLine, document.createElement("br")]);

    return leaf;
}

// /** Rebuilds `toNormalize` after Backspace through the Backspace mapper passes. */
// export function normalizeBackspaceNew(contentEditable: HTMLElement,
//                                       toNormalize: DocumentFragment,
//                                       cursorPosition: CursorPosition,
//                                       isWholeBlockSelected?: boolean): CollapsedLeaves {
//     const context: BackspaceContext = {
//         contentEditable,
//         cursorPosition,
//         isWholeBlockSelected,
//         br: document.createElement("br"),
//         cursor: cursorPosition
//     };
//     const leaves = getTextNodes(toNormalize)
//         .map(textNode => toLeafWithParents(contentEditable, textNode));
//
//     // A whole-block selection can leave the fragment without any leaf, but the mapper still needs one to turn into br.
//     if (!leaves.some(leaf => leaf.getParents().at(-1) === cursorPosition.startContainer)) {
//         leaves.push(toLeafWithParents(contentEditable, cursorPosition.startContainer));
//     }
//
//     return collapseLeavesNew(
//         leaves
//             .map(leaf => backspaceFindLeafNew(leaf, context))
//             .map(leaf => backspaceSelectionNew(leaf, context))
//             .map(leaf => backspaceSelfCloseNew(leaf, context))
//             .map(leaf => backspaceCharacterNew(leaf, context))
//             .map(leaf => divideFirstLevels(leaf))
//             .map(leaf => sortLeafParents(leaf))
//             .map(leaf => removeSelfCloseInlines(leaf))
//             .map(leaf => removeConsecutiveDuplicates(leaf)),
//         context.cursor
//     );
// }

/** Collects the text nodes and the empty elements, such as an empty cell, which have no text node to stand for them. */
export function getTextNodes(element: Node, textNodes: Node[] = []) {
    if (element instanceof Text && (element.data || element === Carrier.getInstance().getCarrier())) {
        textNodes.push(element);
    }

    if (isSchemaContain(element, [Display.SelfClose])) {
        textNodes.push(element);
    }

    // A cell holding a br or an image already has a leaf inside, so only a truly empty cell stands for itself
    if (isSchemaContain(element, [Display.Cell]) && !element.textContent && !hasSelfCloseDescendant(element)) {
        textNodes.push(element);
    }

    for (const child of element.childNodes) {
        getTextNodes(child, textNodes);
    }

    return textNodes;
}

export function maybeInsertCarrier(contentEditable: HTMLElement, tags: string[], cursorPosition: CursorPosition) {
    const carrier = Carrier.getInstance();
    const firstTag = tags.at(0);
    if (firstTag && tags.length === 1 && carrier.isInsertAllowed(cursorPosition)) {
        carrier.insertCarrier(cursorPosition, firstTag);
        const carrierText = carrier.getCarrier();
        if (carrierText instanceof Text) {
            const range = new Range();
            range.selectNodeContents(getBlockElement(contentEditable, carrierText));
            const normalized = normalizeCarrierNew(contentEditable, range.extractContents(), carrierText, tags, cursorPosition);
            range.insertNode(normalized.node);
        }
        return true;
    }

    return false;
}

export function toLeafWithParents(findTill: Node, leafNode: Node, leaf: Leaf = new Leaf()) {
    if (findTill === leafNode) {
        return leaf;
    }

    let parent = leafNode.parentElement;

    leaf.unshiftParent(leafNode);
    while (parent && parent !== findTill) {
        leaf.unshiftParent(parent);
        parent = parent.parentElement;
    }

    return leaf;
}

export function filterLeafParentsNew(tagsToRemove: string[], leaf: Leaf) {
    const clearedParents = leaf.getParents().filter(parent => !tagsToRemove.includes(parent.nodeName));
    leaf.setParents(clearedParents);

    return leaf;
}

/**
 * Replaces the leaf's closest selected block with `tagsToReplace` elements. A leaf outside the selected blocks is
 * left as is.
 */
export function replaceLeafParentsNew(blocks: Node[],
                                      tagsToReplace: string[],
                                      replacements: Map<Node, HTMLElement[]>,
                                      leaf: Leaf) {
    const parents = leaf.getParents();
    // Parents go from the most distant one to the leaf itself, so the last selected one is the closest
    const blockIndex = parents.findLastIndex(parent => blocks.includes(parent));
    const block = parents[blockIndex];
    if (!block) {
        return leaf;
    }

    const {start, end} = getReplacedRange(parents, blockIndex, tagsToReplace);
    // Keyed by the block, so every list item or line becomes a block of its own
    const replacement = getReplacement(replacements, block, tagsToReplace);
    leaf.setParents([...parents.slice(0, start), ...replacement, ...parents.slice(end)]);

    return leaf;
}

/**
 * Returns the parents the replacement takes the place of: the closest wrapper of the item for a lone wrapper, the
 * item with its wrapper for anything else, or the line itself.
 */
function getReplacedRange(parents: Node[], blockIndex: number, tagsToReplace: string[]) {
    const hasWrapper = isSchemaContain(parents[blockIndex - 1], [Display.ListWrapper]);
    if (!hasWrapper) {
        return {start: blockIndex, end: blockIndex + 1};
    }

    const isWrapperOnly = tagsToReplace.length === 1 && isSchemaContainNodeName(tagsToReplace[0], [Display.ListWrapper]);
    if (isWrapperOnly) {
        return {start: blockIndex - 1, end: blockIndex};
    }

    return {start: blockIndex - 1, end: blockIndex + 1};
}

/**
 * Keeps the parents from the leaf's closest first level on when a line stands among several first levels. A line
 * can't hold or be held by another first level, while lists nested in list items stay as they are.
 */
export function divideFirstLevels(leaf: Leaf) {
    const parents = leaf.getParents();
    const firstLevels = parents.filter(parent => isSchemaContain(parent, [Display.FirstLevel]));
    const hasLine = firstLevels.some(parent => isSchemaContain(parent, [Display.Line]));
    const closest = firstLevels.at(-1);
    if (!hasLine || firstLevels.length < 2 || !closest) {
        return leaf;
    }

    leaf.setParents(parents.slice(parents.indexOf(closest)));

    return leaf;
}

/** Returns the elements standing for the source element, creating them when it's replaced for the first time. */
function getReplacement(replacements: Map<Node, HTMLElement[]>, source: Node, tagsToReplace: string[]) {
    let replacement = replacements.get(source);
    if (!replacement) {
        replacement = tagsToReplace.map(tag => document.createElement(tag));
        replacements.set(source, replacement);
    }

    return replacement;
}

/** Drops the inline tags around a self-closing leaf such as an image or a br, since it holds nothing inline to tag. */
export function removeSelfCloseInlines(leaf: Leaf) {
    const parents = leaf.getParents();

    // The last parent is the leaf itself
    const leafNode = leaf.getNode();
    const isSelfClose = isSchemaContain(leafNode, [Display.SelfClose]);
    if (!isSelfClose) {
        return leaf;
    }

    const parentsWithoutInlines = parents.filter(parent =>
        !isSchemaContain(parent, [Display.Collapse, Display.Link]) ||
        isSchemaContain(parent, [Display.ListWrapper]));
    leaf.setParents(parentsWithoutInlines);

    return leaf;
}

interface EndpointState {
    readonly startLeaf: Node;
    readonly endLeaf: Node;
    start?: LeafPosition;
    end?: LeafPosition;
}

/**
 * Rebuilds the leaves into the markup they were written in and maps the cursor endpoints through the
 * rebuild. A leaf keeps its identity unless it is merged into the text before it, where its position
 * becomes that text plus the length it had before the merge.
 */
export function collapseLeavesNew(leaves: Leaf[],
                                  cursorPosition: CursorPosition,
                                  container: Node = document.createDocumentFragment()): CollapsedLeaves {
    const state: EndpointState = {
        startLeaf: cursorPosition.startContainer,
        endLeaf: cursorPosition.endContainer
    };
    const node = collapseLeafGroups(leaves, container, state);

    return {
        node,
        start: applyCursorOffset(state.start, cursorPosition.startContainer, cursorPosition.startOffset),
        end: applyCursorOffset(state.end, cursorPosition.endContainer, cursorPosition.endOffset)
    };
}

/** Adds the cursor's own offset when its endpoint is text; a self-close leaf or cell stands at offset zero. */
function applyCursorOffset(position: LeafPosition | undefined, container: Node, offset: number) {
    if (!position || container.nodeType !== Node.TEXT_NODE) {
        return position;
    }

    return {node: position.node, offset: position.offset + offset};
}

function collapseLeafGroups(leaves: Leaf[], container: Node, state: EndpointState): Node {
    const parent = getSameFirstParent(leaves);

    for (const leafGroup of parent) {
        let firstParentElement = shiftFirstParent(leafGroup.leaves);
        firstParentElement = clearNode(firstParentElement);

        if (!firstParentElement) {
            return container;
        }
        insertToContainer(container, collapseLeafGroups(leafGroup.leaves, firstParentElement, state), state);
    }

    return container;
}

function recordEndpoint(state: EndpointState, leaf: Node, node: Node, offset: number) {
    if (leaf === state.startLeaf && !state.start) {
        state.start = {node, offset};
    }
    if (leaf === state.endLeaf && !state.end) {
        state.end = {node, offset};
    }
}

/**
 * Hands back the node the leaves are collapsed into, emptied: a clone takes the node's place, so
 * the node itself is left as it stands.
 */
function clearNode(node: Node | undefined) {
    if (!node) {
        return;
    }

    if (node instanceof Text) {
        return node;
    }

    if (node instanceof HTMLElement) {
        const cleared = node.cloneNode(false) as HTMLElement;
        node.replaceWith(cleared);
        cleared.append(...node.childNodes);
        removeAttributesNew(node);
    }

    return node;
}

/** Drops every attribute but a link's href and the editor's own classes (the image block mark and sizes); any other class goes. */
function removeAttributesNew(element: HTMLElement) {
    const kept = AvailableClasses.getInstance().getClasses().filter((name) => element.classList.contains(name));
    for (const name of element.getAttributeNames()) {
        if (name === "href" || name === "src") {
            continue;
        }
        element.removeAttribute(name);
    }

    if (kept.length) {
        element.className = kept.join(" ");
    }
}

/** Returns a cursor position spanning the inserted nodes together with their neighbouring siblings, taken whole. */
export function getInvolvedCursorPosition(first: Node | undefined, last: Node | undefined) {
    if (!first || !last) {
        return;
    }

    const range = new Range();
    range.setStartBefore(getSiblingWithContent(first, node => node.previousSibling));
    range.setEndAfter(getSiblingWithContent(last, node => node.nextSibling));

    return getCursorPositionFrom(range.startContainer, range.startOffset, range.endContainer, range.endOffset);
}

/**
 * Returns the closest sibling holding content, passing over the empty text nodes and emptied tags an extraction leaves
 * where it cut. Without one, returns the farthest empty sibling or the node itself, so the rebuild still drops them.
 */
function getSiblingWithContent(node: Node, next: (node: Node) => Node | null) {
    let farthest = node;
    let sibling = next(node);

    while (sibling && !sibling.textContent) {
        farthest = sibling;
        sibling = next(sibling);
    }

    return sibling ?? farthest;
}

/**
 * Appends the collapsed content to the container it belongs in, joining it with the leaf before
 * it when both are text.
 */
function insertToContainer(container: Node, insert: Node, state: EndpointState) {
    const previousText = container.lastChild;

    if (previousText instanceof Text && insert instanceof Text) {
        recordEndpoint(state, insert, previousText, previousText.data.length);
        previousText.appendData(insert.data);
        return;
    }

    recordEndpoint(state, insert, insert, 0);
    container.appendChild(insert);
}

export function wrapInTagNew(documentFragment: DocumentFragment, tag: string, attributes?: Attributes) {
    const wrapper = document.createElement(tag);
    applyAttributes(wrapper, attributes);
    wrapper.appendChild(documentFragment);
    const documentFragmentWrappedInTag = document.createDocumentFragment();
    documentFragmentWrappedInTag.appendChild(wrapper);
    return documentFragmentWrappedInTag;
}

export function getLeafNodes(element: Node, leafNodes: Node[] = []) {
    if ((element.nodeType === Node.TEXT_NODE && element.textContent) ||
        element === Carrier.getInstance().getCarrier() ||
        isSchemaContain(element, [Display.SelfClose]) ||
        isEmptyCell(element)) {
        leafNodes.push(element);
        return leafNodes;
    }

    for (const child of element.childNodes) {
        getLeafNodes(child, leafNodes);
    }

    return leafNodes;
}

/**
 * An empty cell holds no br to stand in for content, so it's treated as its own leaf -
 * otherwise the collapse would have nothing to rebuild it from and drop it from the table.
 */
function isEmptyCell(element: Node) {
    return isSchemaContain(element, [Display.Cell]) && !element.textContent;
}

export function setLeafParents(findTill: Node, leafNode: Node, leaf: Leaf = new Leaf()) {
    const parents: HTMLElement[] = [];
    let parent = leafNode.parentElement;

    while (parent && parent !== findTill) {
        parents.unshift(parent);
        parent = parent.parentElement;
    }

    for (const add of parents) {
        leaf.addParent(add);
    }
    leaf.addParent(leafNode);

    return leaf;
}

export function sortLeafParents(toSort: Leaf) {
    const sortedParents = toSort
        .getParents()
        .map(element => ({
            element: element,
            priority: tagHierarchy.get(element.nodeName) ?? -1
        } as TagHierarchy))
        .sort((first, second) => {
            if (isSchemaContain(first.element, [Display.ListWrapper, Display.List]) && isSchemaContain(second.element, [Display.ListWrapper, Display.List])) {
                return 0;
            }
            return second.priority - first.priority
        })
        .map(item => item.element);
    toSort.setParents(sortedParents);

    return toSort;
}

export function collapseLeaves(leaves: Leaf[],
                               container: DocumentFragment = nodeToFragment(document.createElement("div"))): DocumentFragment {
    const parent = getSameFirstParent(leaves);

    for (const leafGroup of parent) {
        let firstParentElement = shiftFirstParent(leafGroup.leaves);
        firstParentElement = clearElementHTML(firstParentElement);

        if (!firstParentElement) {
            return container;
        }
        insertAfterLastChild(container, collapseLeaves(leafGroup.leaves, nodeToFragment(firstParentElement)));
    }

    return container;
}

export function getSameFirstParent(leaves: Leaf[]): LeafGroup[] {
    const sameConsecutive: LeafGroup[] = [];
    let leafGroup: LeafGroup = {leaves: []};

    if (leaves.length === 1) {
        leafGroup.leaves = leaves;
        return [leafGroup];
    }

    for (let i = 0; i < leaves.length; i++) {
        const leaf = leaves[i];
        const nextLeaf = leaves[i + 1];

        if (leaf) {
            leafGroup.leaves.push(leaf);
        }

        if (!willElementsMerge(leaf?.getParents()[0], nextLeaf?.getParents()[0])) {
            sameConsecutive.push(leafGroup);
            leafGroup = {leaves: []};
        }
    }

    return sameConsecutive;
}

function willElementsMerge(element: Node | undefined, compareTo: Node | undefined) {
    if (!element && !compareTo) {
        return true;
    }

    if (element === compareTo) {
        return true;
    }

    if (element?.nodeName === compareTo?.nodeName && isSchemaContain(element, [Display.Collapse])) {
        return true;
    }

    // Links with the same href are one link, the ones pointing elsewhere stay apart
    if (element && compareTo && isSchemaContain(element, [Display.Link]) &&
        element.cloneNode(false).isEqualNode(compareTo.cloneNode(false))) {
        return true;
    }


    return false;
}

export function filterLeafParents(element: Node, tagsToRemove: string[], leaf: Leaf) {
    const leafParents = leaf.getParents();

    if (leafParents.includes(element)) {
        leaf.setParents(leaf.getParents().filter(parent => !tagsToRemove.includes(parent.nodeName)));
    }

    return leaf;
}

export function replaceLeafParents(element: Node, replaceToElement: HTMLElement[], replaceFrom: string[], leaf: Leaf, isClosest = false) {
    if (leaf.getParents() && leaf.getParents().includes(element)) {
        const parents = leaf.getParents()
            .flatMap(parent => {
                if (isClosest && !Array.from(parent.childNodes).some(child => child === element)) {
                    return parent;
                }

                if (replaceFrom.includes(parent.nodeName)) {
                    return replaceToElement;
                }

                return parent;
            });
        leaf.setParents(parents);
    }

    return leaf;
}

export function extractFirstLevel(leaf: Leaf): Leaf {
    const parents = leaf.getParents();
    const innermost = parents
        .map((parent, index) => isBlockFirstLevel(parent) ? index : -1)
        .reduce((last, index) => index > last ? index : last, -1);

    if (innermost < 0) {
        return leaf;
    }

    const result = parents.filter((parent, index) =>
        index >= innermost || !isContainer(parent));
    leaf.setParents(result);

    return leaf;
}

function isBlockFirstLevel(node: Node) {
    return isSchemaContain(node, [Display.FirstLevel]) &&
        !isSchemaContain(node, [Display.ListWrapper]);
}

function isContainer(node: Node) {
    return isSchemaContain(node, [Display.FirstLevel, Display.List]);
}

export function removeConsecutiveDuplicates(leaf: Leaf): Leaf {
    const parents = leaf.getParents();

    if (parents.length === 0) {
        return leaf;
    }

    const result: Node[] = [];

    for (let i = 0; i <= parents.length; i++) {
        const parent = parents[i];
        const nextParent = parents[i + 1];

        if (!parent) {
            continue;
        }

        if (i === 0 && !hasDuplicateList(parent)) {
            result.push(parent);
        }
        if (!nextParent) {
            continue;
        }

        if (hasDuplicateList(nextParent)) {
            continue;
        }
        if (isSchemaContain(nextParent, [Display.ListWrapper])) {
            result.push(nextParent);
            continue;
        }
        if (parent.nodeName !== nextParent.nodeName) {
            result.push(nextParent);
        }
    }

    leaf.setParents(result);

    return leaf;
}

/**
 * Re-anchors a cursor endpoint resting on an element (rather than a leaf) onto the leaf its
 * offset points at - typically the br of an empty block, the very node the browser anchors
 * on once that block is typed into.
 *
 * @remarks
 * Only leaves keep their identity through a collapse (every parent is cloned), so an
 * element-anchored cursor wouldn't survive one, and no character offset can name a br
 * directly since it holds no text. An element with no leaves at all is left untouched.
 */
export function anchorCursorOnLeaf(cursor: CursorPosition): CursorPosition {
    const start = anchorContainerOnLeaf(cursor.startContainer, cursor.startOffset);
    const end = anchorContainerOnLeaf(cursor.endContainer, cursor.endOffset);

    if (start.container === cursor.startContainer && end.container === cursor.endContainer) {
        return cursor;
    }

    return getCursorPositionFrom(start.container, start.offset, end.container, end.offset);
}

function anchorContainerOnLeaf(container: Node, offset: number) {
    if (container.nodeType !== Node.ELEMENT_NODE) {
        return {container: container, offset: offset};
    }

    const leafNodes = getLeafNodes(container);
    const child = container.childNodes[offset];
    // An offset standing before a list nested in an item is the end of the item's own line,
    // not the start of the nested item's: the cursor belongs at the end of the leaf before it.
    if (child && isSchemaContain(child, [Display.ListWrapper])) {
        const lineEnd = leafNodes.filter(leaf => leaf.compareDocumentPosition(child) & Node.DOCUMENT_POSITION_FOLLOWING).pop();
        if (lineEnd) {
            return {container: lineEnd, offset: lineEnd.textContent?.length ?? 0};
        }
    }

    const following = child && leafNodes.find(leaf => leaf === child || child.contains(leaf));
    if (following) {
        return {container: following, offset: 0};
    }

    // The offset points past the last child, so the cursor belongs at the end of the last leaf.
    const preceding = leafNodes[leafNodes.length - 1];
    if (!preceding) {
        return {container: container, offset: offset};
    }

    return {container: preceding, offset: preceding.textContent?.length ?? 0};
}

export function maybeAppendCarrier(documentFragment: DocumentFragment) {
    if (!documentFragment.textContent && Carrier.getInstance().isCursorCollapsed()) {
        const carrier = document.createTextNode("");
        Carrier.getInstance().setCarrier(carrier);
        documentFragment.appendChild(carrier);
    }
}

function hasDuplicateList(node: Node | undefined) {
    if (!node) {
        return false;
    }

    if (isSchemaContain(node, [Display.List])) {
        if (isSchemaContain(node.firstChild, [Display.ListWrapper])) {
            return true;
        }
    }

    if (isSchemaContain(node, [Display.ListWrapper])) {
        const li = (node as HTMLElement).querySelectorAll("li")[0];
        if (li && isSchemaContain(li.firstChild, [Display.ListWrapper])) {
            return true;
        }
    }

    return false;
}

export function nodeToFragment(node: Node) {
    const fragment = new DocumentFragment();
    fragment.appendChild(node);
    return fragment;
}

function insertAfterLastChild(container: DocumentFragment, insertElement: DocumentFragment) {
    const containerChild = container.lastChild;
    const insertNode = insertElement.firstChild;

    if (!containerChild || !insertNode) {
        return;
    }

    const previousText = asText(containerChild.lastChild);
    const insertText = asText(insertNode);

    // Two text leaves combine into one node - the whole of what the insert had to give.
    if (previousText && insertText) {
        mergeText(previousText, insertText);
        return;
    }

    if (insertElement.textContent || hasSelfCloseDescendant(insertElement) || holdsCarrier(insertElement) ||
        holdsCell(insertElement)) {
        containerChild.appendChild(insertElement);
    }
}

/** Whether an empty cell is kept in the fragment, so its table isn't thrown away for holding no text. */
function holdsCell(fragment: DocumentFragment) {
    return !!fragment.querySelector("th, td");
}

function asText(node: Node | null): Text | null {
    return node && node.nodeType === Node.TEXT_NODE ? node as Text : null;
}

function holdsCarrier(insertElement: DocumentFragment) {
    return Carrier.getInstance().isCarrierExist() && insertElement.contains(Carrier.getInstance().getCarrier());
}

/**
 * Merges two adjacent text leaves. When both carry text, a fresh node replaces the original
 * rather than appending in place - appending while detached is a change the history
 * MutationObserver can't see, which would lose the leaf's pre-merge text on undo. When one
 * side is empty the append only touches an empty node and is safe to do in place, which
 * matters for the carrier: it's such a node, and the one leaf a cursor is restored onto by name.
 */
function mergeText(previousText: Text, insertText: Text) {
    if (previousText.length > 0 && insertText.length > 0) {
        previousText.replaceWith(document.createTextNode(previousText.data + insertText.data));
        return;
    }

    previousText.appendData(insertText.data);
}

/**
 * Shifts the leaves' first parent off. A parent an earlier group already holds is handed out as an empty clone,
 * so the node itself stays with the first group.
 */
function shiftFirstParent(leaves: Leaf[]) {
    return leaves.map(leaf => leaf.getParents().shift())[0];
}

function clearElementHTML(node: Node | undefined) {
    if (!node) {
        return;
    }

    // An empty cell is a leaf and keeps its identity through the rebuild, so a cursor sitting
    // on it stays connected; a non-empty cell is only ever a parent here and is cloned below.
    if (node.nodeType === Node.TEXT_NODE || isSchemaContain(node, [Display.SelfClose]) || isEmptyCell(node)) {
        return node;
    }

    const cloned = node.cloneNode(false) as HTMLElement;
    removeAttributes(cloned);

    return cloned;
}

/** Drops every attribute but a link's href and the editor's own classes (the image block mark and sizes); any other class goes. */
function removeAttributes(element: HTMLElement) {
    const kept = [imageBlockClass, ...imageSizeClasses].filter((name) => element.classList.contains(name));
    for (const name of element.getAttributeNames()) {
        if (name === "href" || name === "src") {
            continue;
        }
        element.removeAttribute(name);
    }

    if (kept.length) {
        element.className = kept.join(" ");
    }
}

