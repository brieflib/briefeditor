import "/asset/css/reset.css";
import "/asset/css/global.css";
import "@/layout/editor-layout"
import EditorLayout from "@/layout/editor-layout";
import Toolbar from "@/toolbar/toolbar";

class Editor {
    constructor(contentEditable: HTMLElement) {
        const editorLayout = new EditorLayout(contentEditable);
        new Toolbar(contentEditable, editorLayout);
    }
}

export default Editor;