import EditorLayout from "@/layout/editor-layout";
import ToolbarItem from "@/layout/toolbar-item";
import execCommand from "@/command/exec-command";
import {Action} from "@/command/type/command";
import {getSharedTags} from "@/shared/selected-tags-util";

class Toolbar {
    private contentEditable: HTMLElement;
    private editorLayout: EditorLayout;
    private items: Map<string, ToolbarItem> = new Map<string, ToolbarItem>;

    constructor(contentEditable: HTMLElement, editorLayout: EditorLayout) {
        this.contentEditable = contentEditable;
        this.editorLayout = editorLayout;

        this.addToolbarItems();

        document.addEventListener("selectionchange", () => {
            this.items.forEach((item: ToolbarItem, key: string) => {
                item.setActive(false);
            });

            for (const tag of getSharedTags(contentEditable)) {
                const item = this.items.get(tag.toLowerCase());
                if (item) {
                    item.setActive(true);
                }
            }
        });
    }

    private addToolbarItems() {
        this.addToolbarItem("strong");
        this.addToolbarItem("em");
        this.addToolbarItem("u");
    }

    private addToolbarItem(tag: string) {
        const item = new ToolbarItem();
        item.setItem(tag, () => execCommand({tag: tag, action: Action.Tag}, this.contentEditable));
        this.items.set(tag, item);
        this.editorLayout.addToolbarItem(item);
    }
}

export default Toolbar;