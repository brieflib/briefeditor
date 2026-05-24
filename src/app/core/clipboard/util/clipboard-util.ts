import {createContextualFragment, CursorPosition} from "@/core/shared/type/cursor-position";
import {normalize, removeAndNormalize} from "@/core/normalize/normalize";

export function sanitize(htmlString: string, cursorPosition: CursorPosition) {
    const fragment = createContextualFragment(htmlString, cursorPosition);
    const div = document.createElement("div");
    div.appendChild(fragment);

    return removeAndNormalize(div, div, [], cursorPosition);
}