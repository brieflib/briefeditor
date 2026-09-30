// eslint-disable-next-line @typescript-eslint/no-extraneous-class
import {
    CursorPosition,
    getCursorPositionFrom,
    insertNode,
    isCollapsed,
    setCursorPosition
} from "@/core/shared/type/cursor-position";
import {Display, isSchemaContain} from "@/core/normalize/type/schema";

export class Carrier {
    private static instance: Carrier | null = null;
    private carrier: Text | null;
    private cursorCollapsed: boolean | null;

    private constructor() {
        this.carrier = null;
        this.cursorCollapsed = null;
    }

    public static getInstance(): Carrier {
        if (!Carrier.instance) {
            Carrier.instance = new Carrier();
        }
        return Carrier.instance;
    }

    public getCarrier() {
        return this.carrier;
    }

    public setCarrier(carrier: Text) {
        setCursorPosition(getCursorPositionFrom(carrier, 0, carrier, 0));
        this.carrier = carrier;
    }

    public isCarrierExist() {
        return !!this.carrier;
    }

    public removeCarrier(event?: Event) {
        event?.preventDefault();
        this.carrier = null;
        this.cursorCollapsed = null;
    }

    public setCursorCollapsed(cursorCollapsed: boolean) {
        this.cursorCollapsed = cursorCollapsed;
    }

    public isCursorCollapsed() {
        return this.cursorCollapsed;
    }

    public insertCarrier(cursorPosition: CursorPosition, tag: string) {
        if (!isCollapsed(cursorPosition)) {
            return;
        }

        const container = cursorPosition.startContainer;
        const carrier = document.createElement(tag);
        const carrierText = document.createTextNode("");
        carrier.appendChild(carrierText);
        this.setCarrier(carrierText);
        if (isSchemaContain(container, [Display.SelfClose])) {
            const br = container as HTMLElement;
            br.before(carrier);
            return;
        }

        insertNode(cursorPosition, carrier);
    }

    /** Checks that the cursor is collapsed on a text node or on a self-closing element such as a br. */
    public isInsertAllowed(cursorPosition: CursorPosition) {
        if (!this.isCursorCollapsed() || !isCollapsed(cursorPosition)) {
            return false;
        }

        const container = cursorPosition.startContainer;
        return container instanceof Text || isSchemaContain(container, [Display.SelfClose]);
    }
}