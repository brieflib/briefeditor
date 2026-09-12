import {conformLines, hoistBlocks, lineTag} from "@/core/clipboard/util/paste-conform-util";
import {createWrapper, expectHtml} from "@/core/shared/test-util";

function parse(htmlString: string): HTMLElement {
    return new DOMParser().parseFromString(htmlString, "text/html").body;
}

function line(htmlString: string): HTMLElement {
    return createWrapper(htmlString).firstElementChild as HTMLElement;
}

describe("Line tag", () => {
    test("Should write the words of an item as a paragraph", () => {
        expect(lineTag(line(`<li>zero</li>`))).toBe("P");
    });

    test("Should write the words of a heading in its own tag", () => {
        expect(lineTag(line(`<h2>zero</h2>`))).toBe("H2");
    });
});

describe("Hoist blocks", () => {
    test("Should lift the paragraphs out of a blockquote dropping the whitespace around them", () => {
        const body = parse(`<blockquote>\n<p>zero</p>\n<p>first</p>\n</blockquote>`);

        hoistBlocks(body);

        expectHtml(body.innerHTML, `<p>zero</p><p>first</p>`);
    });

    test("Should keep the words a lifted block leaves on either side of it", () => {
        const body = parse(`<blockquote>zero<p>first</p>second</blockquote>`);

        hoistBlocks(body);

        expectHtml(body.innerHTML, `<blockquote>zero</blockquote><p>first</p><blockquote>second</blockquote>`);
    });

    test("Should lift the blocks out of the formatting wrapped around them", () => {
        const body = parse(`<b><p>zero</p><p>first</p></b>`);

        hoistBlocks(body);

        expectHtml(body.innerHTML, `<p>zero</p><p>first</p>`);
    });

    test("Should lift a list out of the blockquote holding it", () => {
        const body = parse(`<blockquote>zero<ul><li>first</li></ul></blockquote>`);

        hoistBlocks(body);

        expectHtml(body.innerHTML, `<blockquote>zero</blockquote><ul><li>first</li></ul>`);
    });

    test("Should leave a list nested in an item where it is", () => {
        const body = parse(`<ul><li>zero<ul><li>first</li></ul></li></ul>`);

        hoistBlocks(body);

        expectHtml(body.innerHTML, `<ul><li>zero<ul><li>first</li></ul></li></ul>`);
    });

    test("Should leave a paragraph inside a cell where it is", () => {
        const body = parse(`<table><tbody><tr><td><p>zero</p></td></tr></tbody></table>`);

        hoistBlocks(body);

        expectHtml(body.innerHTML, `<table><tbody><tr><td><p>zero</p></td></tr></tbody></table>`);
    });

    test("Should lift a table out of the item holding it", () => {
        const body = parse(`<ul><li>zero<table><tbody><tr><td>first</td></tr></tbody></table></li></ul>`);

        hoistBlocks(body);

        expectHtml(body.innerHTML, `<ul><li>zero</li></ul><table><tbody><tr><td>first</td></tr></tbody></table>`);
    });

    test("Should keep a half holding nothing but a break", () => {
        const body = parse(`<b><br><h1>zero</h1></b>`);

        hoistBlocks(body);

        expectHtml(body.innerHTML, `<b><br></b><h1>zero</h1>`);
    });
});

describe("Conform lines", () => {
    test("Should write every line in the tag of a heading", () => {
        const body = parse(`<p>zero</p><h2>first</h2><blockquote>second</blockquote>`);

        conformLines(body, line(`<h1>target</h1>`));

        expectHtml(body.innerHTML, `<h1>zero</h1><h1>first</h1><h1>second</h1>`);
    });

    test("Should drop the attributes of a rewritten line", () => {
        const body = parse(`<h2 class="title" style="color: red">zero</h2>`);

        conformLines(body, line(`<p>target</p>`));

        expectHtml(body.innerHTML, `<p>zero</p>`);
    });

    test("Should leave a list and a table as they are", () => {
        const body = parse(`<ul><li>zero</li></ul><table><tbody><tr><td>first</td></tr></tbody></table>`);

        conformLines(body, line(`<h1>target</h1>`));

        expectHtml(body.innerHTML, `<ul><li>zero</li></ul><table><tbody><tr><td>first</td></tr></tbody></table>`);
    });

    test("Should wrap the words standing beside a block as a line of their own", () => {
        const body = parse(`zero<h2>first</h2><strong>second</strong> third`);

        conformLines(body, line(`<p>target</p>`));

        expectHtml(body.innerHTML, `<p>zero</p><p>first</p><p><strong>second</strong> third</p>`);
    });

    test("Should leave whitespace and comments between blocks alone", () => {
        const body = parse(`<p>zero</p><!--StartFragment-->\n<p>first</p><!--EndFragment-->`);

        conformLines(body, line(`<h1>target</h1>`));

        expect(body.innerHTML).toBe(`<h1>zero</h1><!--StartFragment-->\n<h1>first</h1><!--EndFragment-->`);
    });

    test("Should leave a bare space alone", () => {
        const body = parse(``);
        body.append(" ");

        conformLines(body, line(`<p>target</p>`));

        expect(body.innerHTML).toBe(" ");
    });

    test("Should fold the lines pasted into an item into one paragraph divided by breaks", () => {
        const body = parse(`<h1>zero</h1><p>first</p><blockquote>second</blockquote>`);

        conformLines(body, line(`<li>target</li>`));

        expectHtml(body.innerHTML, `<p>zero<br>first<br>second</p>`);
    });

    test("Should fold an empty line into the breaks around it", () => {
        const body = parse(`<p>zero</p><p><br></p><p>first</p>`);

        conformLines(body, line(`<li>target</li>`));

        expectHtml(body.innerHTML, `<p>zero<br><br>first</p>`);
    });

    test("Should leave a lone empty line pasted into an item as it is", () => {
        const body = parse(`<h1><br></h1>`);

        conformLines(body, line(`<li>target</li>`));

        expectHtml(body.innerHTML, `<p><br></p>`);
    });

    test("Should fold the lines on either side of a list pasted into an item on their own", () => {
        const body = parse(`<p>zero</p><h1>first</h1><ul><li>second</li></ul><p>third</p>`);

        conformLines(body, line(`<li>target</li>`));

        expectHtml(body.innerHTML, `<p>zero<br>first</p><ul><li>second</li></ul><p>third</p>`);
    });

    test("Should leave the lines pasted into an empty heading as they came", () => {
        const body = parse(`<p>zero</p><h2>first</h2>`);

        conformLines(body, line(`<h1><br></h1>`));

        expectHtml(body.innerHTML, `<p>zero</p><h2>first</h2>`);
    });

    test("Should fold the lines pasted into an empty item all the same", () => {
        const body = parse(`<p>zero</p><h2>first</h2>`);

        conformLines(body, line(`<li><br></li>`));

        expectHtml(body.innerHTML, `<p>zero<br>first</p>`);
    });

    test("Should leave the paste alone when the cursor stands in no line", () => {
        const body = parse(`<p>zero</p><h2>first</h2>`);

        conformLines(body, undefined);

        expectHtml(body.innerHTML, `<p>zero</p><h2>first</h2>`);
    });
});
