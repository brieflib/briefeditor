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
                <li>zero</li>
                <ul>
                    <li>first</li>
                    <li>second</li>
                </ul>
            </ul>
        `);

        moveListWrapperToPreviousLi(wrapper);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>zero
                    <ul>
                        <li>first</li>
                        <li>second</li>
                    </ul>
                </li>
            </ul>
        `));
    });

    test("Move second level list wrapper to li in previous list wrapper", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero</li>
            </ul>
            <ol class="start">
                <ol>
                    <li>first</li>
                </ol>
            </ol>
        `);

        const secondLevelListWrapper = wrapper.querySelector(".start") as HTMLElement;
        moveListWrapperToPreviousLi(secondLevelListWrapper);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>zero
                    <ol>
                        <li>first</li>
                    </ol>
                </li>
            </ul>
        `));
    });

    test("Select lis with first child list wrapper", () => {
        const wrapper = createWrapper(`
            <ol class="start">
                <li>
                    <ol>
                        <li>zero</li>
                    </ol>
                </li>
            </ol>
            <ul>
                <li>
                    <ol>
                        <li>first</li>
                    </ol>
                </li>
                <li>second</li>
            </ul>
        `);

        const firstLi = wrapper.querySelector(".start") as HTMLElement;
        const lisWithFirstChildListWrapper = getLisWithFirstChildListWrapper(wrapper, firstLi);

        expect(lisWithFirstChildListWrapper.length).toBe(2);
        expect(lisWithFirstChildListWrapper[0]).toBe(firstLi.firstChild);
        const expectedLi = wrapper.querySelector("ul > li:nth-child(1)");
        expect(lisWithFirstChildListWrapper[1]).toBe(expectedLi);
    });

    test("Should move ul out of li", () => {
        const wrapper = createWrapper(`
            <ul class="start">
                <li>zero</li>
                <li>
                    <ul>
                        <li>first</li>
                    </ul>
                </li>
            </ul>
        `);

        const root = wrapper.querySelector(".start") as HTMLElement;
        moveListWrappersOutOfLi(wrapper, root);
        normalize(wrapper, root);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul class="start">
                <li>zero
                    <ul>
                        <li>first</li>
                    </ul>
                </li>
            </ul>
        `));
    });

    test("Should move deeper ul to ul in previous li", () => {
        const wrapper = createWrapper(`
            <ul class="start">
                <li>zero</li>
                <li>
                    <ul>
                        <li>first</li>
                    </ul>
                </li>
                <li>
                    <ul>
                        <li>
                            <ul>
                                <li>second</li>
                            </ul>
                        </li>
                    </ul>
                </li>
            </ul>
        `);

        const root = wrapper.querySelector(".start") as HTMLElement;
        moveListWrappersOutOfLi(wrapper, root);
        normalize(wrapper, root);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul class="start">
                <li>zero
                    <ul>
                        <li>first
                            <ul>
                                <li>second</li>
                            </ul>
                        </li>
                    </ul>
                </li>
            </ul>
        `));
    });

    test("Should move nested ol to previous ol", () => {
        const wrapper = createWrapper(`
            <ul>
                <li>zero</li>
            </ul>
            <ol>
                <li>first</li>
            </ol>
            <ul class="start">
                <li>
                    <ol>
                        <li>second</li>
                    </ol>
                </li>
            </ul>
        `);

        const root = wrapper.querySelector(".start") as HTMLElement;
        moveListWrappersOutOfLi(wrapper, root);
        normalize(wrapper, root);

        expect(wrapper.innerHTML).toBe(replaceSpaces(`
            <ul>
                <li>zero</li>
            </ul>
            <ol>
                <li>first
                    <ol>
                        <li>second</li>
                    </ol>
                </li>
            </ol>
        `));
    });
});