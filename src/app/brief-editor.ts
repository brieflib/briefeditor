import "/asset/reset.css";
import "/asset/global.css";
import Editor from "@/component/editor/editor";
import Toolbar from "@/component/toolbar/toolbar";

export default class BriefEditor {
    constructor(contentEditable: HTMLElement) {
        const editor = new Editor(contentEditable);
        new Toolbar(contentEditable, editor);
    }
}