import {getSharedTags} from "@/toolbar/util/util";

test("Should find shared parents", () => {
    const toTransform = document.createElement("div");
    toTransform.innerHTML = "<em>ital<strong>bolditalic</strong></em><strong>bold </strong>ic";

    const nodes = [];
    nodes.push(toTransform.childNodes[0]?.childNodes[1] as Node);
    nodes.push(toTransform.childNodes[1] as Node);
    const shared = getSharedTags(nodes, toTransform);

    expect(shared).toStrictEqual(["STRONG"]);
});