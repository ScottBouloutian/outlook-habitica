const test = require('tape');
const faker = require('faker');
const outlook = require('../outlook');
const sinon = require('sinon');

test('handling an Outlook task that has been created', (t) => {
    const event = {
        params: { querystring: { } },
        'body-json': {
            value: [
                {
                    ChangeType: 'Created',
                    ResourceData: {
                        Id: faker.random.uuid(),
                    },
                },
            ],
        },
    };
    const callback = sinon.spy();

    t.plan(1);
    outlook.handler(event, { }, callback).then(() => (
        t.ok(callback.calledWith(null))
    ));
});
