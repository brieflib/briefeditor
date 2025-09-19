export class Leaf {
    constructor(text: string | null, parent: string[] = []) {
        this.text = text;
        this.parents = parent;
    }

    text: string | null;
    parents: string[];
}