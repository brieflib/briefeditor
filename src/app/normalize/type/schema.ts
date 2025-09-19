export enum Display {
    SelfClose = "SelfClose",
    NotCollapse = "NotCollapse",
}

const schema: Map<string, Display[]> = new Map<string, Display[]>();
schema.set("BR", [Display.SelfClose]);
schema.set("IMG", [Display.SelfClose]);
schema.set("A", [Display.NotCollapse]);

export function isSchemaContain(element: Node, contains: Display[]) {
    const display = schema.get(element.nodeName) ?? [];
    return display.some(element => contains.includes(element));
}