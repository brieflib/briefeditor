import Editor from "@/component/editor/editor";
import ToolbarItem from "@/component/toolbar-item/toolbar-item";
import execCommand from "@/core/command/exec-command";
import {Action} from "@/core/command/type/command";
import {getSharedTags} from "@/core/selection/selection";

export default class Toolbar {
    private contentEditable: HTMLElement;
    private editorLayout: Editor;
    private items: Map<string, ToolbarItem> = new Map<string, ToolbarItem>;

    constructor(contentEditable: HTMLElement, editor: Editor) {
        this.contentEditable = contentEditable;
        this.editorLayout = editor;

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