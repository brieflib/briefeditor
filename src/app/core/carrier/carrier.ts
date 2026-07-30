// eslint-disable-next-line @typescript-eslint/no-extraneous-class
import {getCursorPositionFrom} from "@/core/shared/type/cursor-position";
import {normalize} from "@/core/normalize/normalize";

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

export function removeCarrier(contentEditable: HTMLElement) {
    const carrier = Carrier.getCarrier();
    if (carrier) {
        Carrier.removeCarrier();
        const cursorPosition = getCursorPositionFrom(carrier, 0, carrier, 0);
        normalize(contentEditable, cursorPosition);
    }
}