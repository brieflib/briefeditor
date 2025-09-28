import "@/component/editor/asset/editor.css"
import ToolbarItem from "@/component/toolbar-item/toolbar-item";

class Editor extends HTMLElement {
    constructor(contentEditable: HTMLElement) {
        super();

        this.innerHTML = `
          <div class="content-editable-flex">
            <div class="content-editable-container">
                <div class="content-editable-toolbar" id="toolbar"></div>
                <div class="content-editable-scroll" id="content"></div>
            </div>
          </div>
        `;

        contentEditable.after(this);
        contentEditable.className = "content-editable";
        document.getElementById("content").appendChild(contentEditable);
    }

    addToolbarItem(toolbarItem: ToolbarItem) {
        document.getElementById("toolbar").appendChild(toolbarItem);
    }
}

customElements.define("editor-layout", Editor);

export default Editor;