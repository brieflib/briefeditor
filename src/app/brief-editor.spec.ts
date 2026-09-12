import {createWrapper, expectHtml, getFirstChild} from "@/core/shared/test-util";
import {getRange} from "@/core/shared/range-util";
import BriefEditor from "@/brief-editor";

jest.mock("/asset/global.css", () => "");
jest.mock("@/component/editor/asset/editor.css", () => "");
jest.mock("@/component/toolbar-icon/asset/toolbar-icon.css?inline=true", () => "");
jest.mock("@/component/popup/asset/table-dropdown.css?inline=true", () => "");
jest.mock("@/component/table/asset/table-control.css?inline=true", () => "");
jest.mock("@/component/popup/asset/tooltip.css?inline=true", () => "");
jest.mock("./core/shared/range-util", () => ({
        getRange: jest.fn()
    })
);

describe("BriefEditor API", () => {
    test("Should wrap in tag and add class", () => {
        const wrapper = createWrapper(`
            <div id="be-editor">
                <span class="start">zero</span>
            </div>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, "span"), "".length);
        range.setEnd(getFirstChild(wrapper, "span"), "zero".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const briefEditor = new BriefEditor({
            hasToolbar: false
        });

        range.setStart(getFirstChild(wrapper, "span"), "".length);
        range.setEnd(getFirstChild(wrapper, "span"), "zero".length);
        (getRange as jest.Mock).mockReturnValue(range);

        briefEditor.toggleTag("EM", {class: "zero"});

        expectHtml((wrapper.querySelector("#be-editor") as HTMLElement).innerHTML, `
            <em>
                <span>zero</span>
            </em>
        `);
    });

    test("Should change first level and add class", () => {
        const wrapper = createWrapper(`
            <div id="be-editor">
                <h1>
                    <em class="start">zero</em>
                </h1>
            </div>
        `);

        (getRange as jest.Mock).mockImplementation(() => {
            const range = new Range();
            range.setStart(wrapper.querySelector("em")?.firstChild ?? wrapper.querySelector("em") as Node, "".length);
            range.setEnd(wrapper.querySelector("em")?.firstChild ?? wrapper.querySelector("em") as Node, "".length);
            return range;
        });


        const briefEditor = new BriefEditor({
            hasToolbar: false
        });

        briefEditor.toggleTag("P", {class: "zero"});

        expectHtml((wrapper.querySelector("#be-editor") as HTMLElement).innerHTML, `
            <p class="zero">
                <em>zero</em>
            </p>            
        `);
    });

    test("Should wrap in A tag and add href and class", () => {
        const wrapper = createWrapper(`
            <div id="be-editor">
                <p>
                    <em class="start">zero</em>
                </p>              
            </div>
        `);

        const range = new Range();
        range.setStart(getFirstChild(wrapper, "em"), "".length);
        range.setEnd(getFirstChild(wrapper, "em"), "zero".length);
        (getRange as jest.Mock).mockReturnValue(range);

        const briefEditor = new BriefEditor({
            hasToolbar: false
        });

        range.setStart(getFirstChild(wrapper, "em"), "".length);
        range.setEnd(getFirstChild(wrapper, "em"), "zero".length);
        (getRange as jest.Mock).mockReturnValue(range);

        briefEditor.toggleTag("A", {class: "zero", href: "zero"});

        expectHtml((wrapper.querySelector("#be-editor") as HTMLElement).innerHTML, `
            <p>
                <a href="zero">
                    <em>zero</em>
                </a>
            </p>                   
        `);
    });

    test("Should wrap in ordered list and set class", () => {
        const wrapper = createWrapper(`
            <div id="be-editor">
                <p>
                    <em class="start">zero</em>
                </p>
            </div>
        `);

        (getRange as jest.Mock).mockImplementation(() => {
            const range = new Range();
            range.setStart(wrapper.querySelector("em")?.firstChild ?? wrapper.querySelector("em") as Node, "".length);
            range.setEnd(wrapper.querySelector("em")?.firstChild ?? wrapper.querySelector("em") as Node, "".length);
            return range;
        });

        const briefEditor = new BriefEditor({
            hasToolbar: false
        });

        briefEditor.toggleTag("ol", {class: "zero"});

        expectHtml((wrapper.querySelector("#be-editor") as HTMLElement).innerHTML, `
            <ol class="zero">
                <li>
                    <em>zero</em>
                </li>
            </ol>
        `);
    });

    test("Should set class attribute", () => {
        const wrapper = createWrapper(`
            <div id="be-editor">
                <p>
                    <em class="start">zero</em>
                </p>
            </div>
        `);

        (getRange as jest.Mock).mockImplementation(() => {
            const range = new Range();
            range.setStart(getFirstChild(wrapper, "em"), "".length);
            range.setEnd(getFirstChild(wrapper, "em"), "zero".length);
            (getRange as jest.Mock).mockReturnValue(range);
            return range;
        });

        const briefEditor = new BriefEditor({
            hasToolbar: false
        });

        briefEditor.changeAttribute("em", {class: "zero"});

        expectHtml((wrapper.querySelector("#be-editor") as HTMLElement).innerHTML, `
            <p>
                <em class="zero">zero</em>
            </p>
        `);
    });
});