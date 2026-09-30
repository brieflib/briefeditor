import "/asset/global.css";
import Editor from "@/component/editor/editor";

export interface Settings {
    hasToolbar?: boolean
}

export default class BriefEditor {
    private editor: Editor;

    constructor(settings: Settings = {
        hasToolbar: true
    }) {
        const contentEditable = document.querySelector<HTMLElement>("#be-editor");
        if (!contentEditable) {
            throw new Error("There is no #be-editor");
        }
        this.editor = new Editor(contentEditable, settings);
    }
}