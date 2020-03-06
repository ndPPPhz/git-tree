const keytar = require('keytar')

var readline = require('readline');
var Writable = require('stream').Writable;

module.exports = {
    async retriveConfiguration(argv, keychainService) {
        const token = await userToken(argv.token, keychainService)
        return {
            all: !!argv.all,
            path: argv.path || process.cwd(),
            token:  token
        }
    }
}

async function userToken(passedToken, keychainService) {
    const username = require("os").userInfo().username

    // If the user hasn't passed the token check if already exists
    if (passedToken == null) {
        const token = await keytar.getPassword(keychainService, username)

        // If the token isn't in the system keychain
        if (token == null) {
            var mutableStdout = new Writable({
                write: function(chunk, encoding, callback) {
                    if (!this.muted)
                    process.stdout.write(chunk, encoding);
                    callback();
                }
                });
                
                mutableStdout.muted = false;
                
                var rl = readline.createInterface({
                input: process.stdin,
                output: mutableStdout,
                terminal: true
                });
                return await new Promise((resolve, error) => {
                    rl.question('Insert token: ', function(token) {
                        console.log(`\nSaved token is token ${token}. Add --token TOKEN to rewrite it.`);
                        keytar.setPassword(keychainService, username, token)
                        rl.close();
                        resolve(token)
                    });
                    mutableStdout.muted = true;
                })

        } else {
            // There was already a token saved
            console.log(`Fetched token from the keychain: ${token}`)
            return await new Promise((resolve, error) => {
                resolve(token) 
            })
        }
    } else {
        // Set the token being passed as argument as new token
        console.log(`A new token is being saved: ${passedToken}`)
        await keytar.setPassword(keychainService, username, passedToken)
        return await new Promise((resolve, error) => {
            resolve(passedToken) 
        })
    }
}
