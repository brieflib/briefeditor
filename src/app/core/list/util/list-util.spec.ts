import {createWrapper, replaceSpaces} from "@/core/shared/test-util";
import {
    getLisWithFirstChildListWrapper, moveListWrappersOutOfLi,
    moveListWrapperToPreviousLi
} from "@/core/list/util/list-util";
import normalize from "@/core/normalize/normalize";

describe("Move elements after normalization to conform list structure", () => {
    test("Move list wrapper to previous li", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>first</li>
                <ul>
                    <li>second</li>
                    <li>third</li>
                </ul>
            </ul>
        `);

        moveListWrapperToPreviousLi(wrapper);

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

    test("Move second level list wrapper to li in previous list wrapper", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>first</li>
            </ul>
            <ol>
                <ol>
                    <li>second</li>
                </ol>
            </ol>
        `);

        const secondLevelListWrapper = wrapper.querySelector("ol") as HTMLElement;
        moveListWrapperToPreviousLi(secondLevelListWrapper);

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

    test("Select lis with first child list wrapper", () => {
        const wrapper = createWrapper(`
            <ol class="first">
                <li>
                    <ol>
                        <li>fourth</li>
                    </ol>
                </li>
            </ol>
            <ul>
                <li>
                    <ol>
                        <li>fifth</li>
                    </ol>
                </li>
                <li>six</li>
            </ul>
        `);

        const firstLi = wrapper.querySelector(".first") as HTMLElement;
        const lisWithFirstChildListWrapper = getLisWithFirstChildListWrapper(firstLi, wrapper);

        expect(lisWithFirstChildListWrapper.length).toBe(2);
        expect(lisWithFirstChildListWrapper[0]).toBe(firstLi.firstChild);
        const expectedLi = wrapper.querySelector("ul > li:nth-child(1)");
        expect(lisWithFirstChildListWrapper[1]).toBe(expectedLi);
    });

    test("Should move ul out of li", () => {
        const wrapper = createWrapper(`
            <ul class="root">
                <li>first</li>
                <li>
                    <ul>
                        <li>second</li>
                    </ul>
                </li>
            </ul>
        `);

        const root = wrapper.querySelector(".root") as HTMLElement;
        moveListWrappersOutOfLi(root, wrapper);
        normalize(wrapper, root);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul class="root">
                <li>first</li>
                <ul>
                    <li>second</li>
                </ul>
            </ul>
        `));
    });

    test("Should move deeper ul to ul in previous li", () => {
        const wrapper = createWrapper(`
            <ul class="root">
                <li>first</li>
                <li>
                    <ul>
                        <li>second</li>
                    </ul>
                </li>
                <li>
                    <ul>
                        <li>
                            <ul>
                                <li>third</li>
                            </ul>
                        </li>
                    </ul>
                </li>
            </ul>
        `);

        const root = wrapper.querySelector(".root") as HTMLElement;
        moveListWrappersOutOfLi(root, wrapper);
        normalize(wrapper, root);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul class="root">
                <li>first</li>
                <ul>
                    <li>second
                        <ul>
                            <li>third</li>
                        </ul>
                    </li>
                </ul>
            </ul>
        `));
    });

    test("Should move nested ol to previous ol", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>first</li>
            </ul>
            <ol>
                <li>second</li>
            </ol>
            <ul class="root">
                <li>
                    <ol>
                        <li>third</li>
                    </ol>
                </li>
            </ul>
        `);

        const root = wrapper.querySelector(".root") as HTMLElement;
        moveListWrappersOutOfLi(root, wrapper);
        normalize(wrapper, root);

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
});