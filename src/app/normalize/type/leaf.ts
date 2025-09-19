export class Leaf {
    constructor(text: string | null | undefined, parent: string[] = []) {
        this.text = text;
        this.parents = parent;
    }

    text: string | null | undefined;
    parents: string[];
}