import {handleDragEvent, handleDragOverEvent} from "@/core/clipboard/clipboard";

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
