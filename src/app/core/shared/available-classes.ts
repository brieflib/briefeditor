export class AvailableClasses {
    private static instance: AvailableClasses | null = null;
    private classes: string[];

    private constructor() {
        this.classes = [];
    }

    public static getInstance(): AvailableClasses {
        if (!AvailableClasses.instance) {
            AvailableClasses.instance = new AvailableClasses();
        }
        return AvailableClasses.instance;
    }

    public getClasses() {
        return this.classes;
    }

    public setClasses(classes: string[]) {
        this.classes = classes;
    }
}