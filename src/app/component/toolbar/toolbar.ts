import Editor from "@/component/editor/editor";
import execCommand from "@/core/command/exec-command";
import {Action} from "@/core/command/type/command";
import BoldIcon from "@/component/toolbar-icon/bold-icon";
import {getSharedTags} from "@/core/selection/selection";
import ItalicIcon from "@/component/toolbar-icon/italic-icon";
import UnderlineIcon from "@/component/toolbar-icon/underline-icon";
import HeadingIcon from "@/component/toolbar-icon/heading-icon";
import EmptyIcon from "@/component/toolbar-icon/empty-icon";

export default class Toolbar {
    private readonly contentEditable: HTMLElement;
    private editorLayout: Editor;
    private items: ToolbarIcon[] = [];

    constructor(contentEditable: HTMLElement, editor: Editor) {
        this.contentEditable = contentEditable;
        this.editorLayout = editor;

        this.addToolbarItems();

        document.addEventListener("selectionchange", () => {
            const sharedTags = getSharedTags(contentEditable);
            for (const item of this.items) {
                item.setActive(sharedTags);
            }
        });
    }

    private addToolbarItems() {
        this.addBoldItem();
        this.addItalicItem();
        this.addUnderlineItem();
        this.addEmptyItem();
        this.addHeadingItem();
    }

    private addBoldItem() {
        const item = new BoldIcon();
        item.setCallback(() => execCommand({tag: "STRONG", action: Action.Tag}, this.contentEditable));
        this.items.push(item);
        this.editorLayout.addToolbarItem(item);
    }

    private addItalicItem() {
        const item = new ItalicIcon();
        item.setCallback(() => execCommand({tag: "EM", action: Action.Tag}, this.contentEditable));
        this.items.push(item);
        this.editorLayout.addToolbarItem(item);
    }

    private addUnderlineItem() {
        const item = new UnderlineIcon();
        item.setCallback(() => execCommand({tag: "U", action: Action.Tag}, this.contentEditable));
        this.items.push(item);
        this.editorLayout.addToolbarItem(item);
    }

    private addEmptyItem() {
        const item = new EmptyIcon();
        this.editorLayout.addToolbarItem(item);
    }

    private addHeadingItem() {
        const item = new HeadingIcon();
        this.items.push(item);
        this.editorLayout.addToolbarItem(item);
    }
}