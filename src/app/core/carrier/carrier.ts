// eslint-disable-next-line @typescript-eslint/no-extraneous-class
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