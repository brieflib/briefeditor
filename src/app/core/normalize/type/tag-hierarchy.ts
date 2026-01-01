export interface TagHierarchy {
    element: HTMLElement,
    name: string,
    priority: number
}

const max = Number.MAX_SAFE_INTEGER;

const tagHierarchy: Map<string, number> = new Map<string, number>();
tagHierarchy.set("DELETED", max);
tagHierarchy.set("TABLE", max);
tagHierarchy.set("THEAD", max);
tagHierarchy.set("TBODY", max);
tagHierarchy.set("TH", max);
tagHierarchy.set("TR", max);
tagHierarchy.set("TD", max);
tagHierarchy.set("UL", max);
tagHierarchy.set("OL", max);
tagHierarchy.set("LI", max);
tagHierarchy.set("DIV", max);
tagHierarchy.set("BLOCKQUOTE", max);
tagHierarchy.set("P", max);
tagHierarchy.set("H1", max);
tagHierarchy.set("H2", max);
tagHierarchy.set("H3", max);
tagHierarchy.set("H4", max);
tagHierarchy.set("H5", max);
tagHierarchy.set("H6", max);
tagHierarchy.set("A", 3);
tagHierarchy.set("STRONG", 2);
tagHierarchy.set("EM", 1);
tagHierarchy.set("U", 0);

export default tagHierarchy;