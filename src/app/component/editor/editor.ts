import "@/component/editor/asset/editor.css"

class Editor extends HTMLElement {
    constructor(contentEditable: HTMLElement) {
        super();

        this.innerHTML = `
          <div class="bf-background"></div>
          <div class="bf-content-editable-flex">
            <div class="bf-content-editable-container">
                <div class="bf-content-editable-toolbar" id="toolbar"></div>
                <div class="bf-content-editable-scroll" id="content"></div>
            </div>
          </div>
        `;

        contentEditable.after(this);
        contentEditable.className = "bf-editor";
        contentEditable.setAttribute("contenteditable", "true");
        document.getElementById("content").appendChild(contentEditable);
    }

    addToolbarItem(toolbar: HTMLElement) {
        document.getElementById("toolbar").appendChild(toolbar);
    }
}

customElements.define("editor-layout", Editor);

export default Editor;