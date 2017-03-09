/*
    Logs into Outlook and aquires an access token for the user.
    The access token is then saved to S3 for access by other services.
 */

'use strict';

const url = require('url');
const spawn = require('child_process').spawn;
const http = require('http');
const Promise = require('bluebird');
const request = Promise.promisify(require('request'));
const querystring = require('querystring');
const configUtils = require('../lib/configUtils');
const ld = require('lodash');

// Gets an access token for making Outlook requests
function getToken(config, code) {
    return request({
        method: 'post',
        uri: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: querystring.stringify({
            client_id: config.outlook.clientId,
            client_secret: config.outlook.clientSecret,
            code,
            redirect_uri: 'http://localhost:3000',
            grant_type: 'authorization_code',
        }),
        json: true,
    }).then(response => response.body);
}

configUtils.downloadConfig().then((config) => {
    // Format the authentication url
    const loginPath = url.format({
        protocol: 'https',
        host: 'login.microsoftonline.com',
        pathname: 'common/oauth2/v2.0/authorize',
        query: {
            client_id: config.outlook.clientId,
            redirect_uri: 'http://localhost:3000',
            response_type: 'code',
            scope: 'offline_access https://outlook.office.com/tasks.readwrite',
        },
    });

    // Start the server to accept the redirect
    const server = http.createServer((req, resp) => {
        const urlObject = url.parse(req.url, true);
        if (urlObject.pathname === '/') {
            const code = urlObject.query.code;
            resp.end('Logged in, you may close this window.');
            server.close();
            getToken(config, code).then((body) => {
                ld.assign(config, {
                    tokenInfo: {
                        token: body.access_token,
                        refreshToken: body.refresh_token,
                    },
                });
                return configUtils.uploadConfig(config);
            }).then(() => process.exit());
        }
    }).listen(3000);

    // Open the url
    spawn('open', [loginPath]);
});
