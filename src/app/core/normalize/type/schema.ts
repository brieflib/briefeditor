export enum Display {
    SelfClose = "SelfClose",
    NotCollapse = "NotCollapse",
    Collapse = "Collapse",
    FirstLevel = "FirstLevel",
    List = "List",
}

const schema: Map<string, Display[]> = new Map<string, Display[]>();
schema.set("BR", [Display.SelfClose]);
schema.set("IMG", [Display.SelfClose]);

schema.set("A", [Display.NotCollapse]);

schema.set("LI", [Display.List]);

schema.set("UL", [Display.FirstLevel, Display.List, Display.Collapse]);
schema.set("DIV", [Display.FirstLevel]);
schema.set("P", [Display.FirstLevel]);
schema.set("H1", [Display.FirstLevel]);
schema.set("H2", [Display.FirstLevel]);
schema.set("H3", [Display.FirstLevel]);
schema.set("H4", [Display.FirstLevel]);
schema.set("H5", [Display.FirstLevel]);
schema.set("H6", [Display.FirstLevel]);
schema.set("BLOCKQUOTE", [Display.FirstLevel]);

schema.set("EM", [Display.Collapse]);
schema.set("STRONG", [Display.Collapse]);
schema.set("U", [Display.Collapse]);

export function isSchemaContain(element: Node | undefined, contains: Display[]) {
    if (!element) {
        return false;
    }
    const display = schema.get(element.nodeName) ?? [];
    return display.some(element => contains.includes(element));
}

export function getOfType(displays: Display[]): string[] {
    let tags = [];
    for (let [key, values] of schema) {
        if (values.some(item => displays.includes(item))) {
            tags.push(key);
        }
    }
    return tags;
}