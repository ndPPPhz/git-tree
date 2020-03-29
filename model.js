/**
 * A git Branch object 
 */
class Branch {
    constructor(name) {
        this.name = name
    }
}

/**
 * A PullRequest object with the base and the head Branches
 */
class PullRequest {

    /**
    * Construct a PullRequest passing the head and base Branches
    * @param {Branch} head The head branch
    * @param {Branch} base The base branch
    */
    constructor(head, base) {
        this.head = head
        this.base = base
    }

    toString() {
        return `PR: ${this.head} into ${this.base}`
    }
}

/**
 * A TreeNode representation.
 *  A node is a simple object which holds a data and may be linked to at most one parent node and may have {0,N} children. 
 */
class TreeNode {

    /**
    * Construct a TreeNode passing the data it will hold.
    * @param data The data the node will hold. Data MUST not be null
    */
    constructor(data) {
        this.data = data
        this.children = []
        this.parent = null
    }

    toString() {
        return this.data
    }
}

/**
 *  A Tree is an object which holds a node also called rootNode.
 */
class Tree {

    /**
    *  Initialise a Tree with a node. The root node MUST not have any parent node.
    *   @param {TreeNode} rootNode The rootNode
    */
    constructor(rootNode) {
        if (rootNode.parent != null) {
            console.error("Trying to initialise a Tree with a rootNode whose parent isn't null")
            process.exit();
        }
        this.rootNode = rootNode
    }

    /**
    *  The visual representation of the Tree in a string format
    */
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

    /**
    *  Search a node containing the data passed as argument using the depth first search algorythm
    */
    depthFirstSearch(data) {
        return this.dfs(data, this.rootNode)
    }

    dfs(data, rootNode) {
        // If the current node's data is equal to the required data, return it
        for (const currentChildNode of rootNode.children) {
            if (currentChildNode.data == data) {
                return currentChildNode
                // Otherwise search recursively the data scanning its children first 
            } else if (currentChildNode.children.length != 0) {
                const result = this.dfs(data, currentChildNode)
                if (result != null) {
                    return result
                }
                // If none of the children holds the required data, go to the next node
            } else {
                continue
            }
        }
    }
}


/**
*  An helper class which builds a tree of PRs given a list of PRs and the default branch.
*  When a PR is dependent by another PR, its parent will be equal to the depending PR.
*  In the same way, the depending PR will have the dependent PR as one of the children
*/
class TreeBuilder {

    /**
    *  Initialise the TreeBuilder passing a list or PRs and the name of the repo's default branch
    */
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

    /**
    *  Build a tree with the given defaultBranchName and PRs
    * @return {Tree} The built tree
    */
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