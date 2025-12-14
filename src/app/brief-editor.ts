import "/asset/global.css";
import Editor from "@/component/editor/editor";
import Toolbar from "@/component/toolbar/toolbar";

export default class BriefEditor {
    constructor() {
        const contentEditable = document.querySelector("#bf-editor");
        if (!contentEditable) {
            throw new Error("There is no #bf-editor");
        }
        const contentEditableHTML = contentEditable as HTMLElement;
        const editor = new Editor(contentEditableHTML);
        new Toolbar(contentEditableHTML, editor);

        this.cleanElementWhitespace(contentEditableHTML);
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