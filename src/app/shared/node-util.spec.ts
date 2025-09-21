import {getLeafNodes} from "@/shared/node-util";

test("Should find all leaves", () => {
    const toTransform = document.createElement("div");
    toTransform.innerHTML = "<strong>bold </strong><em><strong>bolditalic</strong>ital</em>ic";

    const leaves = getLeafNodes(toTransform);

    expect(leaves[0]?.textContent).toBe("bold ");
    expect(leaves[1]?.textContent).toBe("bolditalic");
    expect(leaves[2]?.textContent).toBe("ital");
    expect(leaves[3]?.textContent).toBe("ic");
});