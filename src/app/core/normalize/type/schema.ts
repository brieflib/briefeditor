export enum Display {
    SelfClose = "SelfClose",
    NotCollapse = "NotCollapse",
    FirstLevel = "FirstLevel",
}

const schema: Map<string, Display[]> = new Map<string, Display[]>();
schema.set("BR", [Display.SelfClose]);
schema.set("IMG", [Display.SelfClose]);

schema.set("A", [Display.NotCollapse]);

schema.set("UL", [Display.FirstLevel]);
schema.set("LI", [Display.FirstLevel]);
schema.set("P", [Display.FirstLevel]);
schema.set("H1", [Display.FirstLevel]);
schema.set("H2", [Display.FirstLevel]);
schema.set("H3", [Display.FirstLevel]);
schema.set("H4", [Display.FirstLevel]);
schema.set("H5", [Display.FirstLevel]);
schema.set("H6", [Display.FirstLevel]);
schema.set("BLOCKQUOTE", [Display.FirstLevel]);

export function isSchemaContain(element: Node, contains: Display[]) {
    const display = schema.get(element.nodeName) ?? [];
    return display.some(element => contains.includes(element));
}

export function getOfType(display: Display): string[] {
    let tags = [];
    for (let [key, value] of schema) {
        if (value.includes(display)) {
            tags.push(key);
        }
    }
    return tags;
}