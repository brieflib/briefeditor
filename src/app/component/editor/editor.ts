import "@/component/editor/asset/editor.css"

class Editor extends HTMLElement {
    constructor(contentEditable: HTMLElement, hasToolbar?: boolean) {
        super();

        this.innerHTML = `
          <div class="be-background"></div>
          <div class="be-content-editable">
            <div class="be-content-editable-container">
              <div class="be-content-editable-toolbar" id="be-toolbar"></div>
              <div class="be-content-editable-scroll" id="be-content"></div>
            </div>
          </div>
        `;

        contentEditable.after(this);
        contentEditable.className = "be-editor";
        contentEditable.setAttribute("contenteditable", "true");
        document.getElementById("be-content")?.appendChild(contentEditable);
        if (!hasToolbar) {
            document.getElementById("be-toolbar")?.remove();
        }
        contentEditable.focus();
    }

    addToolbarItem(toolbar: HTMLElement) {
        document.getElementById("be-toolbar")?.appendChild(toolbar);
    }
}

customElements.define("be-editor-layout", Editor);

export default Editor;