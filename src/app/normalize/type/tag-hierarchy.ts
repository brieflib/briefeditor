export interface TagHierarchy {
    name: string,
    priority: number
}

const max = Number.MAX_SAFE_INTEGER;

const tagHierarchy: Map<string, number> = new Map();
tagHierarchy.set("UL", max);
tagHierarchy.set("LI", max);
tagHierarchy.set("STRONG", 1);
tagHierarchy.set("EM", 0);

export default tagHierarchy;