import {CursorPosition} from "@/core/shared/type/cursor-position";
import {getRange} from "@/core/shared/range-util";
import {getSelectedBlock} from "@/core/selection/selection";
import {Display, isSchemaContain} from "@/core/normalize/type/schema";
import {collectTextSiblings, computeOffset, isIndexInArray, replaceWithMerged} from "@/core/cursor/util/cursor-util";
import {getFirstText, getLastText} from "@/core/shared/element-util";

export function getCursorPosition(range = getRange(), documentFragment?: DocumentFragment): CursorPosition {
    if (!documentFragment) {
        return {
            startContainer: range.startContainer,
            endContainer: range.endContainer,
            startOffset: range.startOffset,
            endOffset: range.endOffset
        };
    }
    const startNode = getFirstText(documentFragment);
    const endNode = getLastText(documentFragment);

    return {
        startContainer: startNode.textContent ? startNode : endNode,
        endContainer: endNode,
        startOffset: 0,
        endOffset: endNode.textContent?.length ?? range.endOffset
    };
}

export function getCursorPosition2(cp: CursorPosition, nodes: Node[]): CursorPosition {
    const startNode = getFirstText(nodes[0] as Node);
    const endNode = getLastText(nodes[nodes.length - 1] as Node);

    return {
        startContainer: startNode,
        endContainer: endNode,
        startOffset: 0,
        endOffset: endNode?.textContent?.length ?? cp.endOffset
    };
}

export function setCursorPosition(contentEditable: HTMLElement, cursorPosition: CursorPosition) {
    const range: Range = restoreRange(contentEditable, cursorPosition);
    const selection: Selection | null = window.getSelection();
    if (!selection) {
        return;
    }
    selection.removeAllRanges();
    selection.addRange(range);
}

export function restoreRange(contentEditable: HTMLElement, cursorPosition: CursorPosition): Range {
    const range = new Range();

    range.setStart(cursorPosition.startContainer, cursorPosition.startOffset);
    range.setEnd(cursorPosition.endContainer, cursorPosition.endOffset);

    return range;
}

export function isCursorAtEndOfBlock(contentEditable: HTMLElement, range = getRange()) {
    if (!range.collapsed) {
        return false;
    }

    const block = getSelectedBlock(contentEditable)[0];
    if (!block) {
        return false;
    }

    const endRange: Range = range.cloneRange();
    endRange.selectNodeContents(block);
    endRange.setEnd(range.endContainer, range.endOffset);

    const endOffset = endRange.toString().length;
    if (!isSchemaContain(block, [Display.List])) {
        return endOffset === block.textContent.length;
    }

    const blockWithoutListWrappers = block.cloneNode(true) as HTMLElement;
    const nestedListWrappers = blockWithoutListWrappers.querySelectorAll("ul, ol");
    nestedListWrappers.forEach(listWrapper => {
        listWrapper.remove();
    });
    const elementLength = blockWithoutListWrappers.textContent.length;

    return endOffset === elementLength;
}

export function isCursorAtStartOfBlock(contentEditable: HTMLElement, range = getRange()) {
    if (!range.collapsed) {
        return false;
    }

    const block = getSelectedBlock(contentEditable)[0];
    if (!block) {
        return false;
    }

    const startRange: Range = range.cloneRange();
    startRange.selectNodeContents(block);
    startRange.setStart(range.startContainer, range.startOffset);

    const endRange: Range = range.cloneRange();
    endRange.selectNodeContents(block);
    endRange.setEnd(range.endContainer, range.endOffset);

    return endRange.toString().length === 0;
}

export function isCursorIntersectBlocks(contentEditable: HTMLElement, range = getRange()) {
    if (range.collapsed) {
        return false;
    }

    return getSelectedBlock(contentEditable).length > 1;
}

export function mergeSiblingTextNodes(cursorPosition: CursorPosition): CursorPosition {
    let {startContainer, endContainer, startOffset, endOffset} = cursorPosition;

    if (startContainer.nodeType !== Node.TEXT_NODE || endContainer.nodeType !== Node.TEXT_NODE) {
        return cursorPosition;
    }

    const startSiblings = collectTextSiblings(startContainer);
    const startIndex = startSiblings.indexOf(startContainer);
    const endIndex = startSiblings.indexOf(endContainer);

    startOffset = computeOffset(startSiblings, startIndex, startOffset);
    startContainer = replaceWithMerged(startSiblings);
    if (isIndexInArray(endIndex)) {
        endOffset = computeOffset(startSiblings, endIndex, endOffset);
        endContainer = startContainer;
    }

    if (!isIndexInArray(endIndex)) {
        const endSiblings = collectTextSiblings(endContainer);
        const endIndex = endSiblings.indexOf(endContainer);

        endOffset = computeOffset(endSiblings, endIndex, endOffset);
        endContainer = replaceWithMerged(endSiblings);
    }

    return {...cursorPosition, startContainer, startOffset, endContainer, endOffset};
}