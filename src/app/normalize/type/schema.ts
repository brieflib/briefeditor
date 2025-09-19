export enum Display {
    SelfClose = "SelfClose",
}

const schema: Map<string, Display[]> = new Map<string, Display[]>();
schema.set("BR", [Display.SelfClose]);
schema.set("IMG", [Display.SelfClose]);

export default function getSchema(tag: string) {
    return schema.get(tag) ?? [];
};