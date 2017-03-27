'use strict';

const Promise = require('bluebird');
const aws = require('aws-sdk');

const s3 = new aws.S3({ region: 'us-east-1' });
const getObject = Promise.promisify(s3.getObject, { context: s3 });
const putObject = Promise.promisify(s3.putObject, { context: s3 });
const bucket = process.env.OUTLOOK_HABITICA_BUCKET;

module.exports = {
    downloadConfig() {
        return getObject({
            Bucket: bucket,
            Key: 'outlook-habitica/config.json',
        }).then(body => JSON.parse(body.Body));
    },

    uploadConfig(config) {
        return putObject({
            Bucket: bucket,
            Key: 'outlook-habitica/config.json',
            Body: JSON.stringify(config),
        });
    },
};
