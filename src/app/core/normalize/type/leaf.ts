export class Leaf {
    constructor(parent: Node[] = []) {
        this.parents = parent;
    }

    private parents: Node[];

    public addParent(parent: Node) {
        this.parents.push(parent);
    }

    public getParents() {
        return this.parents;
    }

    public setParents(parents: Node[]) {
        this.parents = parents;
    }
}

export interface LeafGroup {
    leaves: Leaf[]
}