export function countVerified(nodes = []) {
    return nodes.reduce(
        (sum, node) =>
            sum +
            (Array.isArray(node.children)
                ? countVerified(node.children)
                : Number(node.isVerified === true)),
        0,
    );
}
