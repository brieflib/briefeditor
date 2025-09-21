import editorLayoutCss from "@/layout/css/editor-layout.css?inline=true";
import ToolbarItem from "@/layout/toolbar-item";
import {setCss} from "@/layout/util/util";

class EditorLayout extends HTMLElement {
    constructor(contentEditable: HTMLElement) {
        super();
        const shadowRoot = this.attachShadow({mode: 'open'});
        setCss(shadowRoot, editorLayoutCss);
        this.shadowRoot.innerHTML = `
          <div class="content-editable-flex">
            <div class="content-editable-container">
                <div class="content-editable-toolbar" id="toolbar"></div>
                <div class="content-editable-scroll" id="content"></div>
            </div>
          </div>
        `;

        contentEditable.className = "content-editable";
        this.shadowRoot.getElementById("content").appendChild(contentEditable);
        document.body.appendChild(this);
    }

    addToolbarItem(toolbarItem: ToolbarItem) {
        this.shadowRoot.getElementById("toolbar").appendChild(toolbarItem);
    }
}

customElements.define("editor-layout", EditorLayout);

export default EditorLayout;