'use strict';

const Promise = require('bluebird');
const request = Promise.promisify(require('request'));
const querystring = require('querystring');
const RequestError = require('./RequestError');
const ld = require('lodash');

class Outlook {
    constructor(options) {
        this.clientId = options.clientId;
        this.clientSecret = options.clientSecret;
        this.token = options.token;
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

    authRequest(endpoint, options) {
        const requestOptions = ld.assign({
            uri: `https://outlook.office.com/api/v2.0${endpoint}`,
            headers: {
                Authorization: `Bearer ${this.token}`,
            },
        }, options || { });
        return request(requestOptions);
    }

    createSubscription(webhook) {
        return this.authRequest('/me/subscriptions', {
            method: 'post',
            json: {
                '@odata.type': '#Microsoft.OutlookServices.PushSubscription',
                Resource: 'https://outlook.office.com/api/v2.0/me/tasks',
                NotificationURL: webhook,
                ChangeType: 'Created, Updated, Deleted',
            },
        }).then((response) => {
            if (response.statusCode !== 201) {
                throw new RequestError(response.statusCode, response.body);
            }
            return response.body;
        });
    }

    renewSubscription(id) {
        return this.authRequest(`/me/subscriptions/${id}`, {
            method: 'patch',
            json: {
                '@odata.type': '#Microsoft.OutlookServices.PushSubscription',
            },
        }).then((response) => {
            if (response.statusCode !== 200) {
                throw new RequestError(response.statusCode, response.body);
            }
            return response.body;
        });
    }

    getTask(id) {
        return this.authRequest(`/me/tasks/${id}`, { json: true }).then((response) => {
            if (response.statusCode !== 200) {
                throw new RequestError(response.statusCode, response.body);
            }
            return response.body;
        });
    }

    completeTask(id) {
        return this.authRequest(`/me/tasks/${id}/complete`, {
            method: 'post',
            json: true,
        }).then((response) => {
            if (response.statusCode !== 200) {
                throw new RequestError(response.statusCode, response.body);
            }
            return response.body.value[0];
        });
    }
}
module.exports = Outlook;
