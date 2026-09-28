/** Content taken out of the DOM together with the original node every fragment node stands for. */
export interface ExtractedContent {
    readonly fragment: DocumentFragment,
    readonly originalByFragmentNode: Map<Node, Node>,
    /** The cut of the first block, where the merge inserts the content back. */
    readonly cut: number | undefined
}
