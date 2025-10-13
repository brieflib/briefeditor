import {Display, isSchemaContain} from "@/core/normalize/type/schema";

export class Leaf {
    constructor(element: Node | null = null, parent: HTMLElement[] = []) {
        this.element = element;
        this.parents = parent;
    }

    private element: Node | null;
    private parents: HTMLElement[];

    public addParent(parent: Node) {
        this.parents.push(parent as HTMLElement);
    }

    public getParents() {
        return this.parents;
    }

    public setParents(parents: HTMLElement[]) {
        this.parents = parents;
    }

    public getText() {
        return this.element?.textContent;
    }

    public setElement(element: Node | null) {
        this.element = element;
    }

    public getElement() {
        return this.element;
    }

    public isLeafPresent() {
        if (!this.element) {
            return false;
        }

        return isSchemaContain(this.element, [Display.SelfClose]) || !!this.getText();
    }
}