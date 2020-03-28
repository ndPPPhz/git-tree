const version = "1.0.0"
const keychainService = 'dev.annino.gittree'

const { TreeBuilder, Branch, PullRequest, TreeNode, Tree } = require('./model')
const retriveConfiguration = require('./config').retriveConfiguration
const process = require('process')
let readline = require('readline')

const Git = require("nodegit")
const https = require("https")
const argv = require('yargs').argv

async function app(config) {
    // Open the git directory. This will be useful for the next version when
    // the script will be able to pull the main branch into the dependent branches automatically
    const repo = await Git.Repository.open(config.path)
    const currentBranch = await repo.getCurrentBranch()

    // currentBranch.name() returns refs/head/BRANCH_NAME
    const currentBranchName = currentBranch.name().split("/")[2]
    console.log(`Your current branch is: ${currentBranchName} \n`)

    const remote = await repo.getRemote("origin")
    const repositoryName = remote.url().split(":")[1].split(".")[0]
    
    const options = {
        path: `/repos/${repositoryName}/pulls`,
        headers: {
            Authorization: `token ${config.token}`,
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
        res.on('end', async () => {
          try {
            // Parse the gotten data as JSON
            const parsedData = JSON.parse(rawData)
            // Extract the info
            const PRs = getPullRequestData(parsedData)

            const treeBuilder = new TreeBuilder(PRs, "develop")
            const tree = treeBuilder.generate()

            if (config.all) {
                console.log(tree.toString())
                process.exit()
            } else {
                if (tree.rootNode.children == null) {
                    console.log("Your current branch's PR doesn't have any dependent PR")
                    process.exit()
                }

                var y = tree.depthFirstSearch(currentBranchName)
                var x = new TreeNode(y.data)
                while (y.parent != null) {
                    const n = new TreeNode(y.parent.data)
                    x.parent = n
                    n.children = [x]
                    y = y.parent
                    x = x.parent
                }
                const reducedTree = new Tree(x)
                console.log(reducedTree.toString())

                var rl = readline.createInterface({
                    input: process.stdin,
                    output: process.stdout,
                    terminal: true
                });

                await new Promise((resolve, error) => {
                    var waitForUserInput = async function() {
                        rl.question("Do you want to update the all chain of branches?[y/n] ", async function (answer) {
                            if (answer == "y") {
                                rl.close()
                                resolve()
                            }
                            else if (answer == "n") {
                                process.exit()
                            }
                            else {
                                waitForUserInput()
                            }
                        });
                    }
                    return waitForUserInput();
                })
                
                repo.fetch("origin", {
                    callbacks: {
                      credentials: function(url, userName) {
                        return nodegit.Cred.sshKeyFromAgent(userName);
                      }
                    }
                })
        
                // Pull the last state
                const pull = await repo.mergeBranches(reducedTree.rootNode.data, `origin/${reducedTree.rootNode.data}`)
                console.log(`Pulling ${reducedTree.rootNode.data}`)
                let next = reducedTree.rootNode.children[0]

                while(next != null) {
                    await repo.mergeBranches(next.data, `origin/${next.data}`)
                    console.log(`Pulling ${next.data}`)
                    next = next.children[0]
                }
                
                console.log("Now Updating all the dependent branches")
                let head = reducedTree.rootNode
                let nextHead = head.children[0]
        
                while(nextHead != null) {
                    console.log(`Merging ${head.data} into ${nextHead.data}`)
                    await repo.mergeBranches(nextHead.data, `origin/${head.data}`)
                    head = nextHead
                    nextHead = head.children[0]
                }
            }
          } catch (e) {
            console.error(e.message)
          }
        })
    })

    function getPullRequestData(data) {
        return data.map( (_, jsonIndex) => {
            // Get the base branch
            const base = data[jsonIndex].base
            const baseBranch = new Branch(base.ref, base.sha)

            // Get the head branch
            const head = data[jsonIndex].head
            const headBranch = new Branch(head.ref, head.sha)

            return new PullRequest(headBranch, baseBranch)
        })
    }
}

retriveConfiguration(argv, keychainService).then((config, errpr) => {
    // Run
    app(config)
})