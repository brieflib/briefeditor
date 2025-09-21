import normalize, {removeTag} from "@/normalize/normalize";

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
});

describe("Should remove tags", () => {
    test("Should remove strong tag", () => {
        const toRemoveTag = document.createElement("div");
        toRemoveTag.innerHTML = "<strong><u><i>bold bolditalic</i>par</u></strong>text";

        const removed = removeTag(toRemoveTag, toRemoveTag.firstChild?.firstChild?.childNodes[1] as Node, "STRONG");
        expect(removed.innerHTML).toBe("<strong><i><u>bold bolditalic</u></i></strong><u>par</u>text");
    });

    test("Should remove strong and deleted tags", () => {
        const toRemove = document.createElement("div");
        toRemove.innerHTML = "<strong><u><i>bold bolditalic</i><deleted><span>par</span><div>lorem</div></deleted></u></strong>text";

        const removed = removeTag(toRemove, toRemove.firstChild?.firstChild?.childNodes[1] as Node, "STRONG");
        expect(removed.innerHTML).toBe("<strong><i><u>bold bolditalic</u></i></strong><span><u>par</u></span><div><u>lorem</u></div>text");
    });
});

test("Should remove empty tags", () => {
    const toRemove = document.createElement("div");
    toRemove.innerHTML = "<p>text<ul><li></li></ul></p>";

    const normalized = normalize(toRemove);
    expect(normalized.innerHTML).toBe("<p>text</p>");
});