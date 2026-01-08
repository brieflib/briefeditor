import {getSelectedBlock} from "@/core/selection/selection";

export function deleteCommand(contentEditable: HTMLElement) {
    const block = getSelectedBlock(contentEditable)[0];
    if (!block) {
        return;
    }
    const next = block.nextElementSibling;
    if (!next) {
        return;
    }

    while (next.firstChild) {
        block.appendChild(next.firstChild);
    }

    next.remove();
    block.normalize();
}