const version = "1.0.0"
const Git = require("nodegit")
const https = require("https")

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
        const childrenString = this.nodeString(this.rootNode, 0)
        return "Tree:\n\n" + rootNodeString + childrenString
    }

    nodeString(node, currentHeight) {
        // Generate the Tree output
        let childrenString = ""
        const lastIndex = node.children.length - 1

        node.children.forEach((child, index) => {
            childrenString += "\n"
            if (currentHeight > 0) {
                childrenString += "│"
            }
            childrenString += "\t".repeat(currentHeight)

            if (index < lastIndex) {
                childrenString += "├────"
                childrenString += child.toString()
                childrenString += this.nodeString(child, currentHeight + 1)
            } else {
                childrenString += "└────"
                childrenString += child.toString()
                childrenString += this.nodeString(child, currentHeight + 1)
                childrenString += "\n|"
            }
        })
        return childrenString
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
        pendingPRNodes.reverse().forEach( (node, index, _) => {
            if (node.data == topNode.data) {
                // When it finds a node whose base is the default branch take the children 
                node.children.forEach ( (subnode) => {
                    // Append the child to the list of the children
                    topNode.children.push(subnode)

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

async function app() {
    // Open the git directory. This will be useful for the next version when
    // the script will be able to pull the main branch into the dependent branches automatically
    const repo = await Git.Repository.open(repositoryPath)
    const currentBranch = await repo.getCurrentBranch()

    // currentBranch.name() returns refs/head/BRANCH_NAME
    const currentBranchName = currentBranch.name().split("/")[2]
    console.log(`Your current branch is: ${currentBranchName} \n`)

    const remote = await repo.getRemote("origin")
    const repositoryName = remote.url().split(":")[1].split(".")[0]
    
    const options = {
        path: `/repos/${repositoryName}/pulls`,
        headers: {
            Authorization: `token ${token}`,
            'User-Agent': `gittree/${version}`,
      }
    }

    const pullRequestURL = "https://api.github.com"

    // Make the request
    https.get(pullRequestURL, options, res => {
        const { statusCode } = res
        const contentType = res.headers['content-type']

        let error
        if (statusCode !== 200) {
            error = new Error('Request Failed.\n' + `Status Code: ${statusCode}`)
        } else if (!/^application\/json/.test(contentType)) {
            error = new Error('Invalid content-type.\n' + `Expected application/json but received ${contentType}`)
        }

        if (error) {
            console.error(error.message)
            // Consume response data to free up memory
            res.resume()
            return
        }

        let rawData = ''
        res.on('data', (chunk) => { rawData += chunk })
        res.on('end', () => {
          try {
            // Parse the gotten data as JSON
            const parsedData = JSON.parse(rawData)
            // Extract the info
            getPullRequestData(parsedData)
          } catch (e) {
            console.error(e.message)
          }
        })
    })

    function getPullRequestData(data) {
        const PRs = data.map( (_, jsonIndex) => {
            // Get the base branch
            const base = data[jsonIndex].base
            const baseBranch = new Branch(base.ref, base.sha)

            // Get the head branch
            const head = data[jsonIndex].head
            const headBranch = new Branch(head.ref, head.sha)

            return new PullRequest(headBranch, baseBranch)
        })
       
        const treeBuilder = new TreeBuilder(PRs, "develop")
        const tree = treeBuilder.generate()
        console.log(tree.toString())
    }
}

if (process.argv.length < 3) {
    console.log("Missing parameters")
    process.exit(-1)
}

const token = process.argv[2]
const repositoryPath = process.argv[3] || process.cwd()

// Run
app()