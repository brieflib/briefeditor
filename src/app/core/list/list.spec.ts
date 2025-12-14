import {getRange} from "@/core/shared/range-util";
import {isMinusIndentEnabled, isPlusIndentEnabled, minusIndent, plusIndent} from "@/core/list/list";
import {createWrapper, replaceSpaces} from "@/core/shared/test-util";

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
                <li>second
                    <ul>
                        <li>third</li>
                    </ul>
                </li>
            </ul>`);

        const range = new Range();
        range.setStart(wrapper.querySelector("ul > li:nth-child(2) > ul > li")?.firstChild as Node, "th".length);
        range.setEnd(wrapper.querySelector("ul > li:nth-child(2) > ul > li")?.firstChild as Node, "third".length);

        (getRange as jest.Mock).mockReturnValue(range);

        const isEnabled = isPlusIndentEnabled(wrapper);
        expect(isEnabled).toBe(false);
    });

    test("Should allow plus indent for two lists", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = replaceSpaces(`
            <ul>
                <li>first</li>
                <li>second
                    <ul>
                        <li>third</li>
                    </ul>
                </li>              
            </ul>`);

        const range = new Range();
        range.setStart(wrapper.querySelector("ul > li:nth-child(2)")?.firstChild as Node, "se".length);
        range.setEnd(wrapper.querySelector("ul > li:nth-child(2) > ul > li")?.firstChild as Node, "third".length);

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

    test("Should allow plus indent for an ordered list after an unordered list", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = replaceSpaces(`
            <ul>
                <li>first</li>         
            </ul>
            <ol>
                <li>second</li> 
            </ol>`);

        const range = new Range();
        range.setStart(wrapper.querySelector("ol > li")?.firstChild as Node, "se".length);
        range.setEnd(wrapper.querySelector("ol > li")?.firstChild as Node, "second".length);

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
        document.body.appendChild(wrapper);

        const range = new Range();
        range.setStart(wrapper.querySelector("ul > li:nth-child(2)")?.firstChild as Node, "se".length);
        range.setEnd(wrapper.querySelector("ul > li:nth-child(3)")?.firstChild as Node, "third".length);
        (getRange as jest.Mock).mockReturnValue(range);

        plusIndent(wrapper);
        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>first
                    <ul>
                        <li>second</li>
                        <li>third</li>
                    </ul>
                </li>
            </ul>
        `));
    });

    test("Should indent one direct descendent lists when cursor at the end of the second", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = replaceSpaces(`
            <ul>
                <li>first</li>
                <li>second</li>
                <li>third</li>
            </ul>`);
        document.body.appendChild(wrapper);

        const range = new Range();
        range.setStart(wrapper.querySelector("ul > li:nth-child(2)")?.firstChild as Node, "second".length);
        range.setEnd(wrapper.querySelector("ul > li:nth-child(3)")?.firstChild as Node, "third".length);
        (getRange as jest.Mock).mockReturnValue(range);

        plusIndent(wrapper);
        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>first</li>
                <li>second
                    <ul>
                        <li>third</li>
                    </ul>
                </li>
            </ul>`));
    });

    test("Should indent list with nested list", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = replaceSpaces(`
            <ul>
                <li>first</li>
                <li>se<strong>cond</strong>
                    <ul>
                        <li>third</li>
                    </ul>
                </li>            
            </ul>
        `);
        document.body.appendChild(wrapper);

        const range = new Range();
        range.setStart(wrapper.querySelector("ul > li:nth-child(2)")?.firstChild as Node, "se".length);
        range.setEnd(wrapper.querySelector("ul > li:nth-child(2) > strong")?.firstChild as Node, "cond".length);
        (getRange as jest.Mock).mockReturnValue(range);

        plusIndent(wrapper);
        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>first
                    <ul>
                        <li>se<strong>cond</strong></li>
                        <li>third</li>
                    </ul>
                </li>
            </ul>
        `));
    });

    test("Should indent middle list", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = replaceSpaces(`
            <ul>
                <li>first</li>
                <li>second
                    <ul>
                      <li>third</li>
                    </ul>
                </li>
                <li>fourth
                    <ul>
                      <li>fifth</li>
                    </ul>
                </li>          
            </ul>
        `);
        document.body.appendChild(wrapper);

        const range = new Range();
        range.setStart(wrapper.querySelector("ul > li:nth-child(3)")?.firstChild as Node, "fo".length);
        range.setEnd(wrapper.querySelector("ul > li:nth-child(3)")?.firstChild as Node, "fourth".length);

        (getRange as jest.Mock).mockReturnValue(range);

        plusIndent(wrapper);
        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>first</li>
                <li>second
                    <ul>
                        <li>third</li>
                        <li>fourth</li>
                        <li>fifth</li>
                    </ul>
                </li>
            </ul>
        `));
    });

    test("Should indent two lists with different nesting level", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = replaceSpaces(`
            <ul>
                <li>first</li>
                <li>second
                    <ul>
                        <li>third</li>
                        <li>fourth</li>
                    </ul>
                </li>
            </ul>`);
        document.body.appendChild(wrapper);

        const range = new Range();
        range.setStart(wrapper.querySelector("ul > li:nth-child(2)")?.firstChild as Node, "se".length);
        range.setEnd(wrapper.querySelector("ul > li:nth-child(2) > ul > li")?.firstChild as Node, "third".length);
        (getRange as jest.Mock).mockReturnValue(range);

        plusIndent(wrapper);
        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>first
                    <ul>
                        <li>second
                            <ul>
                                <li>third</li>
                            </ul>
                        </li>
                        <li>fourth</li>
                    </ul>
                </li>          
            </ul>
        `));
    });

    test("Should indent an ordered list located after an unordered list", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = replaceSpaces(`
            <ul>
                <li>first</li>         
            </ul>
            <ol>
                <li>second</li> 
            </ol>
        `);
        document.body.appendChild(wrapper);

        const range = new Range();
        range.setStart(wrapper.querySelector("ol > li")?.firstChild as Node, "se".length);
        range.setEnd(wrapper.querySelector("ol > li")?.firstChild as Node, "second".length);
        (getRange as jest.Mock).mockReturnValue(range);

        plusIndent(wrapper);
        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>first
                    <ol>
                        <li>second</li>
                    </ol>
                </li>          
            </ul>
        `));
    });

    test("Should indent an ordered list (with child) located after an unordered list", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = replaceSpaces(`
            <ul>
                <li>first</li>         
            </ul>
            <ol>
                <li>second
                    <ol>
                        <li>third</li>
                    </ol>
                </li>
            </ol>
        `);
        document.body.appendChild(wrapper);

        const range = new Range();
        range.setStart(wrapper.querySelector("ol > li")?.firstChild as Node, "se".length);
        range.setEnd(wrapper.querySelector("ol > li")?.firstChild as Node, "second".length);
        (getRange as jest.Mock).mockReturnValue(range);

        plusIndent(wrapper);
        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>first
                    <ol>
                        <li>second</li>
                        <li>third</li>
                    </ol>
                </li>          
            </ul>
        `));
    });

    test("Should indent list containing an ordered list", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = replaceSpaces(`
            <ul>
                <li>first</li>         
                <li>second
                    <ol>
                        <li>third</li> 
                    </ol>
                </li>      
            </ul>
        `);
        document.body.appendChild(wrapper);

        const range = new Range();
        range.setStart(wrapper.querySelector("ul > li:nth-child(2)")?.firstChild as Node, "se".length);
        range.setEnd(wrapper.querySelector("ul > li:nth-child(2)")?.firstChild as Node, "second".length);
        (getRange as jest.Mock).mockReturnValue(range);

        plusIndent(wrapper);
        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>first
                    <ul>
                        <li>second</li>
                    </ul>
                    <ol>
                        <li>third</li>
                    </ol>
                </li>         
            </ul>
        `));
    });

    test("Should indent an ordered list after an unordered list", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = replaceSpaces(`
            <ul>
                <li>first</li>         
            </ul>
            <ol>
                <li>second</li>
                <li>third</li>
            </ol>`);
        document.body.appendChild(wrapper);

        const range = new Range();
        range.setStart(wrapper.querySelector("ol > li:nth-child(1)")?.firstChild as Node, "se".length);
        range.setEnd(wrapper.querySelector("ol > li:nth-child(1)")?.firstChild as Node, "second".length);
        (getRange as jest.Mock).mockReturnValue(range);

        plusIndent(wrapper);
        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>first
                    <ol>
                        <li>second</li>
                    </ol>
                </li>
            </ul>
            <ol>
                <li>third</li>
            </ol>`));
    });

    test("Should indent last ordered list after an unordered list", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = replaceSpaces(`
            <ul>
                <li>first</li>         
            </ul>
            <ol>
                <li>second</li>
                <li>third</li>
            </ol>
        `);
        document.body.appendChild(wrapper);

        const range = new Range();
        range.setStart(wrapper.querySelector("ol > li:nth-child(2)")?.firstChild as Node, "th".length);
        range.setEnd(wrapper.querySelector("ol > li:nth-child(2)")?.firstChild as Node, "third".length);
        (getRange as jest.Mock).mockReturnValue(range);

        plusIndent(wrapper);
        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>first</li>
            </ul>
            <ol>
                <li>second
                    <ol>
                        <li>third</li>
                    </ol>               
                </li>
            </ol>
        `));
    });

    test("Should indent list wrappers with different types", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>first
                    <ol>
                        <li>second</li>
                    </ol>
                    <ul>
                        <li class="start">third</li>
                    </ul>
                    <ol>
                        <li class="end">fourth</li>
                    </ol>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(wrapper.querySelector(".start")?.firstChild as Node, "th".length);
        range.setEnd(wrapper.querySelector(".end")?.firstChild as Node, "fo".length);

        (getRange as jest.Mock).mockReturnValue(range);

        plusIndent(wrapper);
        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>first
                    <ol>
                        <li>second
                            <ul>
                                <li class="start">third</li>
                            </ul>
                            <ol>
                                <li class="end">fourth</li>
                            </ol>
                        </li>
                    </ol>
                </li>
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
        document.body.appendChild(wrapper);

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
        document.body.appendChild(wrapper);

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
                <li>second
                    <ul>
                        <li>third</li>
                    </ul>
                </li>
            </ul>`);
        document.body.appendChild(wrapper);

        const range = new Range();
        range.setStart(wrapper.querySelector("ul > li:nth-child(2) > ul > li")?.firstChild as Node, "th".length);
        range.setEnd(wrapper.querySelector("ul > li:nth-child(2) > ul > li")?.firstChild as Node, "third".length);

        (getRange as jest.Mock).mockReturnValue(range);

        const isEnabled = isMinusIndentEnabled(wrapper);
        expect(isEnabled).toBe(true);
    });

    test("Should not allow minus indent for list with one level deep nesting", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = replaceSpaces(`
            <ul>
                <li>first</li>
                <li>second
                    <ul>
                        <li>third</li>
                    </ul>
                </li>
            </ul>`);

        const range = new Range();
        range.setStart(wrapper.querySelector("ul > li:nth-child(2)")?.firstChild as Node, "se".length);
        range.setEnd(wrapper.querySelector("ul > li:nth-child(2) > ul > li")?.firstChild as Node, "third".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const isEnabled = isMinusIndentEnabled(wrapper);
        expect(isEnabled).toBe(false);
    });

    test("Should allow minus indent for two list  with deep level deep nesting", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = replaceSpaces(`
            <ul>
                <li>first
                    <ul>
                        <li>second</li>
                        <li>third</li>
                    </ul>
                </li>
            </ul>`);

        const range = new Range();
        range.setStart(wrapper.querySelector("ul > li > ul > li:nth-child(1)")?.firstChild as Node, "se".length);
        range.setEnd(wrapper.querySelector("ul > li > ul > li:nth-child(2)")?.firstChild as Node, "third".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const isEnabled = isMinusIndentEnabled(wrapper);
        expect(isEnabled).toBe(true);
    });

    test("Should not allow minus indent if next li has deeper nesting", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = replaceSpaces(`
            <ul>
                <li>first
                    <ul>
                        <li>second
                            <ul>
                                <li>third</li>
                            </ul>
                        </li>                
                    </ul>
                </li>
            </ul>`);

        const range = new Range();
        range.setStart(wrapper.querySelector("ul > li > ul > li")?.firstChild as Node, "se".length);
        range.setEnd(wrapper.querySelector("ul > li > ul > li")?.firstChild as Node, "second".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const isEnabled = isMinusIndentEnabled(wrapper);
        expect(isEnabled).toBe(false);
    });

    test("Should allow minus indent for list with different nesting level", () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = replaceSpaces(`
            <ul>
                <li>first</li>
                <li>second
                    <ul>
                        <li>third
                            <ul>
                                <li>fourth</li>
                                <li>fifth</li>
                            </ul>
                        </li>
                    </ul>
                </li>
            </ul>`);

        const range = new Range();
        range.setStart(wrapper.querySelector("ul > li:nth-child(2) > ul > li")?.firstChild as Node, "th".length);
        range.setEnd(wrapper.querySelector("ul > li:nth-child(2) > ul > li > ul > li:nth-child(1)")?.firstChild as Node, "fourth".length);

        (getRange as jest.Mock).mockReturnValue(range);

        const isEnabled = isMinusIndentEnabled(wrapper);
        expect(isEnabled).toBe(true);
    });
});

describe("Minus indent", () => {
    test("Should minus indent two nested lists", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>first</li>
                <li>second
                    <ul>
                        <li>third</li>
                        <li>fourth</li>
                        <li>fifth</li>
                    </ul>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(wrapper.querySelector("ul > li:nth-child(2) > ul > li:nth-child(1)")?.firstChild as Node, "th".length);
        range.setEnd(wrapper.querySelector("ul > li:nth-child(2) > ul > li:nth-child(2)")?.firstChild as Node, "fourth".length);
        (getRange as jest.Mock).mockReturnValue(range);

        minusIndent(wrapper);
        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>first</li>
                <li>second</li>
                <li>third</li>
                <li>fourth
                    <ul>
                        <li>fifth</li>
                    </ul>
                </li>
            </ul>
        `));
    });

    test("Should minus indent middle nested list", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>first</li>
                <li>second
                    <ul>
                        <li>third</li>
                        <li>fourth</li>
                        <li>fifth</li>
                    </ul>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(wrapper.querySelector("ul > li:nth-child(2) > ul > li:nth-child(2)")?.firstChild as Node, "fo".length);
        range.setEnd(wrapper.querySelector("ul > li:nth-child(2) > ul > li:nth-child(2)")?.firstChild as Node, "fourth".length);
        (getRange as jest.Mock).mockReturnValue(range);

        minusIndent(wrapper);
        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>first</li>
                <li>second
                    <ul>
                        <li>third</li>
                    </ul>
                </li>
                <li>fourth
                    <ul>
                        <li>fifth</li>
                    </ul>
                </li>
            </ul>
        `));
    });

    test("Should minus indent last nested list", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>first</li>
                <li>second
                    <ul>
                        <li>third</li>
                        <li>fourth</li>
                    </ul>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(wrapper.querySelector("ul > li:nth-child(2) > ul > li:nth-child(2)")?.firstChild as Node, "fo".length);
        range.setEnd(wrapper.querySelector("ul > li:nth-child(2) > ul > li:nth-child(2)")?.firstChild as Node, "fourth".length);
        (getRange as jest.Mock).mockReturnValue(range);

        minusIndent(wrapper);
        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>first</li>
                <li>second
                    <ul>
                        <li>third</li>
                    </ul>
                </li>
                <li>fourth</li>
            </ul>`));
    });

    test("Should minus indent lists with different nesting level", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>first</li>
                <li>second
                    <ul>
                        <li>third
                            <ul>
                                <li>fourth</li>
                            </ul>
                        </li>
                    </ul>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(wrapper.querySelector("ul > li:nth-child(2) > ul > li")?.firstChild as Node, "th".length);
        range.setEnd(wrapper.querySelector("ul > li:nth-child(2) > ul > li > ul > li")?.firstChild as Node, "fourth".length);

        (getRange as jest.Mock).mockReturnValue(range);

        minusIndent(wrapper);
        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>first</li>
                <li>second</li>
                <li>third
                    <ul>
                        <li>fourth</li>
                    </ul>
                </li>
            </ul>
        `));
    });

    test("Should minus indent lists with different nesting level and additional previous list", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>first</li>
                <li>second
                    <ul>
                        <li>third</li>
                        <li>fourth
                            <ul>
                                <li>fifth</li>
                            </ul>
                        </li>
                    </ul>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(wrapper.querySelector("ul > li:nth-child(2) > ul > li:nth-child(2)")?.firstChild as Node, "fo".length);
        range.setEnd(wrapper.querySelector("ul > li:nth-child(2) > ul > li:nth-child(2) > ul > li")?.firstChild as Node, "fifth".length);

        (getRange as jest.Mock).mockReturnValue(range);

        minusIndent(wrapper);
        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>first</li>
                <li>second
                    <ul>
                        <li>third</li>
                    </ul>
                </li>
                <li>fourth
                    <ul>
                        <li>fifth</li>
                    </ul>
                </li>
            </ul>
        `));
    });

    test("Should minus indent for some lists with different nesting level", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>first</li>
                <li>second
                    <ul>
                        <li>third
                            <ul>
                                <li>fourth</li>
                                <li>fifth</li>
                            </ul>
                        </li>
                    </ul>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(wrapper.querySelector("ul > li:nth-child(2) > ul > li")?.firstChild as Node, "th".length);
        range.setEnd(wrapper.querySelector("ul > li:nth-child(2) > ul > li > ul > li:nth-child(1)")?.firstChild as Node, "fourth".length);

        (getRange as jest.Mock).mockReturnValue(range);

        minusIndent(wrapper);
        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>first</li>
                <li>second</li>
                <li>third
                    <ul>
                        <li>fourth
                            <ul>
                                <li>fifth</li>
                            </ul>
                        </li>
                    </ul>
                </li>
            </ul>
        `));
    });

    test("Should minus indent first ordered list inside unordered list", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>first
                    <ol>
                        <li>second</li>
                        <li>third</li>
                    </ol>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(wrapper.querySelector("ul > li > ol > li:nth-child(1)")?.firstChild as Node, "se".length);
        range.setEnd(wrapper.querySelector("ul > li > ol > li:nth-child(1)")?.firstChild as Node, "second".length);

        (getRange as jest.Mock).mockReturnValue(range);

        minusIndent(wrapper);
        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>first</li>
            </ul>
            <ol>
                <li>second
                    <ol>
                        <li>third</li>
                    </ol>
                </li>
            </ol>
        `));
    });

    test("Should minus indent two ordered list inside unordered list", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>first
                    <ol>
                        <li>second</li>
                        <li>third</li>
                    </ol>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(wrapper.querySelector("ul > li > ol > li:nth-child(1)")?.firstChild as Node, "se".length);
        range.setEnd(wrapper.querySelector("ul > li > ol > li:nth-child(2)")?.firstChild as Node, "third".length);

        (getRange as jest.Mock).mockReturnValue(range);

        minusIndent(wrapper);
        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>first</li>
            </ul>
            <ol>
                <li>second</li>
                <li>third</li>
            </ol>
        `));
    });

    test("Should minus indent middle ordered list inside unordered list", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>first</li>
                <li>second
                    <ol>
                        <li>third</li>
                        <li>fourth</li>
                        <li>fifth</li>
                    </ol>
                </li>
                <li>six</li>
            </ul>
        `);

        const range = new Range();
        range.setStart(wrapper.querySelector("ul > li:nth-child(2) > ol > li:nth-child(2)")?.firstChild as Node, "fo".length);
        range.setEnd(wrapper.querySelector("ul > li:nth-child(2) > ol > li:nth-child(2)")?.firstChild as Node, "fourth".length);
        (getRange as jest.Mock).mockReturnValue(range);

        minusIndent(wrapper);
        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>first</li>
                <li>second
                    <ol>
                        <li>third</li>
                    </ol>
                </li>
            </ul>
            <ol>
                <li>fourth
                    <ol>
                        <li>fifth</li>
                    </ol>
                </li>
            </ol>
            <ul>
                <li>six</li>
            </ul>
        `));
    });

    test("Should minus indent nested unordered list before ordered list", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>first
                    <ol>
                        <li>second
                            <ul>
                                <li>third</li>
                            </ul>
                            <ol>
                                <li>fourth</li>
                            </ol>
                        </li>
                    </ol>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(wrapper.querySelector("ul > li > ol > li > ul > li")?.firstChild as Node, "th".length);
        range.setEnd(wrapper.querySelector("ul > li > ol > li > ul > li")?.firstChild as Node, "third".length);

        (getRange as jest.Mock).mockReturnValue(range);

        minusIndent(wrapper);
        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>first
                    <ol>
                        <li>second</li>
                    </ol>    
                    <ul>
                        <li>third
                            <ol>
                                <li>fourth</li>
                            </ol>                        
                        </li>
                    </ul>
                </li>
            </ul>
        `));
    });

    test("Should minus indent multiple nested unordered list with different node names", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>first
                    <ol>
                        <li>second
                            <ul>
                                <li>third</li>
                            </ul>
                            <ol>
                                <li>fourth</li>
                            </ol>
                        </li>
                    </ol>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(wrapper.querySelector("ul > li > ol > li > ul > li")?.firstChild as Node, "th".length);
        range.setEnd(wrapper.querySelector("ul > li > ol > li > ol > li")?.firstChild as Node, "fourth".length);

        (getRange as jest.Mock).mockReturnValue(range);

        minusIndent(wrapper);
        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>first
                    <ol>
                        <li>second</li>
                    </ol>
                    <ul>
                        <li>third</li>
                    </ul>
                    <ol>
                        <li>fourth</li>
                    </ol>
                </li>
            </ul>
        `));
    });

    test("Should minus indent for nested list wrappers with different types", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>first</li>
                <li>second
                    <ol>
                        <li>third
                            <ul>
                                <li>fourth
                                    <ol>
                                        <li>fifth</li>
                                    </ol>
                                </li>
                            </ul>
                        </li>
                    </ol>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(wrapper.querySelector("ul > li > ol > li")?.firstChild as Node, "th".length);
        range.setEnd(wrapper.querySelector("ul > li > ol > li > ul > li > ol > li")?.firstChild as Node, "fifth".length);

        (getRange as jest.Mock).mockReturnValue(range);

        minusIndent(wrapper);
        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>first</li>
                <li>second</li>
            </ul>
            <ol>
                <li>third
                    <ul>
                        <li>fourth
                            <ol>
                                <li>fifth</li>
                            </ol>
                        </li>
                    </ul>
                </li>
            </ol>
        `));
    });

    test("Should minus indent for nested list wrappers with different types and nested levels", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>first
                    <ol>
                        <li>second
                            <ul>
                                <li class="start">third</li>
                            </ul>
                            <ol>
                                <li>fourth</li>
                            </ol>
                            <ul>
                                <li>fifth
                                    <ol>
                                        <li class="end">six</li>
                                    </ol>
                                </li>
                            </ul>
                        </li>
                    </ol>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(wrapper.querySelector(".start")?.firstChild as Node, "th".length);
        range.setEnd(wrapper.querySelector(".end")?.firstChild as Node, "six".length);

        (getRange as jest.Mock).mockReturnValue(range);

        minusIndent(wrapper);
        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>first
                    <ol>
                        <li>second</li>
                    </ol>
                    <ul>
                        <li class="start">third</li>
                    </ul>
                    <ol>
                        <li>fourth</li>
                    </ol>
                    <ul>
                        <li>fifth
                            <ol>
                                <li class="end">six</li>
                            </ol>
                        </li>
                    </ul>
                </li>
            </ul>
        `));
    });

    test("Should minus indent two same level different type lists", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>first
                    <ol>
                        <li class="start">second</li>
                    </ol>
                    <ul>
                        <li class="end">third</li>
                    </ul>
                    <ol>
                        <li>fourth</li>
                    </ol>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(wrapper.querySelector(".start")?.firstChild as Node, "se".length);
        range.setEnd(wrapper.querySelector(".end")?.firstChild as Node, "thi".length);

        (getRange as jest.Mock).mockReturnValue(range);

        minusIndent(wrapper);
        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>first</li>
            </ul>
            <ol>
                <li class="start">second</li>
            </ol>
            <ul>
                <li class="end">third
                    <ol>
                        <li>fourth</li>
                    </ol>
                </li>
            </ul>
        `));
    });
});