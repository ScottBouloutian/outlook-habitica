'use strict';

const aws = require('aws-sdk');
const Promise = require('bluebird');

class Dynamo {
    constructor(table) {
        const client = new aws.DynamoDB.DocumentClient({ region: 'us-east-1' });
        this.table = table;
        this.getItem = Promise.promisify(client.get, { context: client });
        this.putItem = Promise.promisify(client.put, { context: client });
        this.deleteItem = Promise.promisify(client.delete, { context: client });
    }

    get(key) {
        return this.getItem({
            TableName: this.table,
            Key: key,
        }).then(data => data.Item);
    }

    put(item) {
        return this.putItem({
            TableName: this.table,
            Item: item,
        });
    }

    delete(key) {
        return this.deleteItem({
            TableName: this.table,
            Key: key,
        });
    }
}
module.exports = Dynamo;
