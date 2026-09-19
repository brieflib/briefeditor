// @ts-expect-error inline is not supported by lint
import imageAltCss from "@/component/image/asset/image-alt.css?inline=true";
import initShadowRoot from "@/component/shared/shadow-root";
import {isInsideScrollContainer} from "@/component/shared/scroll-container";

/**
 * The caption field laid under an image: a borderless input holding the image's alt text. It
 * stands outside the editor, like the image control, so the content keeps nothing of the field
 * itself - only the alt attribute it writes.
 */
class ImageAlt extends HTMLElement {
    private readonly input: HTMLInputElement;

    constructor() {
        super();
        const shadowRoot = initShadowRoot(this, imageAltCss);
        shadowRoot.innerHTML = `<input type="text" class="be-image-alt-input" placeholder="Write Image Caption">`;

        this.input = shadowRoot.querySelector(".be-image-alt-input") as HTMLInputElement;
        this.hidden = true;
    }

    get value(): string {
        return this.input.value;
    }

    /** Left alone while the field is being typed in, so a re-sync never takes back a keystroke. */
    set value(value: string) {
        if (this.isFocused) {
            return;
        }

        this.input.value = value;
    }

    get isFocused(): boolean {
        return this.shadowRoot?.activeElement === this.input;
    }

    set onInput(callback: (value: string) => void) {
        this.input.addEventListener("input", () => callback(this.input.value));
    }

    /**
     * Called with the direction an arrow carries the cursor out of the field, once the caret
     * stands at the edge it would leave by. The key is only taken over when the callback reports
     * the cursor has moved, so an edge with nothing beyond it keeps the caret where it is.
     */
    set onLeave(callback: (isBefore: boolean) => boolean) {
        this.input.addEventListener("keydown", (event) => {
            const isBefore = this.getLeavingDirection(event);
            if (isBefore === null || !callback(isBefore)) {
                return;
            }

            event.preventDefault();
        });
    }

    /** Takes focus with the caret at the edge the cursor arrives from. */
    focusEdge(isBefore: boolean) {
        this.input.focus();
        const offset = isBefore ? this.input.value.length : 0;
        this.input.setSelectionRange(offset, offset);
    }

    /** Lays the field under `rect`, the image's box, across its width. */
    cover(rect: DOMRect) {
        this.style.left = `${rect.left}px`;
        this.style.top = `${rect.bottom}px`;
        this.style.width = `${rect.width}px`;
        this.hidden = false;
        this.clip();
    }

    /**
     * Hides a field the editor's view no longer holds: nothing clips it, so the caption of an
     * image scrolled away would be drawn over whatever stands there instead.
     */
    private clip() {
        this.style.visibility = isInsideScrollContainer(this.getBoundingClientRect()) ? "" : "hidden";
    }

    clear() {
        this.hidden = true;
    }

    /** The direction the key leaves the field in, or null while the caret still has text to cross. */
    private getLeavingDirection(event: KeyboardEvent): boolean | null {
        if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey ||
            this.input.selectionStart !== this.input.selectionEnd) {
            return null;
        }

        // A field is one line, so a vertical move always leaves it - the same reading isOnEdgeLine
        // gives a block with no layout. A horizontal one leaves only from the edge it heads for.
        if (event.key === "ArrowUp") {
            return true;
        }

        if (event.key === "ArrowDown") {
            return false;
        }

        const offset = this.input.selectionStart ?? 0;
        if (event.key === "ArrowLeft" && offset === 0) {
            return true;
        }

        if (event.key === "ArrowRight" && offset === this.input.value.length) {
            return false;
        }

        return null;
    }
}

customElements.define("be-image-alt", ImageAlt);

export default ImageAlt;
