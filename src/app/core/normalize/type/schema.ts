export enum Display {
    SelfClose = "SelfClose",
    Collapse = "Collapse",
    FirstLevel = "FirstLevel",
    List = "List",
    Link = "Link",
    ListWrapper = "ListWrapper",
    Image = "Image",
    Table = "Table",
    TableSection = "TableSection",
    Cell = "Cell",
    Line = "Line",
}

const schema: Map<string, Display[]> = new Map<string, Display[]>();
schema.set("BR", [Display.SelfClose]);
schema.set("IMG", [Display.SelfClose, Display.Image]);

schema.set("LI", [Display.List]);

schema.set("UL", [Display.FirstLevel, Display.ListWrapper, Display.Collapse]);
schema.set("OL", [Display.FirstLevel, Display.ListWrapper, Display.Collapse]);

// A line is a block that holds words of a single line: a paste rewrites one into the shape of the line
// it is dropped on, unlike a list or a table.
schema.set("P", [Display.FirstLevel, Display.Line]);
schema.set("H1", [Display.FirstLevel, Display.Line]);
schema.set("H2", [Display.FirstLevel, Display.Line]);
schema.set("H3", [Display.FirstLevel, Display.Line]);
schema.set("H4", [Display.FirstLevel, Display.Line]);
schema.set("H5", [Display.FirstLevel, Display.Line]);
schema.set("H6", [Display.FirstLevel, Display.Line]);
schema.set("BLOCKQUOTE", [Display.FirstLevel, Display.Line]);

// Cells carry a display of their own and none of the block ones: they must not read as blocks, so that a
// cursor inside one is not mistaken for a cursor in a first level element.
schema.set("TABLE", [Display.Table]);
schema.set("THEAD", [Display.TableSection]);
schema.set("TBODY", [Display.TableSection]);
schema.set("TFOOT", [Display.TableSection]);
schema.set("TR", [Display.TableSection]);
schema.set("TH", [Display.Cell]);
schema.set("TD", [Display.Cell]);

schema.set("STRONG", [Display.Collapse]);
schema.set("EM", [Display.Collapse]);
schema.set("U", [Display.Collapse]);
schema.set("SUP", [Display.Collapse]);
schema.set("SUB", [Display.Collapse]);

schema.set("A", [Display.Link]);
schema.set("#text", []);

export function isSchemaContain(element: Node | undefined | null, contains: Display[]) {
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