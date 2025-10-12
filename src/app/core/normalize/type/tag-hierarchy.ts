export interface TagHierarchy {
    element: HTMLElement,
    name: string,
    priority: number
}

const max = Number.MAX_SAFE_INTEGER;

const tagHierarchy: Map<string, number> = new Map<string, number>();
tagHierarchy.set("UL", 3);
tagHierarchy.set("LI", 2);
tagHierarchy.set("STRONG", 1);
tagHierarchy.set("EM", 0);

export default tagHierarchy;