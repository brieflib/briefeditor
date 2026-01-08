import {createWrapper, expectHtml, getFirstChild} from "@/core/shared/test-util";
import {getRange} from "@/core/shared/range-util";
import BriefEditor from "@/brief-editor";

jest.mock("/asset/global.css", () => "");
jest.mock("@/component/editor/asset/editor.css", () => "");
jest.mock("@/component/toolbar-icon/asset/toolbar-icon.css?inline=true", () => "");
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

        const briefEditor = new BriefEditor({
            hasToolbar: false
        });

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "zero".length);
        (getRange as jest.Mock).mockReturnValue(range);

        briefEditor.toggleTag("EM", {class: "zero"});

        expectHtml((wrapper.querySelector("#be-editor") as HTMLElement).innerHTML, `
            <span class="start">
                <em class="zero">zero</em>
            </span>
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

        const briefEditor = new BriefEditor({
            hasToolbar: false
        });

        (getRange as jest.Mock).mockImplementation(() => {
            const range = new Range();
            range.setStart(wrapper.querySelector(".start")?.firstChild ?? wrapper.querySelector(".start") as Node, "".length);
            range.setEnd(wrapper.querySelector(".start")?.firstChild ?? wrapper.querySelector(".start") as Node, "".length);
            return range;
        });

        briefEditor.toggleTag("P", {class: "zero"});

        expectHtml((wrapper.querySelector("#be-editor") as HTMLElement).innerHTML, `
            <p class="zero">
                <em class="start">zero</em>
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

        const briefEditor = new BriefEditor({
            hasToolbar: false
        });

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "zero".length);
        (getRange as jest.Mock).mockReturnValue(range);

        briefEditor.toggleTag("A", {class: "zero", href: "zero"});

        expectHtml((wrapper.querySelector("#be-editor") as HTMLElement).innerHTML, `
            <p>
                <a class="zero" href="zero">
                    <em class="start">zero</em>
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

        const briefEditor = new BriefEditor({
            hasToolbar: false
        });

        (getRange as jest.Mock).mockImplementation(() => {
            const range = new Range();
            range.setStart(wrapper.querySelector(".start")?.firstChild ?? wrapper.querySelector(".start") as Node, "".length);
            range.setEnd(wrapper.querySelector(".start")?.firstChild ?? wrapper.querySelector(".start") as Node, "".length);
            return range;
        });

        briefEditor.toggleTag("ol", {class: "zero"});

        expectHtml((wrapper.querySelector("#be-editor") as HTMLElement).innerHTML, `
            <ol class="zero">
                <li>
                    <em class="start">zero</em>
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

        const briefEditor = new BriefEditor({
            hasToolbar: false
        });

        const range = new Range();
        range.setStart(getFirstChild(wrapper, ".start"), "".length);
        range.setEnd(getFirstChild(wrapper, ".start"), "zero".length);
        (getRange as jest.Mock).mockReturnValue(range);

        briefEditor.changeAttribute("em", {class: "zero"});

        expectHtml((wrapper.querySelector("#be-editor") as HTMLElement).innerHTML, `
            <p>
                <em class="zero">zero</em>
            </p>
        `);
    });
});