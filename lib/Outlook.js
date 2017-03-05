'use strict';

const Promise = require('bluebird');
const request = Promise.promisify(require('request'));
const querystring = require('querystring');
const RequestError = require('./RequestError');

class Outlook {
    constructor(options) {
        this.clientId = options.clientId;
        this.clientSecret = options.clientSecret;
    }

    refreshToken(refreshToken) {
        return request({
            method: 'post',
            uri: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: querystring.stringify({
                client_id: this.clientId,
                client_secret: this.clientSecret,
                refresh_token: refreshToken,
                redirect_uri: 'http://localhost:3000',
                grant_type: 'refresh_token',
            }),
            json: true,
        }).then((response) => {
            if (response.statusCode !== 200) {
                throw new RequestError(response.statusCode, response.body);
            }
            return response.body;
        });
    }
}
module.exports = Outlook;
