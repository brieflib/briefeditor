import "@/component/image/asset/image-block.css";
import ImageControl from "@/component/image/image-control";
import execCommand from "@/core/command/exec-command";
import {Action} from "@/core/command/type/command";
import {getRootElement, isImageBlock} from "@/core/shared/element-util";

/**
 * Lays a close control over the image under the pointer; selecting it removes the image block.
 * Only the placement is done here: the stylesheets show the control while the image or the
 * control itself is hovered.
 */
export default class ImageBlock {
    private readonly contentEditable: HTMLElement;
    private readonly control: ImageControl;
    private pending: HTMLImageElement | null = null;

    constructor(contentEditable: HTMLElement) {
        this.contentEditable = contentEditable;
        this.control = this.createControl();

        this.contentEditable.addEventListener("pointermove", (event) => this.follow(event.target));
        // A touch has no move to follow: the press itself lays the control over the image.
        this.contentEditable.addEventListener("pointerdown", (event) => this.follow(event.target), {passive: true});
        document.querySelector("#be-content")?.addEventListener("scroll", () => this.align());
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

    /** Moves the control to the image block under `target`, if any; elsewhere it stays put, hidden by the stylesheet. */
    private follow(target: EventTarget | null) {
        const image = (target as HTMLElement | null)?.closest("img") as HTMLImageElement | null;
        if (!image || !isImageBlock(getRootElement(this.contentEditable, image))) {
            return;
        }

        this.pending = image;
        this.align();
    }

    /** Re-lays the control over its image, which scrolling or editing may have moved. */
    private align() {
        if (!this.pending?.isConnected) {
            this.reset();
            return;
        }
        this.control.cover(this.pending.getBoundingClientRect());
        this.control.setActive(getRootElement(this.contentEditable, this.pending).classList);
    }

    private reset() {
        this.pending = null;
        this.control.clear();
    }
}
