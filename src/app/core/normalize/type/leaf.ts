export class Leaf {
    constructor(parent: Node[] = []) {
        this.parents = parent;
    }

    private parents: Node[];

    public addParent(parent: Node) {
        this.parents.push(parent);
    }

    public addParents(parent: Node[]) {
        this.parents.push(...parent);
    }

    public unshiftParent(parent: Node) {
        this.parents.unshift(parent)
    }

    public getParents() {
        return this.parents;
    }

    public setParents(parents: Node[]) {
        this.parents = parents;
    }

    public getFirstParent(){
        return this.parents[0];
    }
}

export interface LeafGroup {
    leaves: Leaf[]
}