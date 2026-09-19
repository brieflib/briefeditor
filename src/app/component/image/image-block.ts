import "@/component/image/asset/image-block.css";
import ImageAlt from "@/component/image/image-alt";
import ImageControl from "@/component/image/image-control";
import {getScrollContainer} from "@/component/shared/scroll-container";
import execCommand from "@/core/command/exec-command";
import {Action} from "@/core/command/type/command";
import {getRootElement, isImageBlock} from "@/core/shared/element-util";

/**
 * Lays a close control over the image block under the pointer, and the caption field under it;
 * selecting the control removes the block, typing in the field writes the image's alt. Only the
 * placement is done here: the stylesheets show them while the block, or they themselves, are hovered.
 */
export default class ImageBlock {
    private readonly contentEditable: HTMLElement;
    private readonly control: ImageControl;
    private readonly alt: ImageAlt;
    private pending: HTMLImageElement | null = null;

    constructor(contentEditable: HTMLElement) {
        this.contentEditable = contentEditable;
        this.control = this.createControl();
        this.alt = this.createAlt();

        this.contentEditable.addEventListener("pointermove", (event) => this.follow(event.target));
        // A touch has no move to follow: the press itself lays the control over the image.
        this.contentEditable.addEventListener("pointerdown", (event) => this.follow(event.target), {passive: true});
        getScrollContainer()?.addEventListener("scroll", () => this.align());
    }

    private createControl(): ImageControl {
        const control = new ImageControl();
        control.onSelect = () => {
            if (this.pending) {
                execCommand(this.contentEditable, {action: Action.DeleteImage, image: this.pending});
            }
            this.reset();
        };
        // A size takes the place of any other, so the block carries one at most.
        control.onSize = (className) => {
            if (this.pending) {
                execCommand(this.contentEditable, {
                    action: Action.ModifyClass,
                    element: getRootElement(this.contentEditable, this.pending),
                    classes: {add: [className], remove: control.sizeClasses.filter((name) => name !== className)}
                });
            }
            this.align();
        };
        document.body.appendChild(control);
        return control;
    }

    private createAlt(): ImageAlt {
        const alt = new ImageAlt();
        alt.onInput = (value) => {
            if (this.pending) {
                execCommand(this.contentEditable, {action: Action.Attribute, element: this.pending, attributes: {alt: value}});
            }
        };
        document.body.appendChild(alt);
        return alt;
    }

    /**
     * Moves the controls to the image block under `target`, if any; elsewhere they stay put, hidden
     * by the stylesheet. The block counts as a whole, so the strip it keeps under the image for the
     * caption reaches them as well.
     */
    private follow(target: EventTarget | null) {
        const node = target as Node | null;
        if (!node || !this.contentEditable.contains(node) || node === this.contentEditable) {
            return;
        }

        const block = getRootElement(this.contentEditable, node);
        const image = isImageBlock(block) ? block.querySelector("img") : null;
        if (!image) {
            return;
        }

        this.pending = image;
        this.align();
    }

    /** Re-lays the controls on their image, which scrolling or editing may have moved. */
    private align() {
        if (!this.pending?.isConnected) {
            this.reset();
            return;
        }
        const rect = this.pending.getBoundingClientRect();
        this.control.cover(rect);
        this.control.setActive(getRootElement(this.contentEditable, this.pending).classList);
        this.alt.cover(rect);
        this.alt.value = this.pending.alt;
    }

    private reset() {
        this.pending = null;
        this.control.clear();
        this.alt.clear();
    }
}
