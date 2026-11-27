import {Display, isSchemaContain} from "@/core/normalize/type/schema";

export class Leaf {
    constructor(parent: Node[] = []) {
        this.parents = parent;
    }

    private parents: Node[];

    public addParent(parent: Node) {
        this.parents.push(parent);
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

    /** The node the leaf stands for, which is the last of its parents. */
    public getNode() {
        return this.parents.at(-1);
    }

    /** Replaces the node the leaf stands for, keeping the tags that stood above it. */
    public replaceNode(node: Node) {
        this.parents[this.parents.length - 1] = node;
    }

    public getFirstLine() {
        return this.parents
            .filter(parent => isSchemaContain(parent, [Display.List, Display.FirstLevel]))
            .at(-1);
    }

    public hasContent() {
        const line = this.getFirstLine();
        if (!(line instanceof HTMLElement)) {
            return false;
        }

        return !!line.textContent || line.querySelectorAll("br").length > 1;
    }

    /** Whether the leaf node itself holds content, before it is placed back into the DOM. */
    public hasNodeContent() {
        const node = this.getNode();
        if (node instanceof Text) {
            return !!node.data;
        }

        return isSchemaContain(node, [Display.SelfClose, Display.Cell]);
    }
}

export interface LeafGroup {
    leaves: Leaf[]
}
