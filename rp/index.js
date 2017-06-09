'use strict';

const { Issuer } = require('openid-client');

const {
  ISSUER = 'http://localhost:3000',
  PORT = 3001,
} = process.env;

const appFactory = require('./app');

Issuer.defaultHttpOptions = { retries: 5, timeout: 10000 };

Issuer.discover(ISSUER).then((issuer) => {
  const app = appFactory(issuer);
  app.listen(PORT);
}).catch((err) => {
  console.error(err); // eslint-disable-line no-console
  process.exit(1);
});
