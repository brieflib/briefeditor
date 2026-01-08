import {cleanElementWhitespace} from "@/core/shared/element-util";
import normalize from "@/core/normalize/normalize";

export function createWrapper(html: string) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = replaceSpaces(html);
    document.body.innerHTML = "";
    document.body.appendChild(wrapper);

    return wrapper;
}

export function expectHtml(comparable: string, compareTo: string) {
    expect(replaceSpaces(comparable)).toBe(replaceSpaces(compareTo));
}

export function getFirstChild(wrapper: HTMLElement, querySelector: string) {
    return wrapper.querySelector(querySelector)?.firstChild as Node
}

export function getLastChild(wrapper: HTMLElement, querySelector: string) {
    return wrapper.querySelector(querySelector)?.lastChild as Node
}

export function testNormalize(initial: string, result: string) {
    const wrapper = document.createElement("div");
    const toNormalize = document.createElement("div");
    toNormalize.innerHTML = replaceSpaces(initial);
    wrapper.appendChild(toNormalize);

    normalize(toNormalize, toNormalize);
    expectHtml(wrapper.innerHTML, result);
}

function replaceSpaces(html: string) {
    const element = document.createElement("div");
    element.innerHTML = html;
    cleanElementWhitespace(element);
    return element.innerHTML.replaceAll("\n", "");
}