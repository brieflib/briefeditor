import {
    createWrapper,
    expectCursor,
    expectHtml,
    getFirstChild,
    getLastChild, keydown,
    selectRange
} from "@/core/shared/test-util";
import {handleKeyboardEvent} from "@/core/keyboard/keyboard";
import {getCursorAnchor, resolveCursorAnchor} from "@/core/cursor/util/cursor-util";
import {getCursorPosition} from "@/core/shared/type/cursor-position";
import {Action} from "@/core/command/type/command";
import {AvailableClasses} from "@/core/shared/available-classes";

jest.mock("../shared/range-util", () => ({
        getRange: jest.fn()
    })
);

beforeAll(() => {
    const availableClasses = AvailableClasses.getInstance();
    availableClasses.setClasses(["start", "end"]);
});

describe("Keyboard events", () => {
    test("Press enter when cursor is at start of paragraph after paragraph", () => {
        const wrapper = createWrapper(`
            <p>zero</p><p class="start">first</p>
        `);

        let first = getFirstChild(wrapper, ".start");
        selectRange(first, "".length, first, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Enter"));

        handleKeyboardEvent(wrapper, keydown("Enter"));
        expectHtml(wrapper.innerHTML, `
            <p>zero</p><p class="start"><br></p><p>first</p>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        first = getFirstChild(wrapper, "p:nth-child(3)");
        expectCursor(cursorPosition, first, "".length);
    });

    test("Press enter when cursor is at the end of paragraph before paragraph", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p><p>first</p>
        `);

        const zero = getFirstChild(wrapper, ".start");
        selectRange(zero, "zero".length, zero, "zero".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Enter"));

        handleKeyboardEvent(wrapper, keydown("Enter"));
        expectHtml(wrapper.innerHTML, `
            <p class="start">zero</p><p><br></p><p>first</p>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const br = getFirstChild(wrapper, "p:nth-child(2)");
        expectCursor(cursorPosition, br, "".length);
    });

    test("Pressing enter when cursor is at the end of paragraph before the next paragraph. Cursor position should be between paragraphs", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p><p>first</p>
        `);

        const zero = getFirstChild(wrapper, ".start");
        selectRange(zero, "zero".length, zero, "zero".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Enter"));

        handleKeyboardEvent(wrapper, keydown("Enter"));

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const br = getFirstChild(wrapper, "p:nth-child(2)");
        expectCursor(cursorPosition, br, "".length);
    });

    test("Pressing enter when cursor is at the start of paragraph after the next paragraph. Cursor position should be between paragraphs", () => {
        const wrapper = createWrapper(`
            <p>zero</p>
            <p class="start">first</p>
        `);

        let first = getFirstChild(wrapper, ".start");
        selectRange(first, "".length, first, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Enter"));

        handleKeyboardEvent(wrapper, keydown("Enter"));
        expectHtml(wrapper.innerHTML, `
            <p>zero</p>
            <p class="start"><br></p>
            <p>first</p>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        first = getFirstChild(wrapper, ":nth-child(3)");
        expectCursor(cursorPosition, first, "".length);
    });

    test("After pressing enter when cursor is at the br cursor position should be at next br", () => {
        const wrapper = createWrapper(`
            <p>zero</p><p class="start"><br></p><p>first</p>
        `);

        let br = getFirstChild(wrapper, ".start");
        selectRange(br, "".length, br, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Enter"));

        handleKeyboardEvent(wrapper, keydown("Enter"));
        expectHtml(wrapper.innerHTML, `
            <p>zero</p><p class="start"><br></p><p><br></p><p>first</p>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        br = getFirstChild(wrapper, "p:nth-child(3)");
        expectCursor(cursorPosition, br, "".length);
    });

    test("Press enter when cursor spans selection", () => {
        const wrapper = createWrapper(`
            <p class="start">zerofirstsecond</p>
        `);

        const zeroFirstSecond = getFirstChild(wrapper, ".start");
        selectRange(zeroFirstSecond, "zero".length, zeroFirstSecond, "zerofirst".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Enter"));

        handleKeyboardEvent(wrapper, keydown("Enter"));
        expectHtml(wrapper.innerHTML, `
            <p class="start">zero</p><p>second</p>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const second = getFirstChild(wrapper, "p:nth-child(2)");
        expectCursor(cursorPosition, second, "".length);
    });

    test("Press enter when cursor spans selection of strong", () => {
        const wrapper = createWrapper(`
            <p>zero<strong class="start">first</strong>second</p>
        `);

        const first = getFirstChild(wrapper, ".start");
        selectRange(first, "".length, first, "first".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Enter"));

        handleKeyboardEvent(wrapper, keydown("Enter"));
        expectHtml(wrapper.innerHTML, `
            <p>zero</p><p>second</p>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const second = getFirstChild(wrapper, "p + p");
        expectCursor(cursorPosition, second, "".length);
    });

    test("Press enter when cursor spans selection of part of strong", () => {
        const wrapper = createWrapper(`
            <p>zero<strong class="start">first</strong>second</p>
        `);

        const first = getFirstChild(wrapper, ".start");
        selectRange(first, "".length, first, "fir".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Enter"));

        handleKeyboardEvent(wrapper, keydown("Enter"));
        expectHtml(wrapper.innerHTML, `
            <p>zero</p><p><strong class="start">st</strong>second</p>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const st = getFirstChild(wrapper, ".start");
        expectCursor(cursorPosition, st, "".length);
    });

    test("Press enter when cursor is at the beginning of tag", () => {
        const wrapper = createWrapper(`
            <p class="start">zero<strong>first</strong>second</p>
        `);

        const zero = getFirstChild(wrapper, ".start");
        selectRange(zero, "zero".length, zero, "zero".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Enter"));

        handleKeyboardEvent(wrapper, keydown("Enter"));
        expectHtml(wrapper.innerHTML, `
            <p class="start">zero</p><p><strong>first</strong>second</p>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const first = getFirstChild(wrapper, "strong");
        expectCursor(cursorPosition, first, "".length);
    });

    test("Press shift+enter when cursor is at the beginning of tag", () => {
        const wrapper = createWrapper(`
            <p class="start">zero<strong>first</strong>second</p>
        `);

        const zero = getFirstChild(wrapper, ".start");
        selectRange(zero, "zero".length, zero, "zero".length);
        const shiftEnter = {action: Action.Keyboard, event: new KeyboardEvent("keydown", {key: "Enter", shiftKey: true})};
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), shiftEnter);

        handleKeyboardEvent(wrapper, shiftEnter);
        expectHtml(wrapper.innerHTML, `
            <p class="start">zero<br><strong>first</strong>second</p>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const first = getFirstChild(wrapper, "strong");
        expectCursor(cursorPosition, first, "".length);
    });

    test("Press delete when selection spans two paragraphs", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p><p class="end">first</p>
        `);

        const zero = getFirstChild(wrapper, ".start");
        const first = getFirstChild(wrapper, ".end");
        selectRange(zero, "ze".length, first, "fir".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Delete"));

        handleKeyboardEvent(wrapper, keydown("Delete"));
        expectHtml(wrapper.innerHTML, `
            <p class="start">zest</p>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const zest = getFirstChild(wrapper, ".start");
        expectCursor(cursorPosition, zest, "ze".length);
    });

    // Items selected whole are emptied into one item rather than dropped, the way a browser leaves an empty
    // line for a selection of whole blocks; the next thing typed or pasted fills it.
    test("Press delete when selection covers a whole list followed by a paragraph", () => {
        const wrapper = createWrapper(`
            <ul><li class="start">zero</li><li>first</li><li class="end">second</li></ul><p>third</p>
        `);

        const zero = getFirstChild(wrapper, ".start");
        const second = getFirstChild(wrapper, ".end");
        selectRange(zero, "".length, second, "second".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Delete"));

        handleKeyboardEvent(wrapper, keydown("Delete"));
        expectHtml(wrapper.innerHTML, `
            <ul><li><br></li></ul><p>third</p>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const br = getFirstChild(wrapper, "li");
        expectCursor(cursorPosition, br, "".length);
    });

    test("Press delete when selection covers a whole list after a paragraph", () => {
        const wrapper = createWrapper(`
            <p>zero</p><ul><li class="start">first</li><li>second</li><li class="end">third</li></ul>
        `);

        const first = getFirstChild(wrapper, ".start");
        const third = getFirstChild(wrapper, ".end");
        selectRange(first, "".length, third, "third".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Delete"));

        handleKeyboardEvent(wrapper, keydown("Delete"));
        expectHtml(wrapper.innerHTML, `
            <p>zero</p><ul><li><br></li></ul>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const br = getFirstChild(wrapper, "li");
        expectCursor(cursorPosition, br, "".length);
    });

    test("Press delete when selection covers two whole items of three", () => {
        const wrapper = createWrapper(`
            <ul><li class="start">zero</li><li class="end">first</li><li>second</li></ul>
        `);

        const zero = getFirstChild(wrapper, ".start");
        const first = getFirstChild(wrapper, ".end");
        selectRange(zero, "".length, first, "first".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Delete"));

        handleKeyboardEvent(wrapper, keydown("Delete"));
        expectHtml(wrapper.innerHTML, `
            <ul><li><br></li><li>second</li></ul>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const br = getFirstChild(wrapper, "li");
        expectCursor(cursorPosition, br, 0);
    });

    test("Press delete when selection covers two whole paragraphs of three", () => {
        const wrapper = createWrapper(`
            <p class="start">zero</p><p class="end">first</p><p>second</p>
        `);

        const zero = getFirstChild(wrapper, ".start");
        const first = getFirstChild(wrapper, ".end");
        selectRange(zero, "".length, first, "first".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Delete"));

        handleKeyboardEvent(wrapper, keydown("Delete"));
        expectHtml(wrapper.innerHTML, `
            <p class="start"><br></p><p>second</p>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const br = getFirstChild(wrapper, ".start");
        expectCursor(cursorPosition, br, "".length);
    });

    test("After pressing delete when cursor is at the br cursor position should be at previous br", () => {
        const wrapper = createWrapper(`
            <p>zero</p><p><br></p><p><br></p><p class="start"><br></p><p>first</p>
        `);

        const br = getFirstChild(wrapper, ".start");
        selectRange(br, "".length, br, "".length);
        const cursorAnchor = getCursorAnchor(wrapper, getCursorPosition(), keydown("Delete"));

        handleKeyboardEvent(wrapper, keydown("Delete"));
        expectHtml(wrapper.innerHTML, `
            <p>zero</p><p><br></p><p><br></p><p>first</p>
        `);

        const cursorPosition = resolveCursorAnchor(wrapper, cursorAnchor);
        const first = getFirstChild(wrapper, "p:nth-child(4)");
        expectCursor(cursorPosition, first, "".length);
    });
});

// describe("Typing and deleting characters", () => {
//     function selectText(node: Node, start: number, end: number) {
//         selectRange(node, start, node, end);
//     }
//
//     test("Type a character in the middle of text", () => {
//         const wrapper = createWrapper(`
//             <p class="start">zero</p>
//         `);
//         selectText(getFirstChild(wrapper, ".start"), "ze".length, "ze".length);
//
//         const keyboardEvent = new KeyboardEvent("keydown", {key: "x"});
//         const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);
//
//         expectHtml(wrapper.innerHTML, `
//             <p class="start">zexro</p>
//         `);
//         expect((wrapper.querySelector("p") as HTMLElement).childNodes.length).toBe(1);
//         expectCursor(cursorPosition, getFirstChild(wrapper, ".start"), "zex".length);
//     });
//
//     test("Type a character in an empty paragraph", () => {
//         const wrapper = createWrapper(`
//             <p class="start"><br></p>
//         `);
//         selectText(getFirstChild(wrapper, ".start"), 0, 0);
//
//         const keyboardEvent = new KeyboardEvent("keydown", {key: "a"});
//         const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);
//
//         expectHtml(wrapper.innerHTML, `
//             <p class="start">a</p>
//         `);
//         expectCursor(cursorPosition, getFirstChild(wrapper, ".start"), "a".length);
//     });
//
//     test("Type a character in an empty list item with the caret on the item", () => {
//         const wrapper = createWrapper(`
//             <ul>
//                 <li class="start"><br></li>
//                 <li>next</li>
//             </ul>
//         `);
//         selectText(wrapper.querySelector(".start") as HTMLElement, 0, 0);
//
//         const keyboardEvent = new KeyboardEvent("keydown", {key: "a"});
//         const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);
//
//         expectHtml(wrapper.innerHTML, `
//             <ul>
//                 <li class="start">a</li>
//                 <li>next</li>
//             </ul>
//         `);
//         expectCursor(cursorPosition, getFirstChild(wrapper, ".start"), "a".length);
//     });
//
//     test("Type a character in an empty list item holding a nested list", () => {
//         const wrapper = createWrapper(`
//             <ul>
//                 <li class="start"><br>
//                     <ul>
//                         <li>child</li>
//                     </ul>
//                 </li>
//             </ul>
//         `);
//         selectText(wrapper.querySelector(".start") as HTMLElement, 0, 0);
//
//         const keyboardEvent = new KeyboardEvent("keydown", {key: "a"});
//         const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);
//
//         expectHtml(wrapper.innerHTML, `
//             <ul>
//                 <li class="start">a
//                     <ul>
//                         <li>child</li>
//                     </ul>
//                 </li>
//             </ul>
//         `);
//         expectCursor(cursorPosition, getFirstChild(wrapper, ".start"), "a".length);
//     });
//
//     test("Type a character in an empty list item keeps the placeholder of an empty nested item", () => {
//         const wrapper = createWrapper(`
//             <ul>
//                 <li class="start"><br>
//                     <ul>
//                         <li><br></li>
//                     </ul>
//                 </li>
//             </ul>
//         `);
//         selectText(wrapper.querySelector(".start") as HTMLElement, 0, 0);
//
//         const keyboardEvent = new KeyboardEvent("keydown", {key: "a"});
//         const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);
//
//         expectHtml(wrapper.innerHTML, `
//             <ul>
//                 <li class="start">a
//                     <ul>
//                         <li><br></li>
//                     </ul>
//                 </li>
//             </ul>
//         `);
//         expectCursor(cursorPosition, getFirstChild(wrapper, ".start"), "a".length);
//     });
//
//     test("Press backspace in the middle of text", () => {
//         const wrapper = createWrapper(`
//             <p class="start">zero</p>
//         `);
//         selectText(getFirstChild(wrapper, ".start"), "ze".length, "ze".length);
//
//         const keyboardEvent = new KeyboardEvent("keydown", {key: "Backspace"});
//         const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);
//
//         expectHtml(wrapper.innerHTML, `
//             <p class="start">zro</p>
//         `);
//         expectCursor(cursorPosition, getFirstChild(wrapper, ".start"), "z".length);
//     });
//
//     test("Press delete in the middle of text", () => {
//         const wrapper = createWrapper(`
//             <p class="start">zero</p>
//         `);
//         selectText(getFirstChild(wrapper, ".start"), "ze".length, "ze".length);
//
//         const keyboardEvent = new KeyboardEvent("keydown", {key: "Delete"});
//         const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);
//
//         expectHtml(wrapper.innerHTML, `
//             <p class="start">zeo</p>
//         `);
//         expectCursor(cursorPosition, getFirstChild(wrapper, ".start"), "ze".length);
//     });
//
//     test("Press backspace at the start of text after an inline tag", () => {
//         const wrapper = createWrapper(`
//             <p class="start">ze<strong>ro</strong>tail</p>
//         `);
//         selectText(getLastChild(wrapper, ".start"), 0, 0);
//
//         const keyboardEvent = new KeyboardEvent("keydown", {key: "Backspace"});
//         const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);
//
//         expectHtml(wrapper.innerHTML, `
//             <p class="start">ze<strong>r</strong>tail</p>
//         `);
//         expectCursor(cursorPosition, getFirstChild(wrapper, "strong"), "r".length);
//     });
//
//     test("Press delete at the end of text before an inline tag", () => {
//         const wrapper = createWrapper(`
//             <p class="start">ze<strong>ro</strong></p>
//         `);
//         selectText(getFirstChild(wrapper, ".start"), "ze".length, "ze".length);
//
//         const keyboardEvent = new KeyboardEvent("keydown", {key: "Delete"});
//         const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);
//
//         expectHtml(wrapper.innerHTML, `
//             <p class="start">ze<strong>o</strong></p>
//         `);
//         expectCursor(cursorPosition, getFirstChild(wrapper, "strong"), 0);
//     });
//
//     test("Press backspace on the last character of an inline tag", () => {
//         const wrapper = createWrapper(`
//             <p>ze<strong class="start">r</strong>tail</p>
//         `);
//         selectText(getFirstChild(wrapper, ".start"), "r".length, "r".length);
//
//         const keyboardEvent = new KeyboardEvent("keydown", {key: "Backspace"});
//         const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);
//
//         expectHtml(wrapper.innerHTML, `
//             <p>zetail</p>
//         `);
//         expectCursor(cursorPosition, getFirstChild(wrapper, "p"), "ze".length);
//     });
//
//     test("Press backspace on the last character of the only paragraph", () => {
//         const wrapper = createWrapper(`
//             <p class="start">a</p>
//         `);
//         selectText(getFirstChild(wrapper, ".start"), "a".length, "a".length);
//
//         const keyboardEvent = new KeyboardEvent("keydown", {key: "Backspace"});
//         const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);
//
//         expectHtml(wrapper.innerHTML, `
//             <p class="start"><br></p>
//         `);
//         expect(cursorPosition.startContainer.parentElement).toBe(wrapper.querySelector("p"));
//         expect(cursorPosition.startOffset).toBe(0);
//         expect(cursorPosition.endContainer).toBe(cursorPosition.startContainer);
//         expect(cursorPosition.endOffset).toBe(cursorPosition.startOffset);
//     });
//
//     test("Press backspace after a line break", () => {
//         const wrapper = createWrapper(`
//             <p class="start">a<br>b</p>
//         `);
//         selectText(getLastChild(wrapper, ".start"), 0, 0);
//
//         const keyboardEvent = new KeyboardEvent("keydown", {key: "Backspace"});
//         const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);
//
//         expectHtml(wrapper.innerHTML, `
//             <p>ab</p>
//         `);
//         expectCursor(cursorPosition, getFirstChild(wrapper, "p"), "a".length);
//     });
//
//     test("Press delete before a line break", () => {
//         const wrapper = createWrapper(`
//             <p class="start">a<br>b</p>
//         `);
//         selectText(getFirstChild(wrapper, ".start"), "a".length, "a".length);
//
//         const keyboardEvent = new KeyboardEvent("keydown", {key: "Delete"});
//         const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);
//
//         expectHtml(wrapper.innerHTML, `
//             <p>ab</p>
//         `);
//         expectCursor(cursorPosition, getFirstChild(wrapper, "p"), "a".length);
//     });
//
//     test("Should merge lists when pressing delete before br", () => {
//         const wrapper = createWrapper(`
//             <ol>
//                 <li>zero</li>
//                 <li>first</li>
//                 <li class="start"><br>
//                     <ol><li>second</li></ol>
//                 </li>
//             </ol>
//         `);
//         selectText(getFirstChild(wrapper, ".start"), "".length, "".length);
//
//         const keyboardEvent = new KeyboardEvent("keydown", {key: "Delete"});
//         const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);
//
//         expectHtml(wrapper.innerHTML, `
//             <ol>
//                 <li>zero</li>
//                 <li>first</li>
//                 <li>second</li>
//             </ol>
//         `);
//
//         const expectedContainer = wrapper.querySelector("ol li:last-child")?.firstChild;
//         expectCursor(cursorPosition, expectedContainer, "".length);
//     });
//
//     test("Should merge lists of different types when pressing delete before br", () => {
//         const wrapper = createWrapper(`
//             <ul>
//                 <li class="start"><br>
//                     <ol>
//                         <li>second</li>
//                     </ol>
//                 </li>
//             </ul>
//         `);
//         selectText(getFirstChild(wrapper, ".start"), "".length, "".length);
//
//         const keyboardEvent = new KeyboardEvent("keydown", {key: "Delete"});
//         const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);
//
//         expectHtml(wrapper.innerHTML, `
//             <ul>
//                 <li>second</li>
//             </ul>
//         `);
//
//         const expectedContainer = wrapper.querySelector("ul li")?.firstChild;
//         expectCursor(cursorPosition, expectedContainer, "".length);
//     });
//
//     test("Should merge lists of different types when pressing delete before br 2", () => {
//         const wrapper = createWrapper(`
//             <ol>
//                 <li>zero</li>
//                 <li class="start"><br>
//                     <ul>
//                         <li>first</li>
//                     </ul>
//                 </li>
//             </ol>
//         `);
//         selectText(getFirstChild(wrapper, ".start"), "".length, "".length);
//
//         const keyboardEvent = new KeyboardEvent("keydown", {key: "Delete"});
//         const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);
//
//         expectHtml(wrapper.innerHTML, `
//             <ol>
//                 <li>zero</li>
//                 <li>first</li>
//             </ol>
//         `);
//
//         const expectedContainer = wrapper.querySelector("ol li:last-child")?.firstChild;
//         expectCursor(cursorPosition, expectedContainer, "".length);
//     });
//
//     test("Should merge lists when pressing backspace after br", () => {
//         const wrapper = createWrapper(`
//             <ol>
//                 <li>zero
//                     <ol>
//                         <li>first</li>
//                         <li><br></li>
//                     </ol>
//                 </li>
//                 <li class="start">second</li>
//             </ol>
//         `);
//         selectText(getFirstChild(wrapper, ".start"), "".length, "".length);
//
//         const keyboardEvent = new KeyboardEvent("keydown", {key: "Backspace"});
//         const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);
//
//         expectHtml(wrapper.innerHTML, `
//             <ol>
//                 <li>zero
//                     <ol>
//                         <li>first</li>
//                         <li>second</li>
//                     </ol>
//                 </li>
//             </ol>
//         `);
//
//         const expectedContainer = wrapper.querySelector("ol li ol li:last-child")?.firstChild;
//         expectCursor(cursorPosition, expectedContainer, "".length);
//     });
//
//     test("Should merge lists of different types when pressing backspace after br", () => {
//         const wrapper = createWrapper(`
//             <ol>
//                 <li>zero
//                     <ol>
//                         <li>first</li>
//                         <li><br></li>
//                     </ol>
//                 </li>
//             </ol>
//             <ul>
//                 <li class="start">second</li>
//             </ul>
//         `);
//         selectText(getFirstChild(wrapper, ".start"), "".length, "".length);
//
//         const keyboardEvent = new KeyboardEvent("keydown", {key: "Backspace"});
//         const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);
//
//         expectHtml(wrapper.innerHTML, `
//             <ol>
//                 <li>zero
//                     <ol>
//                         <li>first</li>
//                     </ol>
//                     <ul>
//                         <li>second</li>
//                     </ul>
//                 </li>
//             </ol>
//         `);
//
//         const expectedContainer = wrapper.querySelector("ol li ul li:last-child")?.firstChild;
//         expectCursor(cursorPosition, expectedContainer, "".length);
//     });
//
//     test("Should merge lists of the same types when pressing delete before nested br", () => {
//         const wrapper = createWrapper(`
//             <ol>
//                 <li>zero</li>
//                 <li class="start"><br>
//                     <ol>
//                         <li>first</li>
//                     </ol>
//                 </li>
//                 <li>second</li>
//             </ol>
//         `);
//         selectText(wrapper.querySelector(".start") as Node, "".length, "".length);
//
//         const keyboardEvent = new KeyboardEvent("keydown", {key: "Delete"});
//         const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);
//         expectCursor(cursorPosition, getFirstChild(wrapper, "li + li"), "".length);
//
//         expectHtml(wrapper.innerHTML, `
//             <ol>
//                 <li>zero</li>
//                 <li>first</li>
//                 <li>second</li>
//             </ol>
//         `);
//     });
//
//     test("Should merge lists of the same types when pressing backspace after nested br", () => {
//         const wrapper = createWrapper(`
//             <ol>
//                 <li>zero</li>
//                 <li><br>
//                     <ol>
//                         <li class="start">first</li>
//                     </ol>
//                 </li>
//                 <li>second</li>
//             </ol>
//         `);
//         selectText(getFirstChild(wrapper, ".start"), "".length, "".length);
//
//         const keyboardEvent = new KeyboardEvent("keydown", {key: "Backspace"});
//         const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);
//         expectCursor(cursorPosition, getFirstChild(wrapper, "ol ol li"), "".length);
//
//         expectHtml(wrapper.innerHTML, `
//             <ol>
//                 <li>zero
//                     <ol><li>first</li></ol>
//                 </li>
//                 <li>second</li>
//             </ol>
//         `);
//     });
//
//     test("Should merge lists of the same types when pressing delete before nested br 2", () => {
//         const wrapper = createWrapper(`
//             <ol>
//                 <li>zero
//                     <ol>
//                         <li class="start"><br></li>
//                     </ol>
//                 </li>
//                 <li>first</li>
//             </ol>
//         `);
//         selectText(wrapper.querySelector(".start") as Node, "".length, "".length);
//
//         const keyboardEvent = new KeyboardEvent("keydown", {key: "Delete"});
//         const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);
//         expectCursor(cursorPosition, getFirstChild(wrapper, "ol ol li"), "".length);
//
//         expectHtml(wrapper.innerHTML, `
//             <ol>
//                 <li>zero
//                     <ol>
//                         <li>first</li>
//                     </ol>
//                 </li>
//             </ol>
//         `);
//     });
//
//     test("Delete over the text of an item holding a nested list leaves the placeholder above the list", () => {
//         const wrapper = createWrapper(`
//             <ol>
//                 <li>zero</li>
//                 <li class="start">first
//                     <ol>
//                         <li>second</li>
//                     </ol>
//                 </li>
//             </ol>
//         `);
//         selectText(getFirstChild(wrapper, ".start"), "".length, "first".length);
//
//         const keyboardEvent = new KeyboardEvent("keydown", {key: "Delete"});
//         const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);
//         // The emptied text node stays for the cursor, before the placeholder br.
//         expectCursor(cursorPosition, getFirstChild(wrapper, ".start"), 0);
//
//         expectHtml(wrapper.innerHTML, `
//             <ol>
//                 <li>zero</li>
//                 <li class="start"><br>
//                     <ol>
//                         <li>second</li>
//                     </ol>
//                 </li>
//             </ol>
//         `);
//     });
//
//     test("Backspace over the text of an item holding a nested list leaves the placeholder above the list", () => {
//         const wrapper = createWrapper(`
//             <ol>
//                 <li>zero</li>
//                 <li class="start">first
//                     <ol>
//                         <li>second</li>
//                     </ol>
//                 </li>
//             </ol>
//         `);
//         selectText(getFirstChild(wrapper, ".start"), "".length, "first".length);
//
//         const keyboardEvent = new KeyboardEvent("keydown", {key: "Backspace"});
//         const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);
//         expectCursor(cursorPosition, getFirstChild(wrapper, ".start"), 0);
//
//         expectHtml(wrapper.innerHTML, `
//             <ol>
//                 <li>zero</li>
//                 <li class="start"><br>
//                     <ol>
//                         <li>second</li>
//                     </ol>
//                 </li>
//             </ol>
//         `);
//     });
//
//     // The browser anchors the cursor on an empty item itself, so the item is what the cursor is set on.
//     test("Backspace in an empty nested item drops it and lands at the end of the line above", () => {
//         const wrapper = createWrapper(`
//             <ul>
//                 <li>Unordered item one
//                     <ul>
//                         <li class="start"><br></li>
//                     </ul>
//                 </li>
//             </ul>
//         `);
//         selectText(wrapper.querySelector(".start") as Node, 0, 0);
//
//         const keyboardEvent = new KeyboardEvent("keydown", {key: "Backspace"});
//         const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);
//
//         expectHtml(wrapper.innerHTML, `
//             <ul>
//                 <li>Unordered item one</li>
//             </ul>
//         `);
//         expectCursor(cursorPosition, getFirstChild(wrapper, "li"), "Unordered item one".length);
//     });
//
//     test("Backspace on the br of an empty nested item drops the item", () => {
//         const wrapper = createWrapper(`
//             <ul>
//                 <li>one
//                     <ul>
//                         <li class="start"><br></li>
//                     </ul>
//                 </li>
//             </ul>
//         `);
//         selectText(getFirstChild(wrapper, ".start"), 0, 0);
//
//         const keyboardEvent = new KeyboardEvent("keydown", {key: "Backspace"});
//         const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);
//
//         expectHtml(wrapper.innerHTML, `
//             <ul>
//                 <li>one</li>
//             </ul>
//         `);
//         expectCursor(cursorPosition, getFirstChild(wrapper, "li"), "one".length);
//     });
//
//     test("Backspace in an empty nested item lowers the items nested inside it", () => {
//         const wrapper = createWrapper(`
//             <ul>
//                 <li>one
//                     <ul>
//                         <li class="start"><br>
//                             <ul>
//                                 <li>deep</li>
//                             </ul>
//                         </li>
//                     </ul>
//                 </li>
//             </ul>
//         `);
//         selectText(wrapper.querySelector(".start") as Node, 0, 0);
//
//         const keyboardEvent = new KeyboardEvent("keydown", {key: "Backspace"});
//         const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);
//
//         expectHtml(wrapper.innerHTML, `
//             <ul>
//                 <li>one
//                     <ul>
//                         <li>deep</li>
//                     </ul>
//                 </li>
//             </ul>
//         `);
//         expectCursor(cursorPosition, getFirstChild(wrapper, "li"), "one".length);
//     });
//
//     test("Backspace in an empty nested item keeps the item written below it", () => {
//         const wrapper = createWrapper(`
//             <ul>
//                 <li>one
//                     <ul>
//                         <li class="start"><br></li>
//                         <li>two</li>
//                     </ul>
//                 </li>
//             </ul>
//         `);
//         selectText(wrapper.querySelector(".start") as Node, 0, 0);
//
//         const keyboardEvent = new KeyboardEvent("keydown", {key: "Backspace"});
//         const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);
//
//         expectHtml(wrapper.innerHTML, `
//             <ul>
//                 <li>one
//                     <ul>
//                         <li>two</li>
//                     </ul>
//                 </li>
//             </ul>
//         `);
//         expectCursor(cursorPosition, getFirstChild(wrapper, "li"), "one".length);
//     });
//
//     test("Backspace in an empty first level item drops it", () => {
//         const wrapper = createWrapper(`
//             <ul>
//                 <li>one</li>
//                 <li class="start"><br></li>
//             </ul>
//         `);
//         selectText(wrapper.querySelector(".start") as Node, 0, 0);
//
//         const keyboardEvent = new KeyboardEvent("keydown", {key: "Backspace"});
//         const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);
//
//         expectHtml(wrapper.innerHTML, `
//             <ul>
//                 <li>one</li>
//             </ul>
//         `);
//         expectCursor(cursorPosition, getFirstChild(wrapper, "li"), "one".length);
//     });
//
//     test("Backspace in an empty first level item holding a nested list drops it", () => {
//         const wrapper = createWrapper(`
//             <ol>
//                 <li>First ordered item</li>
//                 <li class="start"><br>
//                     <ol>
//                         <li>Third ordered item</li>
//                     </ol>
//                 </li>
//             </ol>
//         `);
//         selectText(wrapper.querySelector(".start") as Node, 0, 0);
//
//         const keyboardEvent = new KeyboardEvent("keydown", {key: "Backspace"});
//         const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);
//
//         expectHtml(wrapper.innerHTML, `
//             <ol>
//                 <li>First ordered item
//                     <ol>
//                         <li>Third ordered item</li>
//                     </ol>
//                 </li>
//             </ol>
//         `);
//         expectCursor(cursorPosition, getFirstChild(wrapper, "li"), "First ordered item".length);
//     });
//
//     // Arriving at the end of the empty line, the browser anchors the cursor on the item after the br, which
//     // is just before the list nested inside it. The item is the one on that line, not the nested one.
//     test("Backspace after the br of an empty first level item holding a nested list drops it", () => {
//         const wrapper = createWrapper(`
//             <ol>
//                 <li>First ordered item</li>
//                 <li class="start"><br>
//                     <ol>
//                         <li>Third ordered item</li>
//                     </ol>
//                 </li>
//             </ol>
//         `);
//         selectText(wrapper.querySelector(".start") as Node, 1, 1);
//
//         const keyboardEvent = new KeyboardEvent("keydown", {key: "Backspace"});
//         const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);
//
//         expectHtml(wrapper.innerHTML, `
//             <ol>
//                 <li>First ordered item
//                     <ol>
//                         <li>Third ordered item</li>
//                     </ol>
//                 </li>
//             </ol>
//         `);
//         expectCursor(cursorPosition, getFirstChild(wrapper, "li"), "First ordered item".length);
//     });
//
//     test("Backspace in the only empty item below a paragraph drops the list", () => {
//         const wrapper = createWrapper(`
//             <p>one</p>
//             <ul>
//                 <li class="start"><br></li>
//             </ul>
//         `);
//         selectText(wrapper.querySelector(".start") as Node, 0, 0);
//
//         const keyboardEvent = new KeyboardEvent("keydown", {key: "Backspace"});
//         const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);
//
//         expectHtml(wrapper.innerHTML, `
//             <p>one</p>
//         `);
//         expectCursor(cursorPosition, getFirstChild(wrapper, "p"), "one".length);
//     });
//
//     test("Backspace in the only empty item opening the document drops the list", () => {
//         const wrapper = createWrapper(`
//             <ul>
//                 <li class="start"><br></li>
//             </ul>
//             <p>one</p>
//         `);
//         selectText(wrapper.querySelector(".start") as Node, 0, 0);
//
//         const keyboardEvent = new KeyboardEvent("keydown", {key: "Backspace"});
//         const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);
//
//         expectHtml(wrapper.innerHTML, `
//             <p>one</p>
//         `);
//         expectCursor(cursorPosition, getFirstChild(wrapper, "p"), 0);
//     });
//
//     // The paragraph the editor is left with is written by the command once the keyboard is done.
//     test("Backspace in the only empty item of the document empties the editor", () => {
//         const wrapper = createWrapper(`
//             <ul>
//                 <li class="start"><br></li>
//             </ul>
//         `);
//         selectText(wrapper.querySelector(".start") as Node, 0, 0);
//
//         const keyboardEvent = new KeyboardEvent("keydown", {key: "Backspace"});
//         const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);
//
//         expectHtml(wrapper.innerHTML, ``);
//         expectCursor(cursorPosition, wrapper, 0);
//     });
//
//     test("Press backspace when selection is inside one paragraph", () => {
//         const wrapper = createWrapper(`
//             <p class="start">zerofirst</p>
//         `);
//         selectText(getFirstChild(wrapper, ".start"), "ze".length, "zerofi".length);
//
//         const keyboardEvent = new KeyboardEvent("keydown", {key: "Backspace"});
//         const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);
//
//         expectHtml(wrapper.innerHTML, `
//             <p class="start">zerst</p>
//         `);
//         expectCursor(cursorPosition, getFirstChild(wrapper, ".start"), "ze".length);
//     });
//
//     test("Type a character over a selection inside one paragraph", () => {
//         const wrapper = createWrapper(`
//             <p class="start">zerofirst</p>
//         `);
//         selectText(getFirstChild(wrapper, ".start"), "ze".length, "zerofi".length);
//
//         const keyboardEvent = new KeyboardEvent("keydown", {key: "x"});
//         const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);
//
//         expectHtml(wrapper.innerHTML, `
//             <p class="start">zexrst</p>
//         `);
//         expectCursor(cursorPosition, getFirstChild(wrapper, ".start"), "zex".length);
//     });
//
//     test("Type a character over a fully selected inline tag", () => {
//         const wrapper = createWrapper(`
//             <p>ze<strong class="start">ro</strong></p>
//         `);
//         selectText(getFirstChild(wrapper, ".start"), 0, "ro".length);
//
//         const keyboardEvent = new KeyboardEvent("keydown", {key: "x"});
//         const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);
//
//         expectHtml(wrapper.innerHTML, `
//             <p>ze<strong class="start">x</strong></p>
//         `);
//         expectCursor(cursorPosition, getFirstChild(wrapper, ".start"), "x".length);
//     });
//
//     test("Press backspace after an emoji", () => {
//         const wrapper = createWrapper(`
//             <p class="start">a👍</p>
//         `);
//         selectText(getFirstChild(wrapper, ".start"), "a👍".length, "a👍".length);
//
//         const keyboardEvent = new KeyboardEvent("keydown", {key: "Backspace"});
//         const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);
//
//         expectHtml(wrapper.innerHTML, `
//             <p class="start">a</p>
//         `);
//         expectCursor(cursorPosition, getFirstChild(wrapper, ".start"), "a".length);
//     });
//
//     test("After removing content and pressing delete next tag should merge", () => {
//         const wrapper = createWrapper(`
//             <h1 class="start">z</h1>
//             <p>zero</p>
//         `);
//         selectText(getFirstChild(wrapper, ".start"), "".length, "z".length);
//         let keyboardEvent = new KeyboardEvent("keydown", {key: "Backspace"});
//         const emptied = handleKeyboardEvent(wrapper, keyboardEvent);
//         expectHtml(wrapper.innerHTML, `<h1 class="start"><br></h1><p>zero</p>`);
//         expectCursor(emptied, getFirstChild(wrapper, ".start"), 0);
//
//         keyboardEvent = new KeyboardEvent("keydown", {key: "Delete"});
//         const merged = handleKeyboardEvent(wrapper, keyboardEvent);
//
//         expectHtml(wrapper.innerHTML, `
//             <p>zero</p>
//         `);
//         expectCursor(merged, getFirstChild(wrapper, "p"), "".length);
//     });
//
//     // A cell is no block, so enter has nothing to split and is dropped rather than left to the browser.
//     test("Enter inside a cell keeps a table of empty cells", () => {
//         const wrapper = createWrapper(`
//             <table><thead><tr><th class="start"></th><th></th></tr></thead>
//             <tbody><tr><td></td><td></td></tr></tbody></table>
//         `);
//         const cell = wrapper.querySelector(".start") as HTMLElement;
//         selectText(cell, 0, 0);
//
//         const keyboardEvent = new KeyboardEvent("keydown", {key: "Enter", cancelable: true});
//         const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);
//
//         expectHtml(wrapper.innerHTML, `
//             <table><thead><tr><th class="start"></th><th></th></tr></thead>
//             <tbody><tr><td></td><td></td></tr></tbody></table>
//         `);
//         expect(cell.isConnected).toBe(true);
//         expect(keyboardEvent.defaultPrevented).toBe(true);
//         expectCursor(cursorPosition, cell, 0);
//     });
//
//     test("Enter in the middle of a cell leaves its text whole", () => {
//         const wrapper = createWrapper(`
//             <table><tbody><tr><td class="start">zero</td><td>first</td></tr></tbody></table>
//         `);
//         const text = getFirstChild(wrapper, ".start");
//         selectText(text, "ze".length, "ze".length);
//
//         const cursorPosition = handleKeyboardEvent(wrapper, new KeyboardEvent("keydown", {key: "Enter"}));
//
//         expectHtml(wrapper.innerHTML, `
//             <table><tbody><tr><td class="start">zero</td><td>first</td></tr></tbody></table>
//         `);
//         expectCursor(cursorPosition, text, "ze".length);
//     });
//
//     // A break would grow the row instead of ending a line, so shift does not make an exception.
//     test("Shift and enter in the middle of a cell inserts no break", () => {
//         const wrapper = createWrapper(`
//             <table><tbody><tr><td class="start">zero</td><td>first</td></tr></tbody></table>
//         `);
//         selectText(getFirstChild(wrapper, ".start"), "ze".length, "ze".length);
//
//         const cursorPosition = handleKeyboardEvent(wrapper, new KeyboardEvent("keydown", {
//             key: "Enter",
//             shiftKey: true
//         }));
//         expectCursor(cursorPosition, getFirstChild(wrapper, ".start"), "ze".length);
//
//         expectHtml(wrapper.innerHTML, `
//             <table><tbody><tr><td class="start">zero</td><td>first</td></tr></tbody></table>
//         `);
//     });
//
//     // A selection reaching out of the table would take the split with it, so the cell it starts in is
//     // enough to drop the enter.
//     test("Enter over a selection running out of a cell keeps both blocks", () => {
//         const wrapper = createWrapper(`
//             <table><tbody><tr><td class="start">zero</td></tr></tbody></table><p class="end">first</p>
//         `);
//         selectRange(getFirstChild(wrapper, ".start"), "ze".length, getFirstChild(wrapper, ".end"), "fi".length);
//
//         const cursorPosition = handleKeyboardEvent(wrapper, new KeyboardEvent("keydown", {key: "Enter"}));
//         expectCursor(cursorPosition, getFirstChild(wrapper, ".start"), "ze".length, getFirstChild(wrapper, ".end"), "fi".length);
//
//         expectHtml(wrapper.innerHTML, `
//             <table><tbody><tr><td class="start">zero</td></tr></tbody></table><p class="end">first</p>
//         `);
//     });
//
//     // The editor is a block of a page it knows nothing about, and that page may well be laid out in a
//     // table. Only the tables the editor holds itself count, so the search for one stops at the editor.
//     test("Enter splits a paragraph of an editor embedded in a table of the page", () => {
//         const wrapper = createWrapper(`
//             <p class="start">zero</p>
//         `);
//         const cell = document.createElement("td");
//         wrapper.replaceWith(cell);
//         cell.appendChild(wrapper);
//         const row = document.createElement("tr");
//         row.appendChild(cell);
//         const table = document.createElement("table");
//         table.appendChild(row);
//         document.body.appendChild(table);
//         selectText(getFirstChild(wrapper, ".start"), "ze".length, "ze".length);
//
//         const cursorPosition = handleKeyboardEvent(wrapper, new KeyboardEvent("keydown", {key: "Enter"}));
//         expectCursor(cursorPosition, getFirstChild(wrapper, "p + p"), "".length);
//
//         expectHtml(wrapper.innerHTML, `
//             <p>ze</p><p>ro</p>
//         `);
//     });
//
//     test("Arrow keys do not change the dom and are not prevented", () => {
//         const wrapper = createWrapper(`
//             <p class="start">zero</p>
//         `);
//         selectText(getFirstChild(wrapper, ".start"), "ze".length, "ze".length);
//
//         const keyboardEvent = new KeyboardEvent("keydown", {key: "ArrowLeft"});
//         const preventDefault = jest.spyOn(keyboardEvent, "preventDefault");
//         const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);
//         expectCursor(cursorPosition, getFirstChild(wrapper, ".start"), "ze".length);
//
//         expectHtml(wrapper.innerHTML, `
//             <p class="start">zero</p>
//         `);
//         expect(preventDefault).not.toHaveBeenCalled();
//     });
//
//     test.each(["Home", "End", "ArrowLeft", "ArrowRight", "PageUp", "PageDown", "F1", "Tab", "Escape"])(
//         "%s over a selection across blocks does not change the dom and is not prevented", (key) => {
//             const wrapper = createWrapper(`
//             <p class="start">zero</p><p class="end">first</p>
//         `);
//             selectRange(getFirstChild(wrapper, ".start"), "ze".length, getFirstChild(wrapper, ".end"), "fi".length);
//
//             const keyboardEvent = new KeyboardEvent("keydown", {key});
//             const preventDefault = jest.spyOn(keyboardEvent, "preventDefault");
//             const cursorPosition = handleKeyboardEvent(wrapper, keyboardEvent);
//
//             expectHtml(wrapper.innerHTML, `
//             <p class="start">zero</p><p class="end">first</p>
//         `);
//             expect(preventDefault).not.toHaveBeenCalled();
//             expectCursor(cursorPosition, getFirstChild(wrapper, ".start"), "ze".length, getFirstChild(wrapper, ".end"), "fi".length);
//         });
// });
// // A browser leaves the caret in an empty item on the item itself rather than on its br; both must read
// // the same, so every case here runs with the caret in either place.
// describe("Editing over a selection ending on an empty nested item", () => {
//     const html = `
//         <h3 class="start">Ordered List</h3>
//         <ol>
//             <li>First ordered item
//                 <ol>
//                     <li class="empty"><br></li>
//                 </ol>
//             </li>
//         </ol>
//     `;
//
//     function selectTo(wrapper: HTMLElement, startOffset: number, caretOnItem: boolean) {
//         selectRange(getFirstChild(wrapper, ".start"), startOffset, caretOnItem ? wrapper.querySelector(".empty") as Node : wrapper.querySelector("br") as Node, 0);
//     }
//
//     for (const caretOnItem of [false, true]) {
//         const caret = caretOnItem ? "caret on the item" : "caret on the br";
//
//         test(`Should type over the selection without leaving a break behind (${caret})`, () => {
//             const wrapper = createWrapper(html);
//             selectTo(wrapper, "".length, caretOnItem);
//
//             const cursorPosition = handleKeyboardEvent(wrapper, new KeyboardEvent("keydown", {key: "z"}));
//
//             expectHtml(wrapper.innerHTML, `<h3>z</h3>`);
//             expectCursor(cursorPosition, wrapper.querySelector("h3")?.firstChild, "z".length);
//             // The cursor must be one the selection can be set to, or the edit is never committed.
//             expect(() => new Range().setStart(cursorPosition.startContainer, cursorPosition.startOffset)).not.toThrow();
//         });
//
//         test(`Should keep the heading's words when typing over a selection starting inside it (${caret})`, () => {
//             const wrapper = createWrapper(html);
//             selectTo(wrapper, "Ord".length, caretOnItem);
//
//             const cursorPosition = handleKeyboardEvent(wrapper, new KeyboardEvent("keydown", {key: "z"}));
//
//             expectHtml(wrapper.innerHTML, `<h3>Ordz</h3>`);
//             expectCursor(cursorPosition, wrapper.querySelector("h3")?.firstChild, "Ordz".length);
//         });
//
//         test(`Should leave an empty heading after backspace over the selection (${caret})`, () => {
//             const wrapper = createWrapper(html);
//             selectTo(wrapper, "".length, caretOnItem);
//
//             const cursorPosition = handleKeyboardEvent(wrapper, new KeyboardEvent("keydown", {key: "Backspace"}));
//
//             expectHtml(wrapper.innerHTML, `<h3><br></h3>`);
//             expectCursor(cursorPosition, wrapper.querySelector("h3 br"), 0);
//         });
//     }
// });
//
// describe("Enter in an empty list item", () => {
//     test("Enter in an empty item at the first level leaves the list", () => {
//         const wrapper = createWrapper(`
//             <ul>
//                 <li>zero</li>
//                 <li class="start"><br></li>
//                 <li>first</li>
//             </ul>
//         `);
//
//         selectRange(getFirstChild(wrapper, ".start"), 0, getFirstChild(wrapper, ".start"), 0);
//
//         const cursorPosition = handleKeyboardEvent(wrapper, new KeyboardEvent("keydown", {key: "Enter"}));
//
//         expectHtml(wrapper.innerHTML, `
//             <ul>
//                 <li>zero</li>
//             </ul>
//             <p><br></p>
//             <ul>
//                 <li>first</li>
//             </ul>
//         `);
//
//         expectCursor(cursorPosition, wrapper.querySelector("p br"), 0);
//     });
//
//     test("Enter in a nested empty item lifts it one level", () => {
//         const wrapper = createWrapper(`
//             <ul>
//                 <li>zero
//                     <ul>
//                         <li class="start"><br></li>
//                         <li>first</li>
//                     </ul>
//                 </li>
//             </ul>
//         `);
//
//         const br = getFirstChild(wrapper, ".start");
//         selectRange(br, 0, br, 0);
//
//         const cursorPosition = handleKeyboardEvent(wrapper, new KeyboardEvent("keydown", {key: "Enter"}));
//
//         expectHtml(wrapper.innerHTML, `
//             <ul>
//                 <li>zero</li>
//                 <li><br>
//                     <ul>
//                         <li>first</li>
//                     </ul>
//                 </li>
//             </ul>
//         `);
//
//         expectCursor(cursorPosition, br, 0);
//     });
//
//     test("Enter in an item holding an image only inserts an item, the image being content of its own", () => {
//         const wrapper = createWrapper(`
//             <ul>
//                 <li class="start"><img src="image.png"></li>
//             </ul>
//         `);
//
//         selectRange(wrapper.querySelector(".start") as HTMLElement, 0, wrapper.querySelector(".start") as HTMLElement, 0);
//
//         const cursorPosition = handleKeyboardEvent(wrapper, new KeyboardEvent("keydown", {key: "Enter"}));
//         expectCursor(cursorPosition, wrapper.querySelector("li + li br"), 0);
//
//         expectHtml(wrapper.innerHTML, `
//             <ul>
//                 <li><img src="image.png"></li>
//                 <li><br></li>
//             </ul>
//         `);
//     });
//
//     test("Shift enter in an empty item keeps the item in the list", () => {
//         const wrapper = createWrapper(`
//             <ul>
//                 <li>zero</li>
//                 <li class="start"><br></li>
//             </ul>
//         `);
//
//         selectRange(getFirstChild(wrapper, ".start"), 0, getFirstChild(wrapper, ".start"), 0);
//
//         const cursorPosition = handleKeyboardEvent(wrapper, new KeyboardEvent("keydown", {
//             key: "Enter",
//             shiftKey: true
//         }));
//         expectCursor(cursorPosition, getFirstChild(wrapper, ".start"), 0);
//
//         expectHtml(wrapper.innerHTML, `
//             <ul>
//                 <li>zero</li>
//                 <li class="start"><br></li>
//             </ul>
//         `);
//     });
//
//     test("Enter over a selection emptying an item divides the item, the item not having been empty", () => {
//         const wrapper = createWrapper(`
//             <ul>
//                 <li class="start">zero</li>
//             </ul>
//         `);
//
//         selectRange(getFirstChild(wrapper, ".start"), "".length, getFirstChild(wrapper, ".start"), "zero".length);
//
//         const cursorPosition = handleKeyboardEvent(wrapper, new KeyboardEvent("keydown", {key: "Enter"}));
//         expectCursor(cursorPosition, wrapper.querySelector("li + li br"), 0);
//
//         expectHtml(wrapper.innerHTML, `
//             <ul>
//                 <li><br></li>
//                 <li><br></li>
//             </ul>
//         `);
//     });
// });
//
// describe("Deleting next to an image block", () => {
//     const imageBlock = `<p class="be-image"><img src="image.png"></p>`;
//
//     function select(wrapper: HTMLElement, selector: string, offset: number) {
//         selectRange(getFirstChild(wrapper, selector), offset, getFirstChild(wrapper, selector), offset);
//     }
//
//     test("Backspace at the start of the line after an image block removes the image", () => {
//         const wrapper = createWrapper(`<p>zero</p>${imageBlock}<p class="start">first</p>`);
//         select(wrapper, ".start", "".length);
//
//         const cursorPosition = handleKeyboardEvent(wrapper, new KeyboardEvent("keydown", {key: "Backspace"}));
//
//         expectHtml(wrapper.innerHTML, `<p>zero</p><p>first</p>`);
//         const expectedContainer = getLastChild(wrapper, "p:last-child");
//         expectCursor(cursorPosition, expectedContainer, 0);
//     });
//
//     test("Delete at the end of the line before an image block removes the image", () => {
//         const wrapper = createWrapper(`<p class="start">zero</p>${imageBlock}<p>first</p>`);
//         select(wrapper, ".start", "zero".length);
//
//         const cursorPosition = handleKeyboardEvent(wrapper, new KeyboardEvent("keydown", {key: "Delete"}));
//
//         expectHtml(wrapper.innerHTML, `<p>zero</p><p>first</p>`);
//         const expectedContainer = getFirstChild(wrapper, "p");
//         expectCursor(cursorPosition, expectedContainer, "zero".length);
//     });
//
//     test("Backspace at the start of an item after an image block removes the image and keeps the list", () => {
//         const wrapper = createWrapper(`<p>zero</p>${imageBlock}<ul><li class="start">first</li><li>second</li></ul>`);
//         select(wrapper, ".start", "".length);
//
//         const cursorPosition = handleKeyboardEvent(wrapper, new KeyboardEvent("keydown", {key: "Backspace"}));
//
//         expectHtml(wrapper.innerHTML, `<p>zero</p><ul><li>first</li><li>second</li></ul>`);
//         const expectedContainer = getFirstChild(wrapper, "li");
//         expectCursor(cursorPosition, expectedContainer, 0);
//     });
//
//     test("Delete at the end of an empty line before an image block removes the image and keeps the line", () => {
//         const wrapper = createWrapper(`<p class="start"><br></p>${imageBlock}<p>first</p>`);
//         select(wrapper, ".start", "".length);
//
//         const cursorPosition = handleKeyboardEvent(wrapper, new KeyboardEvent("keydown", {key: "Delete"}));
//
//         expectHtml(wrapper.innerHTML, `<p><br></p><p>first</p>`);
//         const expectedContainer = getFirstChild(wrapper, "p");
//         expectCursor(cursorPosition, expectedContainer, 0);
//     });
// });
//
// // A list run ends at any line written between two wrappers, so removing that line leaves the
// // wrappers standing side by side; the run has to be rebuilt as one for them to join.
// describe("Removing the line two lists stand apart from one another by", () => {
//     function select(wrapper: HTMLElement, selector: string, start: number, end = start) {
//         selectRange(getFirstChild(wrapper, selector), start, getFirstChild(wrapper, selector), end);
//     }
//
//     test("Delete in the empty line between two lists joins them", () => {
//         const wrapper = createWrapper(`<ul><li>zero</li></ul><p class="start"><br></p><ul><li>first</li></ul>`);
//         select(wrapper, ".start", 0);
//
//         const cursorPosition = handleKeyboardEvent(wrapper, new KeyboardEvent("keydown", {key: "Delete"}));
//
//         expectHtml(wrapper.innerHTML, `<ul><li>zero</li><li>first</li></ul>`);
//         const expectedContainer = getFirstChild(wrapper, "li");
//         expectCursor(cursorPosition, expectedContainer, "zero".length);
//     });
//
//     test("Delete at the end of the list above the empty line joins them", () => {
//         const wrapper = createWrapper(`<ul><li class="start">zero</li></ul><p><br></p><ul><li>first</li></ul>`);
//         select(wrapper, ".start", "zero".length);
//
//         const cursorPosition = handleKeyboardEvent(wrapper, new KeyboardEvent("keydown", {key: "Delete"}));
//
//         expectHtml(wrapper.innerHTML, `<ul><li>zero</li><li>first</li></ul>`);
//         const expectedContainer = getFirstChild(wrapper, "li");
//         expectCursor(cursorPosition, expectedContainer, "zero".length);
//     });
//
//     test("Backspace at the start of the list below the empty line joins them", () => {
//         const wrapper = createWrapper(`<ul><li>zero</li></ul><p><br></p><ul><li class="start">first</li></ul>`);
//         select(wrapper, ".start", 0);
//
//         const cursorPosition = handleKeyboardEvent(wrapper, new KeyboardEvent("keydown", {key: "Backspace"}));
//
//         expectHtml(wrapper.innerHTML, `<ul><li>zero</li><li>first</li></ul>`);
//         const expectedContainer = wrapper.querySelectorAll("li")[1]?.firstChild;
//         expectCursor(cursorPosition, expectedContainer, 0);
//     });
//
//     test("Backspace at the start of a line written between two lists joins them", () => {
//         const wrapper = createWrapper(`<ul><li>zero</li></ul><p class="start">delete it</p><ul><li>first</li></ul>`);
//         select(wrapper, ".start", 0);
//
//         const cursorPosition = handleKeyboardEvent(wrapper, new KeyboardEvent("keydown", {key: "Backspace"}));
//
//         expectHtml(wrapper.innerHTML, `<ul><li>zerodelete it</li><li>first</li></ul>`);
//         const expectedContainer = getFirstChild(wrapper, "li");
//         expectCursor(cursorPosition, expectedContainer, "zero".length);
//     });
//
//     test("Deleting a selection covering the line written between two lists joins them", () => {
//         const wrapper = createWrapper(`<ul><li class="start">zero</li></ul><p class="end">delete it</p><ul><li>first</li></ul>`);
//         selectRange(getFirstChild(wrapper, ".start"), "zero".length, getFirstChild(wrapper, ".end"), "delete it".length);
//
//         const cursorPosition = handleKeyboardEvent(wrapper, new KeyboardEvent("keydown", {key: "Backspace"}));
//
//         expectHtml(wrapper.innerHTML, `<ul><li>zero</li><li>first</li></ul>`);
//         const expectedContainer = getFirstChild(wrapper, "li");
//         expectCursor(cursorPosition, expectedContainer, "zero".length);
//     });
//
//     test("Should leave lists of different types apart when the line between them goes", () => {
//         const wrapper = createWrapper(`<ul><li>zero</li></ul><p class="start"><br></p><ol><li>first</li></ol>`);
//         select(wrapper, ".start", 0);
//
//         const cursorPosition = handleKeyboardEvent(wrapper, new KeyboardEvent("keydown", {key: "Delete"}));
//
//         expectHtml(wrapper.innerHTML, `<ul><li>zero</li></ul><ol><li>first</li></ol>`);
//         const expectedContainer = getFirstChild(wrapper, "li");
//         expectCursor(cursorPosition, expectedContainer, "zero".length);
//     });
//
//     test("Should leave the lists a line still stands between apart", () => {
//         const wrapper = createWrapper(`<ul><li>zero</li></ul><p class="start">apart</p><ul><li>first</li></ul>`);
//         select(wrapper, ".start", "apar".length);
//
//         const cursorPosition = handleKeyboardEvent(wrapper, new KeyboardEvent("keydown", {key: "Delete"}));
//
//         expectHtml(wrapper.innerHTML, `<ul><li>zero</li></ul><p class="start">apar</p><ul><li>first</li></ul>`);
//         const expectedContainer = getFirstChild(wrapper, ".start");
//         expectCursor(cursorPosition, expectedContainer, "apar".length);
//     });
//
//     test("Backspace at the start of an item after an image block between two lists joins them", () => {
//         const wrapper = createWrapper(`<ul><li>zero</li></ul><p class="be-image"><img src="image.png"></p><ul><li class="start">first</li></ul>`);
//         select(wrapper, ".start", 0);
//
//         const cursorPosition = handleKeyboardEvent(wrapper, new KeyboardEvent("keydown", {key: "Backspace"}));
//
//         expectHtml(wrapper.innerHTML, `<ul><li>zero</li><li>first</li></ul>`);
//         const expectedContainer = wrapper.querySelectorAll("li")[1]?.firstChild;
//         expectCursor(cursorPosition, expectedContainer, 0);
//     });
//
//     // The rebuild joins the run into the first wrapper, detaching the second; a cursor remapped by
//     // its old position among the editor's children would land in the line after the run instead.
//     test("Should keep the cursor in the joined list when a line follows the run", () => {
//         const wrapper = createWrapper(`<ul><li>zero</li></ul><p><br></p><ul><li class="start">first</li></ul><p>tail</p>`);
//         select(wrapper, ".start", 0);
//
//         const cursorPosition = handleKeyboardEvent(wrapper, new KeyboardEvent("keydown", {key: "Backspace"}));
//
//         expectHtml(wrapper.innerHTML, `<ul><li>zero</li><li>first</li></ul><p>tail</p>`);
//         const expectedContainer = wrapper.querySelectorAll("li")[1]?.firstChild;
//         expectCursor(cursorPosition, expectedContainer, 0);
//     });
// });
