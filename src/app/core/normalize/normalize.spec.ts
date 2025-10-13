import normalize, {removeTag} from "@/core/normalize/normalize";

describe("Should normalize tags", () => {
    test("Should sort tags by priority", () => {
        const toNormalize = document.createElement("div");
        toNormalize.innerHTML = "<strong>bold </strong><em><strong>bolditalic</strong>ital</em>ic";

        const normalized = normalize(toNormalize);
        expect(normalized.innerHTML).toBe("<strong>bold <em>bolditalic</em></strong><em>ital</em>ic");
    });

    test("Should sort tags by priority", () => {
        const toNormalize = document.createElement("div");
        toNormalize.innerHTML = "<strong>bold </strong><em><strong>bolditalic</strong>ital</em>ic";

        const normalized = normalize(toNormalize);
        expect(normalized.innerHTML).toBe("<strong>bold <em>bolditalic</em></strong><em>ital</em>ic");
    });

    test("Should collapse similar tags", () => {
        const toNormalize = document.createElement("div");
        toNormalize.innerHTML = "<strong>bold </strong><strong>strong</strong>";

        const normalized = normalize(toNormalize);
        expect(normalized.innerHTML).toBe("<strong>bold strong</strong>");
    });

    test("Should be the same", () => {
        const toNormalize = document.createElement("div");
        toNormalize.innerHTML = "<strong>bold </strong><span>span</span><strong>strong</strong>";

        const normalized = normalize(toNormalize);
        expect(normalized.innerHTML).toBe("<strong>bold </strong><span>span</span><strong>strong</strong>");
    });

    test("Should honor double br", () => {
        const toNormalize = document.createElement("div");
        toNormalize.innerHTML = "<strong>bold </strong><br><br><strong>bolditalic</strong>";

        const normalized = normalize(toNormalize);
        expect(normalized.innerHTML).toBe("<strong>bold </strong><br><br><strong>bolditalic</strong>");
    });

    test("Should delete duplicates", () => {
        const toNormalize = document.createElement("div");
        toNormalize.innerHTML = "<strong><strong>bold</strong></strong>";

        const normalized = normalize(toNormalize);
        expect(normalized.innerHTML).toBe("<strong>bold</strong>");
    });

    test("Should preserve href property", () => {
        const toNormalize = document.createElement("div");
        toNormalize.innerHTML = "<strong>bold<a href=\"http://www.briefeditor.com\">brief</a><a href=\"http://briefeditor.com\">editor</a>te<em>xt</em></strong>";

        const normalized = normalize(toNormalize);
        expect(normalized.innerHTML).toBe("<strong>bold<a href=\"http://www.briefeditor.com\">brief</a><a href=\"http://briefeditor.com\">editor</a>te<em>xt</em></strong>");
    });

    test("Should preserve nested ordered list", () => {
        const toNormalize = document.createElement("div");
        toNormalize.innerHTML = "<ul><li>Write<ul><li>text<strong>1</strong><strong>2</strong></li><li>here</li></ul></li></ul>";

        const normalized = normalize(toNormalize);
        expect(normalized.innerHTML).toBe("<ul><li>Write<ul><li>text<strong>12</strong></li><li>here</li></ul></li></ul>");
    });

    test("Should preserve table", () => {
        const toNormalize = document.createElement("div");
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
        toNormalize.innerHTML = table;
        const normalized = normalize(toNormalize);
        expect(normalized.innerHTML).toBe(table);
    });
});

describe("Should remove tags", () => {
    test("Should remove strong tag", () => {
        const toRemoveTag = document.createElement("div");
        toRemoveTag.innerHTML = "<strong><u><i>bold bolditalic</i>par</u></strong>text";

        const removed = removeTag(toRemoveTag, toRemoveTag.querySelector("strong > u")?.childNodes[1] as Node, ["STRONG"]);
        expect(removed.innerHTML).toBe("<strong><u><i>bold bolditalic</i></u></strong><u>par</u>text");
    });

    test("Should remove strong and deleted tags", () => {
        const toRemove = document.createElement("div");
        toRemove.innerHTML = "<strong><u><i>bold bolditalic</i><deleted><span>par</span><div>lorem</div></deleted></u></strong>text";

        const removed = removeTag(toRemove, toRemove.querySelector("strong > u > deleted") as Node, ["STRONG"]);
        expect(removed.innerHTML).toBe("<strong><u><i>bold bolditalic</i></u></strong><u><span>par</span></u><div><u>lorem</u></div>text");
    });
});

test("Should remove empty tags", () => {
    const toRemove = document.createElement("div");
    toRemove.innerHTML = "<p>text<ul><li></li></ul></p>";

    const normalized = normalize(toRemove);
    expect(normalized.innerHTML).toBe("<p>text</p>");
});