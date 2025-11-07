import "/asset/reset.css";
import "/asset/global.css";
import Editor from "@/component/editor/editor";
import Toolbar from "@/component/toolbar/toolbar";

export default class BriefEditor {
    constructor(contentEditable: HTMLElement) {
        const editor = new Editor(contentEditable);
        new Toolbar(contentEditable, editor);

        this.cleanElementWhitespace(contentEditable);
    }

    private cleanElementWhitespace(element) {
        Array.from(element.childNodes).forEach(node => {
            if (node.nodeType === Node.TEXT_NODE &&
                node.textContent.trim() === '') {
                node.remove();
            }
        });

        element.querySelectorAll("*").forEach(child => {
            this.cleanElementWhitespace(child);
        });
    }
}