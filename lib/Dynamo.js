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
        this.scanItems = Promise.promisify(client.scan, { context: client });
    }

    get(id) {
        return this.getItem({
            TableName: this.table,
            Key: { id },
        }).then(data => data.Item);
    }

    put(item) {
        return this.putItem({
            TableName: this.table,
            Item: item,
        });
    }

    delete(id) {
        return this.deleteItem({
            TableName: this.table,
            Key: { id },
        });
    }

    scan(key, value) {
        return this.scanItems({
            TableName: this.table,
            FilterExpression: `${key} = :value`,
            ExpressionAttributeValues: { ':value': value },
        }).then(result => result.Items[0]);
    }
}
module.exports = Dynamo;
