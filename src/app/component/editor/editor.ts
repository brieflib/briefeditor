import "@/component/editor/asset/editor.css"
import {CallbackIcon} from "@/component/toolbar-icon/type/callback-icon";
import EmptyIcon from "@/component/toolbar-icon/empty-icon";

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

    addToolbarItem(toolbarIcon: HTMLElement) {
        document.getElementById("toolbar").appendChild(toolbarIcon);
    }
}

customElements.define("editor-layout", Editor);

export default Editor;