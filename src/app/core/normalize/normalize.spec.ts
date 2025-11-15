import normalize, {removeTag, replaceTag} from "@/core/normalize/normalize";

describe("Should normalize tags", () => {
    test("Should sort tags by priority", () => {
        testNormalize("<strong>bold </strong><em><strong>bolditalic</strong>ital</em>ic",
            "<strong>bold <em>bolditalic</em></strong><em>ital</em>ic");
    });

    test("Should collapse similar tags", () => {
        testNormalize("<strong>bold </strong><strong>strong</strong>",
            "<strong>bold strong</strong>");
    });

    test("Should be the same", () => {
        testNormalize("<strong>bold </strong><span>span</span><strong>strong</strong>",
            "<strong>bold </strong><span>span</span><strong>strong</strong>");
    });

    test("Should honor double br", () => {
        testNormalize("<strong>bold </strong><br><br><strong>bolditalic</strong>",
            "<strong>bold </strong><br><br><strong>bolditalic</strong>");
    });
    test("Should honor br", () => {
        testNormalize("<strong>bold </strong><br><strong>bolditalic</strong>",
            "<strong>bold </strong><br><strong>bolditalic</strong>");
    });

    test("Should delete duplicates", () => {
        testNormalize("<strong>strong <strong>bold <strong><em>text</em></strong></strong></strong>",
            "<strong>strong bold <em>text</em></strong>");
    });

    test("Should delete paragraph and strong duplicates", () => {
        testNormalize("<div>strong <strong><div>bold <strong><div>text</div></strong></div></strong></div>",
            "<div>strong <strong>bold text</strong></div>");
    });

    test("Should preserve href property", () => {
        testNormalize("<strong>bold<a href=\"http://www.briefeditor.com\">brief</a><a href=\"http://briefeditor.com\">editor</a>te<em>xt</em></strong>",
            "<strong>bold<a href=\"http://www.briefeditor.com\">brief</a><a href=\"http://briefeditor.com\">editor</a>te<em>xt</em></strong>");
    });

    test("Should preserve nested ordered list", () => {
        testNormalize("<ul><li>Write<ul><li>text<strong>1</strong><strong>2</strong></li><li>here</li></ul></li></ul>",
            "<ul><li>Write<ul><li>text<strong>12</strong></li><li>here</li></ul></li></ul>");
    });

    test("Should merge multiple ul", () => {
        testNormalize("<ul><li>Write</li></ul><ul><li>here</li></ul>",
            "<ul><li>Write</li><li>here</li></ul>");
    });

    test("Should preserve table", () => {
        const table = `
        <table>
          <thead>
            <tr>
              <th>Option</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>data</td>
              <td>path to data files to <strong>supply</strong> the data that will be passed into templates.</td>
            </tr>
            <tr>
              <td>engine</td>
              <td>engine to be used for processing templates. Handlebars is the default.</td>
            </tr>
            <tr>
              <td>ext</td>
              <td>extension to be used for dest files.</td>
            </tr>
          </tbody>
        </table>
        `;
        testNormalize(table, table);
    });

    test("Should remove empty tags", () => {
        const container = document.createElement("div");
        container.innerHTML = "<div>text<ul><li></li></ul></div>";

        const toRemove = container.querySelector("div") as HTMLElement;
        normalize(container, toRemove);
        expect(container.innerHTML).toBe("<div>text</div>");
    });
});

describe("Should remove tags", () => {
    test("Should remove strong tag from text", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = "<strong><u><i>bold bolditalic</i>par</u></strong>text";

        const toRemoveTag = wrapper.querySelector("strong > u")?.childNodes[1] as HTMLElement;
        removeTag(wrapper, toRemoveTag, ["STRONG"]);
        expect(wrapper.innerHTML).toBe("<strong><u><i>bold bolditalic</i></u></strong><u>par</u>text");
    });

    test("Should remove strong tag from div", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = "<strong><u><i>bold bolditalic</i><div><span>par</span><div>lorem</div></div></u></strong>text";

        const toRemoveTag = wrapper.querySelector("strong > u > div");
        removeTag(wrapper, toRemoveTag as HTMLElement, ["STRONG"]);
        expect(wrapper.innerHTML).toBe("<strong><u><i>bold bolditalic</i></u></strong><div><u><span>par</span>lorem</u></div>text");
    });
});

describe("Should replace tags", () => {
    test("Should replace div tag with list", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = "<strong><u><i>bold bolditalic</i><div><span>par</span><p>lorem</p></div></u></strong>text";

        const toReplaceTag = wrapper.querySelector("strong > u > div");
        replaceTag(wrapper, toReplaceTag as HTMLElement, ["DIV"], ["UL", "LI"]);
        expect(wrapper.innerHTML).toBe("<strong><u><i>bold bolditalic</i></u></strong><ul><li><strong><u><span>par</span></u></strong></li><li><p><strong><u>lorem</u></strong></p></li></ul>text");
    });
});


function testNormalize(initial: string, result: string) {
    const wrapper = document.createElement("div");
    const toNormalize = document.createElement("div");
    toNormalize.innerHTML = initial;
    wrapper.appendChild(toNormalize);

    normalize(toNormalize, toNormalize);
    expect(wrapper.innerHTML).toBe(result);
}