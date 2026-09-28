/** Content taken out of the DOM together with the original node every fragment node stands for. */
export interface ExtractedContent {
    readonly fragment: DocumentFragment,
    readonly originalByFragmentNode: Map<Node, Node>
}
