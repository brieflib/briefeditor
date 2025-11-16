export enum Display {
    SelfClose = "SelfClose",
    Collapse = "Collapse",
    FirstLevel = "FirstLevel",
    List = "List",
    ListWrapper = "ListWrapper",
    Nested = "Nested",
}

const schema: Map<string, Display[]> = new Map<string, Display[]>();
schema.set("BR", [Display.SelfClose]);
schema.set("IMG", [Display.SelfClose]);

schema.set("LI", [Display.List]);

schema.set("UL", [Display.FirstLevel, Display.ListWrapper, Display.Nested, Display.Collapse]);
schema.set("OL", [Display.FirstLevel, Display.ListWrapper, Display.Nested, Display.Collapse]);

schema.set("DIV", [Display.FirstLevel]);
schema.set("P", [Display.FirstLevel]);
schema.set("H1", [Display.FirstLevel]);
schema.set("H2", [Display.FirstLevel]);
schema.set("H3", [Display.FirstLevel]);
schema.set("H4", [Display.FirstLevel]);
schema.set("H5", [Display.FirstLevel]);
schema.set("H6", [Display.FirstLevel]);
schema.set("BLOCKQUOTE", [Display.FirstLevel]);

schema.set("STRONG", [Display.Collapse]);
schema.set("EM", [Display.Collapse]);
schema.set("U", [Display.Collapse]);

schema.set("A", []);
schema.set("#text", []);

export function isSchemaContain(element: Node | undefined, contains: Display[]) {
    if (!element) {
        return false;
    }
    const display = schema.get(element.nodeName) ?? [];
    return display.some(nodeName => contains.includes(nodeName));
}

export function isSchemaContainNodeName(nodeName: string | undefined, contains: Display[]) {
    if (!nodeName) {
        return false;
    }
    const display = schema.get(nodeName) ?? [];
    return display.some(nodeName => contains.includes(nodeName));
}

export function getOfType(displays: Display[]): string[] {
    const tags = [];
    for (const [key, values] of schema) {
        if (values.some(item => displays.includes(item))) {
            tags.push(key);
        }
    }
    return tags;
}