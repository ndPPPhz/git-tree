const keytar = require('keytar')

var readline = require('readline');
var Writable = require('stream').Writable;

async function retriveConfiguration({args, keychainService }) {
    return new Promise( async (resolve, reject) => {
        const passedToken = args['token']
        const token = await userToken(passedToken, keychainService)
        
        resolve(token)
    })
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
                    rl.question('Token: ', function(token) {
                        console.log('\nToken is ' + password);
                        keytar.setPassword(keychainService, username, token)
                        rl.close();
                        resolve(token)
                    });
                    mutableStdout.muted = true;
                })

        } else {
            // There was already a token saved
            console.log(`Fetched from keychain ${token}`)
            return new Promise((resolve, error) => {
                resolve(token) 
            })
        }
    } else {
        // Set the token being passed as argument as new token
        await keytar.setPassword(keychainService, username, passedToken)
        return new Promise((resolve, error) => {
            resolve(passedToken) 
        })
    }
}

const config = retriveConfiguration({args: {token: null}, keychainService: 'dev.annino.gitree'}).then((value, error) => {
    console.log(value)
})