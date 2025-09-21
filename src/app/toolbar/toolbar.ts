import EditorLayout from "@/layout/editor-layout";
import ToolbarItem from "@/layout/toolbar-item";
import execCommand from "@/command/exec-command";
import {Action} from "@/command/type/command";

class Toolbar {
    private contentEditable: HTMLElement;
    private editorLayout: EditorLayout;

    constructor(contentEditable: HTMLElement, editorLayout: EditorLayout) {
        this.contentEditable = contentEditable;
        this.editorLayout = editorLayout;

        this.addToolbarItems();
    }

    private addToolbarItems() {
        const strongItem = new ToolbarItem();
        strongItem.setItem("strong", () => execCommand({tag: "strong", action: Action.Tag}, this.contentEditable));
        this.editorLayout.addToolbarItem(strongItem);
    }
}

export default Toolbar;