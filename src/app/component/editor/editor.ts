import "@/component/editor/asset/editor.css"

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

    addToolbarItem(toolbarIcon: ToolbarIcon) {
        document.getElementById("toolbar").appendChild(toolbarIcon);
    }
}

customElements.define("editor-layout", Editor);

export default Editor;