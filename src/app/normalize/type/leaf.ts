export class Leaf {
    constructor(text: string | null | undefined, parent: HTMLElement[] = []) {
        this.text = text;
        this.parents = parent;
    }

    text: string | null | undefined;
    parents: HTMLElement[];

    public addParent(parent: Node) {
        this.parents.push(parent.cloneNode(false) as HTMLElement);
    }
}