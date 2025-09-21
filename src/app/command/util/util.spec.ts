import {getFirstLevelElement} from "@/command/util/util";

test("Should find first level element", () => {
    const container = document.createElement("div");
    container.innerHTML = "<p><span>inner</span></p>";

    const block = getFirstLevelElement(container, container.firstChild?.firstChild as HTMLElement);

    expect(block).toBe(container.firstChild);
});