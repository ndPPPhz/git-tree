const version = "1.0.0"
const keychainService = 'dev.annino.gittree'
const { TreeBuilder, Branch, PullRequest } = require('./model')
const retriveConfiguration = require('./config').retriveConfiguration

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

retriveConfiguration(argv, keychainService).then((config, errpr) => {
    // Run
    app(config)
})