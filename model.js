class Branch {
    constructor(name, sha) {
        this.name = name
        this.sha = sha
    }
}

class PullRequest {
    constructor(head, base) {
        this.head = head
        this.base = base
    }

    toString() {
        return `PR: ${this.head} into ${this.base}`
    }
}

class TreeNode {
    constructor(data) {
        this.data = data
        this.children = []
        this.parent = null
    }

    toString() {
        return this.data
    }
}

class Tree {
    constructor(rootNode) {
        this.rootNode = rootNode
    }

    toString() {
        const rootNodeString = this.rootNode.toString()
        const childrenString = this.nodeString(this.rootNode, 0, true)
        return "Tree:\n\n" + rootNodeString + childrenString
    }

    nodeString(node, currentHeight, isRootNodeCaller) {
        // Generate the Tree output
        let childrenString = ""
        const lastIndex = node.children.length - 1

        node.children.forEach((child, index) => {
            childrenString += "\n"
            if (currentHeight > 0 && !isRootNodeCaller) {
                childrenString += "│"
            }
            childrenString += "\t".repeat(currentHeight)

            if (index < lastIndex) {
                childrenString += "├────"
                childrenString += child.toString()
                childrenString += this.nodeString(child, currentHeight + 1, false)
            } else {
                childrenString += "└────"
                childrenString += child.toString()
                childrenString += this.nodeString(child, currentHeight + 1, isRootNodeCaller)
                if (currentHeight == 0 || isRootNodeCaller) {
                    childrenString += "\n"
                } else {
                    childrenString += "\n│"
                }
            }
        })
        return childrenString
    }

    depthFirstSearch(data) {
        return this.dfs(data, this.rootNode)
    }

    dfs(data, rootNode) {
        for (const currentChildNode of rootNode.children) {
            if (currentChildNode.data == data) {
                return currentChildNode
            } else if (currentChildNode.children.length != 0) {
                const result = this.dfs(data, currentChildNode)
                if (result != null) {
                    return result
                }
            } else {
                continue
            }
        }
    }
}

class TreeBuilder {
    constructor(prs, defaultBranchName) {
        // Turns the PRs into TreeNodes
        const nodePRs = prs.map((pr) => {
            const base = new TreeNode(pr.base.name)
            const head = new TreeNode(pr.head.name)
            //      (base)
            //      /
            // (head)
            base.children.push(head)
            return base
        })

        this.nodePRs = nodePRs
        this.rootNode = new TreeNode(defaultBranchName)
    }

    generate() {
        // Here's where the script goes thtough all the PRs and it generates the tree
        this.findDependentPRs(this.rootNode, this.nodePRs)
        return new Tree(this.rootNode)
    }

    findDependentPRs(topNode, pendingPRNodes) {
        // It starts looking for all the PRs whose base is the the default branch
        pendingPRNodes.slice().reverse().forEach( (node, index, _) => {
            if (node.data == topNode.data) {
                // When it finds a node whose base is the default branch take the children 
                node.children.forEach ( (subnode) => {
                    // Append the child to the list of the children
                    topNode.children.push(subnode)
                    subnode.parent = topNode

                    // Remove the following PR from the list of all the PRs
                    const notReversedIndex = pendingPRNodes.length - index - 1
                    let pendingPRNodesCopy = [...pendingPRNodes]
                    pendingPRNodesCopy.splice(notReversedIndex,1)

                    // Recursively call the same function for the child.
                    // Then, it will find all the PRs whose base branch is the same of the subnode
                    this.findDependentPRs(subnode, pendingPRNodesCopy)
                })
            }
        })
    }
}

module.exports = {
    TreeBuilder,
    Branch,
    PullRequest,
    TreeNode,
    Tree
}