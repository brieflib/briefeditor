import normalize from "@/normalize/normalize";

describe("Should normalize tags", () => {
    test("Should sort tags by priority", () => {
        const toNormalize = document.createElement("div");
        toNormalize.innerHTML = "<strong>bold </strong><em><strong>bolditalic</strong>ital</em>ic";

        const normalized = normalize(toNormalize);
        expect(normalized.innerHTML).toBe("<strong>bold <em>bolditalic</em></strong><em>ital</em>ic");
    });

    test("Should sort tags by priority and remove empty tag", () => {
        const toNormalize = document.createElement("div");
        toNormalize.innerHTML = "<strong>bold </strong><em><strong>bolditalic<li></li></strong>ital</em>ic";

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

    test("Should leave href property", () => {
        const toNormalize = document.createElement("div");
        toNormalize.innerHTML = "<strong>bold<a href=\"http://www.briefeditor.com\">brief</a><a href=\"http://briefeditor.com\">editor</a>te<em>xt</em></strong>";

        const normalized = normalize(toNormalize);
        expect(normalized.innerHTML).toBe("<strong>bold<a href=\"http://www.briefeditor.com\">brief</a><a href=\"http://briefeditor.com\">editor</a>te<em>xt</em></strong>");
    });
})

