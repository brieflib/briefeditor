import {getRange} from "@/core/shared/range-util";
import {isMinusIndentEnabled, isPlusIndentEnabled, minusIndent, plusIndent} from "@/core/list/list";

jest.mock("../shared/range-util", () => ({
        getRange: jest.fn()
    })
);

describe("Is plus indent enabled", () => {
    test("Should not allow plus indent for three direct descendant li", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = replaceSpaces(`
            <ul>
                <li>first</li>
                <li>second</li>
                <li>third</li>
            </ul>
        `);

        const range = new Range();
        range.setStart(wrapper.querySelectorAll("ul > li")[0]?.firstChild as Node, "fi".length);
        range.setEnd(wrapper.querySelectorAll("ul > li")[2]?.firstChild as Node, "th".length);

        (getRange as jest.Mock).mockReturnValue(range);

        const isEnabled = isPlusIndentEnabled(wrapper);
        expect(isEnabled).toBe(false);
    });

    test("Should not allow plus indent if range contains not li elements", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = replaceSpaces(`
            <ul>
                <li>first</li>
                <li>second</li>
            </ul>
            <p>third</p>
        `);

        const range = new Range();
        range.setStart(wrapper.querySelectorAll("ul > li")[0]?.firstChild as Node, "fi".length);
        range.setEnd(wrapper.querySelector("p")?.firstChild as Node, "th".length);

        (getRange as jest.Mock).mockReturnValue(range);

        const isEnabled = isPlusIndentEnabled(wrapper);
        expect(isEnabled).toBe(false);
    });

    test("Should not allow plus indent if previous li has less nesting", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = replaceSpaces(`
            <ul>
                <li>first</li>
                <li>second</li>
                <ul>
                    <li>third</li>
                </ul>  
            </ul>`);

        const range = new Range();
        range.setStart(wrapper.querySelectorAll("ul > li")[2]?.firstChild as Node, "th".length);
        range.setEnd(wrapper.querySelectorAll("ul > li")[2]?.firstChild as Node, "third".length);

        (getRange as jest.Mock).mockReturnValue(range);

        const isEnabled = isPlusIndentEnabled(wrapper);
        expect(isEnabled).toBe(false);
    });

    test("Should allow plus indent for two lists", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = replaceSpaces(`
            <ul>
                <li>first</li>
                <li>second</li>
                <ul>
                    <li>third</li>
                </ul>                
            </ul>`);

        const range = new Range();
        range.setStart(wrapper.querySelectorAll("ul > li")[1]?.firstChild as Node, "se".length);
        range.setEnd(wrapper.querySelectorAll("ul > li")[2]?.firstChild as Node, "third".length);

        (getRange as jest.Mock).mockReturnValue(range);

        const isEnabled = isPlusIndentEnabled(wrapper);
        expect(isEnabled).toBe(true);
    });

    test("Should allow plus indent for list", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = replaceSpaces(`
            <ul>
                <li>first</li>
                <li>second</li>             
            </ul>`);

        const range = new Range();
        range.setStart(wrapper.querySelectorAll("ul > li")[1]?.firstChild as Node, "se".length);
        range.setEnd(wrapper.querySelectorAll("ul > li")[1]?.firstChild as Node, "second".length);

        (getRange as jest.Mock).mockReturnValue(range);

        const isEnabled = isPlusIndentEnabled(wrapper);
        expect(isEnabled).toBe(true);
    });
});

describe("Plus indent", () => {
    test("Should indent two direct descendent lists", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = replaceSpaces(`
            <ul>
                <li>first</li>
                <li>second</li>
                <li>third</li>
            </ul>
        `);

        const range = new Range();
        range.setStart(wrapper.querySelectorAll("ul > li")[1]?.firstChild as Node, "se".length);
        range.setEnd(wrapper.querySelectorAll("ul > li")[2]?.firstChild as Node, "third".length);

        (getRange as jest.Mock).mockReturnValue(range);

        plusIndent(wrapper);
        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>first</li>
                <ul>
                    <li>second</li>
                    <li>third</li>
                </ul>
            </ul>`));
    });

    test("Should indent list with nested list", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = replaceSpaces(`
            <ul>
                <li>first</li>
                <li>se<strong>cond</strong></li>
                <ul>
                    <li>third</li>
                </ul>                
            </ul>
        `);

        const range = new Range();
        range.setStart(wrapper.querySelectorAll("ul > li")[1]?.firstChild as Node, "se".length);
        range.setEnd(wrapper.querySelectorAll("ul > li")[1]?.querySelector("strong")?.firstChild as Node, "cond".length);

        (getRange as jest.Mock).mockReturnValue(range);

        plusIndent(wrapper);
        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>first</li>
                <ul>
                    <li>se<strong>cond</strong></li>
                    <li>third</li>
                </ul>
            </ul>
        `));
    });

    test("Should indent middle list", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = replaceSpaces(`
        <ul>
            <li>first</li>
            <li>second</li>
            <ul>
              <li>third</li>
            </ul>
            <li>fourth</li>
            <ul>
              <li>fifth</li>
            </ul>            
        </ul>
        `);

        const range = new Range();
        range.setStart(wrapper.querySelectorAll("ul > li")[3]?.firstChild as Node, "fo".length);
        range.setEnd(wrapper.querySelectorAll("ul > li")[3]?.firstChild as Node, "fourth".length);

        (getRange as jest.Mock).mockReturnValue(range);

        plusIndent(wrapper);
        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>first</li>
                <li>second</li>
                <ul>
                    <li>third</li>
                    <li>fourth</li>
                    <li>fifth</li>
                </ul>
            </ul>
        `));
    });

    test("Should indent two lists with different nesting level", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = replaceSpaces(`
            <ul>
                <li>first</li>
                <li>second</li>
                <ul>
                  <li>third</li>
                </ul>           
            </ul>
        `);

        const range = new Range();
        range.setStart(wrapper.querySelectorAll("ul > li")[1]?.firstChild as Node, "se".length);
        range.setEnd(wrapper.querySelectorAll("ul > ul > li")[0]?.firstChild as Node, "third".length);

        (getRange as jest.Mock).mockReturnValue(range);

        plusIndent(wrapper);
        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>first</li>
                <ul>
                    <li>second</li>
                    <ul>
                        <li>third</li>
                    </ul>
                </ul>           
            </ul>
        `));
    });
});

describe("Is minus indent enabled", () => {
    test("Should not allow minus indent for three direct descendant li", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = replaceSpaces(`
            <ul>
                <li>first</li>
                <li>second</li>
                <li>third</li>
            </ul>
        `);

        const range = new Range();
        range.setStart(wrapper.querySelectorAll("ul > li")[0]?.firstChild as Node, "fi".length);
        range.setEnd(wrapper.querySelectorAll("ul > li")[2]?.firstChild as Node, "th".length);

        (getRange as jest.Mock).mockReturnValue(range);

        const isEnabled = isMinusIndentEnabled(wrapper);
        expect(isEnabled).toBe(false);
    });

    test("Should not allow minus indent if range contains not li elements", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = replaceSpaces(`
            <ul>
                <li>first</li>
                <li>second</li>
            </ul>
            <p>third</p>
        `);

        const range = new Range();
        range.setStart(wrapper.querySelectorAll("ul > li")[0]?.firstChild as Node, "fi".length);
        range.setEnd(wrapper.querySelector("p")?.firstChild as Node, "th".length);

        (getRange as jest.Mock).mockReturnValue(range);

        const isEnabled = isMinusIndentEnabled(wrapper);
        expect(isEnabled).toBe(false);
    });

    test("Should allow minus indent for nested li", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = replaceSpaces(`
            <ul>
                <li>first</li>
                <li>second</li>
                <ul>
                    <li>third</li>
                </ul>
            </ul>`);

        const range = new Range();
        range.setStart(wrapper.querySelectorAll("ul > li")[2]?.firstChild as Node, "th".length);
        range.setEnd(wrapper.querySelectorAll("ul > li")[2]?.firstChild as Node, "third".length);

        (getRange as jest.Mock).mockReturnValue(range);

        const isEnabled = isMinusIndentEnabled(wrapper);
        expect(isEnabled).toBe(true);
    });

    test("Should not allow minus indent for list with one level deep nesting", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = replaceSpaces(`
            <ul>
                <li>first</li>
                <li>second</li>
                <ul>
                    <li>third</li>
                </ul>
            </ul>`);

        const range = new Range();
        range.setStart(wrapper.querySelectorAll("ul > li")[1]?.firstChild as Node, "se".length);
        range.setEnd(wrapper.querySelectorAll("ul > li")[2]?.firstChild as Node, "third".length);

        (getRange as jest.Mock).mockReturnValue(range);

        const isEnabled = isMinusIndentEnabled(wrapper);
        expect(isEnabled).toBe(false);
    });

    test("Should allow minus indent for two list  with deep level deep nesting", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = replaceSpaces(`
            <ul>
                <li>first</li>
                <ul>
                    <li>second</li>
                    <li>third</li>
                </ul>
            </ul>`);

        const range = new Range();
        range.setStart(wrapper.querySelectorAll("ul > ul > li")[0]?.firstChild as Node, "se".length);
        range.setEnd(wrapper.querySelectorAll("ul > ul > li")[1]?.firstChild as Node, "third".length);

        (getRange as jest.Mock).mockReturnValue(range);

        const isEnabled = isMinusIndentEnabled(wrapper);
        expect(isEnabled).toBe(true);
    });

    test("Should not allow minus indent if next li has deeper nesting", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = replaceSpaces(`
            <ul>
                <li>first</li>
                <ul>
                    <li>second</li>
                    <ul>
                        <li>third</li>
                    </ul>                    
                </ul>
            </ul>`);

        const range = new Range();
        range.setStart(wrapper.querySelectorAll("ul > ul > li")[0]?.firstChild as Node, "se".length);
        range.setEnd(wrapper.querySelectorAll("ul > ul > li")[0]?.firstChild as Node, "second".length);

        (getRange as jest.Mock).mockReturnValue(range);

        const isEnabled = isMinusIndentEnabled(wrapper);
        expect(isEnabled).toBe(false);
    });

    test("Should allow minus indent for list with different nesting level", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = replaceSpaces(`
            <ul>
                <li>first</li>
                <li>second</li>
                <ul>
                    <li>third</li>
                    <ul>
                        <li>fourth</li>
                        <li>fifth</li>
                    </ul>
                </ul>
            </ul>`);

        const range = new Range();
        range.setStart(wrapper.querySelectorAll("ul > ul > li")[0]?.firstChild as Node, "th".length);
        range.setEnd(wrapper.querySelectorAll("ul > ul > ul > li")[0]?.firstChild as Node, "fourth".length);

        (getRange as jest.Mock).mockReturnValue(range);

        const isEnabled = isMinusIndentEnabled(wrapper);
        expect(isEnabled).toBe(true);
    });
});

describe("Minus indent", () => {
    test("Should minus indent two nested lis", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = replaceSpaces(`
            <ul>
                <li>first</li>
                <li>second</li>
                <ul>
                    <li>third</li>
                    <li>fourth</li>
                </ul>
            </ul>`);

        const range = new Range();
        range.setStart(wrapper.querySelectorAll("ul > ul > li")[0]?.firstChild as Node, "th".length);
        range.setEnd(wrapper.querySelectorAll("ul > ul > li")[1]?.firstChild as Node, "fourth".length);

        (getRange as jest.Mock).mockReturnValue(range);

        minusIndent(wrapper);
        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>first</li>
                <li>second</li>
                <li>third</li>
                <li>fourth</li>
            </ul>`));
    });

    test("Should minus indent lists with different nesting level", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = replaceSpaces(`
            <ul>
                <li>first</li>
                <li>second</li>
                <ul>
                    <li>third</li>
                    <ul>
                        <li>fourth</li>
                    </ul>
                </ul>
            </ul>`);

        const range = new Range();
        range.setStart(wrapper.querySelectorAll("ul > ul > li")[0]?.firstChild as Node, "th".length);
        range.setEnd(wrapper.querySelectorAll("ul > ul > ul > li")[0]?.firstChild as Node, "fourth".length);

        (getRange as jest.Mock).mockReturnValue(range);

        minusIndent(wrapper);
        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>first</li>
                <li>second</li>
                <li>third</li>
                <ul>
                    <li>fourth</li>
                </ul>
            </ul>`));
    });
});

function replaceSpaces(input: string) {
    return input
        .replaceAll("\n", "")
        .replaceAll(" ", "");
}