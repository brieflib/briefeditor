import "@/component/editor/asset/reset.css";
import "@/component/editor/asset/global.css";
import "@/component/editor/editor-layout";
import EditorLayout from "@/component/editor/editor-layout";
import Toolbar from "@/component/toolbar/toolbar";

export default class Editor {
    constructor(contentEditable: HTMLElement) {
        const editorLayout = document.createElement("editor-layout") as EditorLayout;
        editorLayout.init(contentEditable);
        new Toolbar(contentEditable, editorLayout);
    }
}