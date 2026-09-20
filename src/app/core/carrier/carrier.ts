// eslint-disable-next-line @typescript-eslint/no-extraneous-class
import {CursorPosition, insertNode, isCollapsed} from "@/core/shared/type/cursor-position";
import {Display, isSchemaContain} from "@/core/normalize/type/schema";

export class Carrier {
    private static carrier: Text | null;
    private static cursorCollapsed: boolean | null;

    static setCarrier(carrier: Text) {
        Carrier.carrier = carrier;
    }

    static getCarrier() {
        return Carrier.carrier;
    }

    static isCarrierExist() {
        return !!Carrier.carrier;
    }

    static removeCarrier() {
        Carrier.carrier = null;
        Carrier.cursorCollapsed = null;
    }

    static setCursorCollapsed(cursorCollapsed: boolean) {
        Carrier.cursorCollapsed = cursorCollapsed;
    }

    static isCursorCollapsed() {
        return Carrier.cursorCollapsed;
    }
}

export function insertCarrier(cursorPosition: CursorPosition, tag: string) {
    if (!isCollapsed(cursorPosition)) {
        return;
    }

    const container = cursorPosition.startContainer;
    const carrier = document.createElement(tag);
    if (isSchemaContain(container, [Display.SelfClose])) {
        const br = container as HTMLElement;
        br.before(carrier);
        return;
    }

    insertNode(cursorPosition, carrier);
}