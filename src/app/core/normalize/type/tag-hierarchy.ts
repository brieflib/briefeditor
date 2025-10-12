export interface TagHierarchy {
    element: HTMLElement,
    name: string,
    priority: number
}

const max = Number.MAX_SAFE_INTEGER;

const tagHierarchy: Map<string, number> = new Map<string, number>();
tagHierarchy.set("TABLE", max);
tagHierarchy.set("THEAD", max);
tagHierarchy.set("TBODY", max);
tagHierarchy.set("TH", max);
tagHierarchy.set("TR", max);
tagHierarchy.set("TD", max);
tagHierarchy.set("UL", max);
tagHierarchy.set("LI", max);
tagHierarchy.set("STRONG", 1);
tagHierarchy.set("EM", 0);

export default tagHierarchy;