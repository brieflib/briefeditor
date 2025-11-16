import {getRootElement} from "@/core/shared/element-util";

test("Should find first level element", () => {
    const container = document.createElement("div");
    container.innerHTML = "<p><span>inner</span></p>";

    const rootElement = getRootElement(container, container.firstChild?.firstChild as HTMLElement);

    expect(rootElement).toBe(container.firstChild);
});