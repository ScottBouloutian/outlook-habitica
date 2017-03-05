'use strict';

class RequestError extends Error {
    constructor(code, body) {
        super(`code ${code}`);
        this.code = code;
        this.body = body;
    }
}
module.exports = RequestError;
