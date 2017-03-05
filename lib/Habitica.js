'use strict';

const Promise = require('bluebird');
const request = Promise.promisify(require('request'));
const ld = require('lodash');
const RequestError = require('./RequestError');

class Habitica {
    constructor(options) {
        this.user = options.user;
        this.key = options.token;
    }

    authRequest(endpoint, options) {
        const requestOptions = ld.assign({
            uri: `https://habitica.com/api/v3${endpoint}`,
            headers: {
                'x-api-user': this.user,
                'x-api-key': this.key,
            },
        }, options || { });
        return request(requestOptions);
    }

    createTask(task) {
        return this.authRequest('/tasks/user', {
            method: 'post',
            json: task,
        }).then((response) => {
            if (response.statusCode !== 201) {
                throw new RequestError(response.statusCode, response.body);
            }
            return response.body.data;
        });
    }

    updateTask(id, task) {
        return this.authRequest(`/tasks/${id}`, {
            method: 'put',
            json: task,
        }).then((response) => {
            if (response.statusCode !== 200) {
                throw new RequestError(response.statusCode, response.body);
            }
            return response.body.data;
        });
    }

    deleteTask(id) {
        return this.authRequest(`/tasks/${id}`, {
            method: 'delete',
        }).then((response) => {
            if (response.statusCode !== 200) {
                throw new RequestError(response.statusCode, response.body);
            }
            return response.body.data;
        });
    }
}
module.exports = Habitica;
