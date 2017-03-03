const config = require('./config.json');
const url = require('url');
const spawn = require('child_process').spawn;
const http = require('http');
const Promise = require('bluebird');
const request = Promise.promisify(require('request'));
const querystring = require('querystring');
const moment = require('moment');
const aws = require('aws-sdk');

const s3 = new aws.S3({ region: 'us-east-1' });
const putObject = Promise.promisify(s3.putObject, { context: s3 });

const loginPath = url.format({
    protocol: 'https',
    host: 'login.microsoftonline.com',
    pathname: 'common/oauth2/v2.0/authorize',
    query: {
        client_id: config.outlook.clientId,
        redirect_uri: 'http://localhost:3000',
        response_type: 'code',
        scope: 'offline_access https://outlook.office.com/tasks.read',
    },
});

function getToken(code) {
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
    }).then(({ body }) => body);
}

const server = http.createServer((req, resp) => {
    const urlObject = url.parse(req.url, true);
    if (urlObject.pathname === '/') {
        const { code } = urlObject.query;
        resp.end('Logged in, you may close this window.');
        server.close();
        getToken(code).then(body => (
            putObject({
                Bucket: config.s3.bucket,
                Key: 'token.json',
                Body: JSON.stringify({
                    token: body.access_token,
                    refreshToken: body.refresh_token,
                    expires: moment().add(body.expires_in, 'seconds').toDate(),
                }),
            })
        )).then(() => process.exit());
    }
}).listen(3000);

spawn('open', [loginPath]);
