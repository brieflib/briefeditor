import "@/component/editor/asset/editor-layout.css"
import ToolbarItem from "@/component/toolbar-item/toolbar-item";

class EditorLayout extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.innerHTML = `
          <div class="content-editable-flex">
            <div class="content-editable-container">
                <div class="content-editable-toolbar" id="toolbar"></div>
                <div class="content-editable-scroll" id="content"></div>
            </div>
          </div>
        `;
    }

    init(contentEditable: HTMLElement) {
        contentEditable.after(this);
        contentEditable.className = "content-editable";
        document.getElementById("content").appendChild(contentEditable);
    }

    addToolbarItem(toolbarItem: ToolbarItem) {
        document.getElementById("toolbar").appendChild(toolbarItem);
    }
}

customElements.define("editor-layout", EditorLayout);

export default EditorLayout;