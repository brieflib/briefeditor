import {getRange} from "@/core/shared/range-util";
import {isMinusIndentEnabled, isPlusIndentEnabled, minusIndent, plusIndent} from "@/core/list/list";
import {createWrapper, getFirstChild, getLastChild, replaceSpaces} from "@/core/shared/test-util";

jest.mock("../shared/range-util", () => ({
        getRange: jest.fn()
    })
);

describe("Is plus indent enabled", () => {
    test("Should not allow plus indent for three direct descendant li", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start">zero</li>
                <li>first</li>
                <li class="end">second</li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "se".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const isEnabled = isPlusIndentEnabled(wrapper);

        expect(isEnabled).toBe(false);
    });

    test("Should not allow plus indent if range contains not li elements", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start">zero</li>
                <li>first</li>
            </ul>
            <p class="end">second</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "se".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const isEnabled = isPlusIndentEnabled(wrapper);

        expect(isEnabled).toBe(false);
    });

    test("Should not allow plus indent if previous li has less nesting", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero</li>
                <li>first
                    <ul>
                        <li class="start">second</li>
                    </ul>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "se".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "second".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const isEnabled = isPlusIndentEnabled(wrapper);

        expect(isEnabled).toBe(false);
    });

    test("Should allow plus indent for two lists", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero</li>
                <li class="start">first
                    <ul>
                        <li class="end">second</li>
                    </ul>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "fi".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "second".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const isEnabled = isPlusIndentEnabled(wrapper);

        expect(isEnabled).toBe(true);
    });

    test("Should allow plus indent for list", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero</li>
                <li class="start">first</li>             
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "fi".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "first".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const isEnabled = isPlusIndentEnabled(wrapper);

        expect(isEnabled).toBe(true);
    });

    test("Should allow plus indent for an ordered list after an unordered list", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero</li>         
            </ul>
            <ol>
                <li class="start">first</li> 
            </ol>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "fi".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "first".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const isEnabled = isPlusIndentEnabled(wrapper);

        expect(isEnabled).toBe(true);
    });
});

describe("Plus indent", () => {
    test("Should indent two direct descendent lists", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero</li>
                <li class="start">first</li>
                <li class="end">second</li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "fi".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "second".length);
        (getRange as jest.Mock).mockReturnValue(range);

        plusIndent(wrapper);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>zero
                    <ul>
                        <li class="start">first</li>
                        <li class="end">second</li>
                    </ul>
                </li>
            </ul>
        `));
    });

    test("Should indent one direct descendent lists when cursor at the end of the first", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero</li>
                <li class="start">first</li>
                <li class="end">second</li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "first".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "second".length);
        (getRange as jest.Mock).mockReturnValue(range);

        plusIndent(wrapper);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>zero</li>
                <li class="start">first
                    <ul>
                        <li class="end">second</li>
                    </ul>
                </li>
            </ul>
        `));
    });

    test("Should indent list with nested list", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero</li>
                <li class="start">fi
                    <strong class="end">rst</strong>
                    <ul>
                        <li>second</li>
                    </ul>
                </li>            
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "fi".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "rst".length);
        (getRange as jest.Mock).mockReturnValue(range);

        plusIndent(wrapper);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>zero
                    <ul>
                        <li class="start">fi
                            <strong class="end">rst</strong>
                        </li>
                        <li>second</li>
                    </ul>
                </li>
            </ul>
        `));
    });

    test("Should indent middle list", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero</li>
                <li>first
                    <ul>
                      <li>second</li>
                    </ul>
                </li>
                <li class="start">third
                    <ul>
                      <li>fourth</li>
                    </ul>
                </li>          
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "th".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "third".length);
        (getRange as jest.Mock).mockReturnValue(range);

        plusIndent(wrapper);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>zero</li>
                <li>first
                    <ul>
                        <li>second</li>
                        <li class="start">third</li>
                        <li>fourth</li>
                    </ul>
                </li>
            </ul>
        `));
    });

    test("Should indent two lists with different nesting level", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero</li>
                <li class="start">first
                    <ul>
                        <li class="end">second</li>
                        <li>third</li>
                    </ul>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "fi".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "second".length);
        (getRange as jest.Mock).mockReturnValue(range);

        plusIndent(wrapper);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>zero
                    <ul>
                        <li class="start">first
                            <ul>
                                <li class="end">second</li>
                            </ul>
                        </li>
                        <li>third</li>
                    </ul>
                </li>          
            </ul>
        `));
    });

    test("Should indent an ordered list located after an unordered list", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero</li>         
            </ul>
            <ol>
                <li class="start">first</li> 
            </ol>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "fi".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "first".length);
        (getRange as jest.Mock).mockReturnValue(range);

        plusIndent(wrapper);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>zero
                    <ol>
                        <li class="start">first</li>
                    </ol>
                </li>          
            </ul>
        `));
    });

    test("Should indent an ordered list (with child) located after an unordered list", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero</li>         
            </ul>
            <ol>
                <li class="start">first
                    <ol>
                        <li>second</li>
                    </ol>
                </li>
            </ol>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "fi".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "first".length);
        (getRange as jest.Mock).mockReturnValue(range);

        plusIndent(wrapper);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>zero
                    <ol>
                        <li class="start">first</li>
                        <li>second</li>
                    </ol>
                </li>          
            </ul>
        `));
    });

    test("Should indent list containing an ordered list", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero</li> 
                <li class="start">first
                    <ol>
                        <li>second</li> 
                    </ol>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "fi".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "first".length);
        (getRange as jest.Mock).mockReturnValue(range);

        plusIndent(wrapper);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>zero
                    <ul>
                        <li class="start">first</li>
                    </ul>
                    <ol>
                        <li>second</li>
                    </ol>
                </li>         
            </ul>
        `));
    });

    test("Should indent an ordered list after an unordered list", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero</li>
            </ul>
            <ol>
                <li class="start">first</li>
                <li>second</li>
            </ol>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "fi".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "first".length);
        (getRange as jest.Mock).mockReturnValue(range);

        plusIndent(wrapper);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>zero
                    <ol>
                        <li class="start">first</li>
                    </ol>
                </li>
            </ul>
            <ol>
                <li>second</li>
            </ol>
        `));
    });

    test("Should indent last ordered list after an unordered list", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero</li>         
            </ul>
            <ol>
                <li>first</li>
                <li class="start">second</li>
            </ol>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "se".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "second".length);
        (getRange as jest.Mock).mockReturnValue(range);

        plusIndent(wrapper);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>zero</li>
            </ul>
            <ol>
                <li>first
                    <ol>
                        <li class="start">second</li>
                    </ol>               
                </li>
            </ol>
        `));
    });

    test("Should indent list wrappers with different types", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero
                    <ol>
                        <li>first</li>
                    </ol>
                    <ul>
                        <li class="start">second</li>
                    </ul>
                    <ol>
                        <li class="end">third</li>
                    </ol>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "se".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "third".length);
        (getRange as jest.Mock).mockReturnValue(range);

        plusIndent(wrapper);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>zero
                    <ol>
                        <li>first
                            <ul>
                                <li class="start">second</li>
                            </ul>
                            <ol>
                                <li class="end">third</li>
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
        const wrapper = createWrapper(`
            <ul>
                <li class="start">zero</li>
                <li>first</li>
                <li class="end">second</li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "se".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const isEnabled = isMinusIndentEnabled(wrapper);

        expect(isEnabled).toBe(false);
    });

    test("Should not allow minus indent if range contains not li elements", () => {
        const wrapper = createWrapper(`
            <ul>
                <li class="start">zero</li>
                <li>first</li>
            </ul>
            <p class="end">second</p>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "ze".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "se".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const isEnabled = isMinusIndentEnabled(wrapper);

        expect(isEnabled).toBe(false);
    });

    test("Should allow minus indent for nested li", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero</li>
                <li>first
                    <ul>
                        <li class="start">second</li>
                    </ul>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "se".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "second".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const isEnabled = isMinusIndentEnabled(wrapper);

        expect(isEnabled).toBe(true);
    });

    test("Should not allow minus indent for list with one level deep nesting", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero</li>
                <li class="start">first
                    <ul>
                        <li class="end">second</li>
                    </ul>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "fi".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "second".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const isEnabled = isMinusIndentEnabled(wrapper);

        expect(isEnabled).toBe(false);
    });

    test("Should allow minus indent for two list  with deep level deep nesting", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero
                    <ul>
                        <li class="start">first</li>
                        <li class="end">second</li>
                    </ul>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "fi".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "second".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const isEnabled = isMinusIndentEnabled(wrapper);

        expect(isEnabled).toBe(true);
    });

    test("Should not allow minus indent if next li has deeper nesting", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero
                    <ul>
                        <li class="start">first
                            <ul>
                                <li>second</li>
                            </ul>
                        </li>
                    </ul>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "fi".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "first".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const isEnabled = isMinusIndentEnabled(wrapper);

        expect(isEnabled).toBe(false);
    });

    test("Should allow minus indent for list with different nesting level", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero</li>
                <li>first
                    <ul>
                        <li class="start">second
                            <ul>
                                <li class="end">third</li>
                                <li>fourth</li>
                            </ul>
                        </li>
                    </ul>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "se".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "third".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const isEnabled = isMinusIndentEnabled(wrapper);

        expect(isEnabled).toBe(true);
    });
});

describe("Minus indent", () => {
    test("Should minus indent two nested lists", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero</li>
                <li>first
                    <ul>
                        <li class="start">second</li>
                        <li class="end">third</li>
                        <li>fourth</li>
                    </ul>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "se".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "third".length);
        (getRange as jest.Mock).mockReturnValue(range);

        minusIndent(wrapper);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>zero</li>
                <li>first</li>
                <li class="start">second</li>
                <li class="end">third
                    <ul>
                        <li>fourth</li>
                    </ul>
                </li>
            </ul>
        `));
    });

    test("Should minus indent middle nested list", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero</li>
                <li>first
                    <ul>
                        <li>second</li>
                        <li class="start">third</li>
                        <li>fourth</li>
                    </ul>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "th".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "third".length);
        (getRange as jest.Mock).mockReturnValue(range);

        minusIndent(wrapper);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>zero</li>
                <li>first
                    <ul>
                        <li>second</li>
                    </ul>
                </li>
                <li class="start">third
                    <ul>
                        <li>fourth</li>
                    </ul>
                </li>
            </ul>
        `));
    });

    test("Should minus indent last nested list", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero</li>
                <li>first
                    <ul>
                        <li>second</li>
                        <li class="start">third</li>
                    </ul>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "th".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "third".length);
        (getRange as jest.Mock).mockReturnValue(range);

        minusIndent(wrapper);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>zero</li>
                <li>first
                    <ul>
                        <li>second</li>
                    </ul>
                </li>
                <li class="start">third</li>
            </ul>
        `));
    });

    test("Should minus indent lists with different nesting level", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero</li>
                <li>first
                    <ul>
                        <li class="start">second
                            <ul>
                                <li class="end">third</li>
                            </ul>
                        </li>
                    </ul>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "se".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "third".length);
        (getRange as jest.Mock).mockReturnValue(range);

        minusIndent(wrapper);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>zero</li>
                <li>first</li>
                <li class="start">second
                    <ul>
                        <li class="end">third</li>
                    </ul>
                </li>
            </ul>
        `));
    });

    test("Should minus indent lists with different nesting level and additional previous list", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero</li>
                <li>first
                    <ul>
                        <li>second</li>
                        <li class="start">third
                            <ul>
                                <li class="end">fourth</li>
                            </ul>
                        </li>
                    </ul>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "th".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "fourth".length);
        (getRange as jest.Mock).mockReturnValue(range);

        minusIndent(wrapper);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>zero</li>
                <li>first
                    <ul>
                        <li>second</li>
                    </ul>
                </li>
                <li class="start">third
                    <ul>
                        <li class="end">fourth</li>
                    </ul>
                </li>
            </ul>
        `));
    });

    test("Should minus indent for some lists with different nesting level", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero</li>
                <li>first
                    <ul>
                        <li class="start">second
                            <ul>
                                <li class="end">third</li>
                                <li>fourth</li>
                            </ul>
                        </li>
                    </ul>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "se".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "third".length);
        (getRange as jest.Mock).mockReturnValue(range);

        minusIndent(wrapper);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>zero</li>
                <li>first</li>
                <li class="start">second
                    <ul>
                        <li class="end">third
                            <ul>
                                <li>fourth</li>
                            </ul>
                        </li>
                    </ul>
                </li>
            </ul>
        `));
    });

    test("Should minus indent first ordered list located inside unordered list", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero
                    <ol>
                        <li class="start">first</li>
                        <li>second</li>
                    </ol>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "fi".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "first".length);
        (getRange as jest.Mock).mockReturnValue(range);

        minusIndent(wrapper);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>zero</li>
            </ul>
            <ol>
                <li class="start">first
                    <ol>
                        <li>second</li>
                    </ol>
                </li>
            </ol>
        `));
    });

    test("Should minus indent two ordered list inside unordered list", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero
                    <ol>
                        <li class="start">first</li>
                        <li class="end">second</li>
                    </ol>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "fi".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "second".length);
        (getRange as jest.Mock).mockReturnValue(range);

        minusIndent(wrapper);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>zero</li>
            </ul>
            <ol>
                <li class="start">first</li>
                <li class="end">second</li>
            </ol>
        `));
    });

    test("Should minus indent middle ordered list inside unordered list", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero</li>
                <li>first
                    <ol>
                        <li>second</li>
                        <li class="start">third</li>
                        <li>fourth</li>
                    </ol>
                </li>
                <li>fifth</li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "th".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "third".length);
        (getRange as jest.Mock).mockReturnValue(range);

        minusIndent(wrapper);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>zero</li>
                <li>first
                    <ol>
                        <li>second</li>
                    </ol>
                </li>
            </ul>
            <ol>
                <li class="start">third
                    <ol>
                        <li>fourth</li>
                    </ol>
                </li>
            </ol>
            <ul>
                <li>fifth</li>
            </ul>
        `));
    });

    test("Should minus indent nested unordered list located before ordered list", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero
                    <ol>
                        <li>first
                            <ul>
                                <li class="start">second</li>
                            </ul>
                            <ol>
                                <li>third</li>
                            </ol>
                        </li>
                    </ol>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "se".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "second".length);
        (getRange as jest.Mock).mockReturnValue(range);

        minusIndent(wrapper);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>zero
                    <ol>
                        <li>first</li>
                    </ol>    
                    <ul>
                        <li class="start">second
                            <ol>
                                <li>third</li>
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
                <li>zero
                    <ol>
                        <li>first
                            <ul>
                                <li class="start">second</li>
                            </ul>
                            <ol>
                                <li class="end">third</li>
                            </ol>
                        </li>
                    </ol>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "se".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "third".length);
        (getRange as jest.Mock).mockReturnValue(range);

        minusIndent(wrapper);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>zero
                    <ol>
                        <li>first</li>
                    </ol>
                    <ul>
                        <li class="start">second</li>
                    </ul>
                    <ol>
                        <li class="end">third</li>
                    </ol>
                </li>
            </ul>
        `));
    });

    test("Should minus indent for nested list wrappers with different types", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero</li>
                <li>first
                    <ol>
                        <li class="start">second
                            <ul>
                                <li>third
                                    <ol>
                                        <li class="end">fourth</li>
                                    </ol>
                                </li>
                            </ul>
                        </li>
                    </ol>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "se".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "fourth".length);
        (getRange as jest.Mock).mockReturnValue(range);

        minusIndent(wrapper);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>zero</li>
                <li>first</li>
            </ul>
            <ol>
                <li class="start">second
                    <ul>
                        <li>third
                            <ol>
                                <li class="end">fourth</li>
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
                <li>zero
                    <ol>
                        <li>first
                            <ul>
                                <li class="start">second</li>
                            </ul>
                            <ol>
                                <li>third</li>
                            </ol>
                            <ul>
                                <li>fourth
                                    <ol>
                                        <li class="end">fifth</li>
                                    </ol>
                                </li>
                            </ul>
                        </li>
                    </ol>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "se".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "fifth".length);
        (getRange as jest.Mock).mockReturnValue(range);

        minusIndent(wrapper);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>zero
                    <ol>
                        <li>first</li>
                    </ol>
                    <ul>
                        <li class="start">second</li>
                    </ul>
                    <ol>
                        <li>third</li>
                    </ol>
                    <ul>
                        <li>fourth
                            <ol>
                                <li class="end">fifth</li>
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
                <li>zero
                    <ol>
                        <li class="start">first</li>
                    </ol>
                    <ul>
                        <li class="end">second</li>
                    </ul>
                    <ol>
                        <li>third</li>
                    </ol>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "fi".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "second".length);
        (getRange as jest.Mock).mockReturnValue(range);

        minusIndent(wrapper);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>zero</li>
            </ul>
            <ol>
                <li class="start">first</li>
            </ol>
            <ul>
                <li class="end">second
                    <ol>
                        <li>third</li>
                    </ol>
                </li>
            </ul>
        `));
    });

    test("Move nested lis to same level list wrapper", () => {
        const wrapper = createWrapper(`
            <ol>
                <li>zero
                    <ol>
                        <li>first
                            <ol>
                                <li class="start">second
                                    <ol>
                                        <li>third</li>
                                    </ol>
                                </li>
                                <li class="end">fourth</li>
                            </ol>
                        </li>
                    </ol>
                </li>
            </ol>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "se".length);
        range.setEnd(getFirstChild(wrapper, ".end"), "fourth".length);
        (getRange as jest.Mock).mockReturnValue(range);

        minusIndent(wrapper);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ol>
                <li>zero
                    <ol>
                        <li>first</li>
                        <li class="start">second
                            <ol>
                                <li>third</li>
                            </ol>
                        </li>
                        <li class="end">fourth</li>
                    </ol>
                </li>
            </ol>
        `));
    });

    test("Move nested li to same level list wrapper", () => {
        const wrapper = createWrapper(`
            <ol>
                <li>zero
                    <ol>
                        <li>first
                            <ol>
                                <li>second
                                    <ol>
                                        <li class="start">third</li>
                                    </ol>
                                </li>
                                <li>fourth</li>
                            </ol>
                        </li>
                    </ol>
                </li>
            </ol>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "th".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "third".length);
        (getRange as jest.Mock).mockReturnValue(range);

        minusIndent(wrapper);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ol>
                <li>zero
                    <ol>
                        <li>first
                            <ol>
                                <li>second</li>
                                <li class="start">third</li>
                                <li>fourth</li>
                            </ol>
                        </li>
                    </ol>
                </li>
            </ol>
        `));
    });

    test("Minus indent with strong tag inside li", () => {
        const wrapper = createWrapper(`
            <ol>
                <li>zero
                    <ol>
                        <li class="start">
                            <strong>fi</strong>
                            rst
                        </li>
                    </ol>
                </li>
            </ol>
        `);

        const range = new Range();
        range.setStart(getLastChild(wrapper, ".start"), "r".length);
        range.setEnd(getLastChild(wrapper, ".start"), "rst".length);
        (getRange as jest.Mock).mockReturnValue(range);

        minusIndent(wrapper);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ol>
                <li>zero</li>
                <li class="start">
                    <strong>fi</strong>
                    rst
                </li>
            </ol>
        `));
    });

    test("Minus indent for deep nested li in mixed list", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero
                    <ol>
                        <li>first
                            <ul>
                                <li>second
                                    <ol>
                                        <li class="start">third</li>
                                    </ol>
                                </li>
                            </ul>
                        </li>
                    </ol>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "t".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "third".length);
        (getRange as jest.Mock).mockReturnValue(range);

        minusIndent(wrapper);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>zero
                    <ol>
                        <li>first
                            <ul>
                                <li>second</li>
                            </ul>
                            <ol>
                                <li class="start">third</li>
                            </ol>
                        </li>
                    </ol>
                </li>
            </ul>
        `));
    });

    test("Minus indent for ol inside li in mixed list", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero
                    <ol>
                        <li>first
                            <ul>
                                <li>second</li>
                            </ul>
                            <ol>
                                <li class="start">third</li>
                            </ol>
                        </li>
                    </ol>
                </li>
            </ul>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "t".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "third".length);
        (getRange as jest.Mock).mockReturnValue(range);

        minusIndent(wrapper);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>zero
                    <ol>
                        <li>first
                            <ul>
                                <li>second</li>
                            </ul>
                        </li>
                        <li class="start">third</li>
                    </ol>
                </li>
            </ul>
        `));
    });
});