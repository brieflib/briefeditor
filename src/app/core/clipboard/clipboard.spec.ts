import {handleCutEvent, handleDragEvent, handleDragOverEvent} from "@/core/clipboard/clipboard";
import {getRange} from "@/core/shared/range-util";
import {createWrapper, expectHtml} from "@/core/shared/test-util";

jest.mock("../shared/range-util", () => ({
        getRange: jest.fn()
    })
);

// jsdom ships no DragEvent constructor, so the events are built as plain cancelable events and the
// data transfer is stubbed. Only the two decisions these handlers make are observable here: whether
// the default action is refused, and what the drop effect is left at.
function dragEvent(type: string, dataTransfer: DataTransfer | null = null): DragEvent {
    const event = new Event(type, {cancelable: true, bubbles: true});
    Object.defineProperty(event, "dataTransfer", {value: dataTransfer});

    return event as DragEvent;
}

describe("Drag and drop", () => {
    test("Should refuse a drag started in the editor", () => {
        const event = dragEvent("dragstart");

        handleDragEvent(event);

        expect(event.defaultPrevented).toBe(true);
    });

    test("Should refuse a drop", () => {
        const event = dragEvent("drop", {dropEffect: "move"} as DataTransfer);

        handleDragEvent(event);

        expect(event.defaultPrevented).toBe(true);
    });

    test("Should leave the dragover default alone, since preventing it allows the drop", () => {
        const dataTransfer = {dropEffect: "move"} as DataTransfer;
        const event = dragEvent("dragover", dataTransfer);

        handleDragOverEvent(event);

        expect(event.defaultPrevented).toBe(false);
        expect(dataTransfer.dropEffect).toBe("none");
    });

    test("Should handle a dragover carrying no data transfer", () => {
        const event = dragEvent("dragover");

        expect(() => handleDragOverEvent(event)).not.toThrow();
        expect(event.defaultPrevented).toBe(false);
    });
});

// A cut looks the root of the selection up itself, before any of the repairs a command ends with. With the
// whole document taken out there is no root left under the editor to find, and the search climbs out of it.
describe("Cut", () => {
    function cutEvent(): ClipboardEvent {
        const event = new Event("cut", {cancelable: true, bubbles: true});
        Object.defineProperty(event, "clipboardData", {value: {setData: jest.fn()} as unknown as DataTransfer});

        return event as ClipboardEvent;
    }

    test("Should leave an empty paragraph when the blocks the cut emptied are left behind", () => {
        const wrapper = createWrapper(`<p>zero</p><p>first</p>`);
        const range = new Range();
        range.setStart(wrapper.firstChild?.firstChild as Node, 0);
        range.setEnd(wrapper.lastChild?.firstChild as Node, "first".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = handleCutEvent(wrapper, cutEvent());

        expectHtml(wrapper.innerHTML, `<p><br></p>`);
        expect(cursorPosition.startContainer).toBe(wrapper.querySelector("br"));
    });

    test("Should leave an empty paragraph when the whole document is cut", () => {
        const wrapper = createWrapper(`<p>zero</p><p>first</p>`);
        const range = new Range();
        range.setStart(wrapper, 0);
        range.setEnd(wrapper, wrapper.childNodes.length);
        (getRange as jest.Mock).mockReturnValue(range);

        const cursorPosition = handleCutEvent(wrapper, cutEvent());

        expectHtml(wrapper.innerHTML, `<p><br></p>`);
        expect(cursorPosition.startContainer).toBe(wrapper.querySelector("br"));
        expect(wrapper.isConnected).toBe(true);
    });
});
