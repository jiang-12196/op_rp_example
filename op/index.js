'use strict';

/* eslint-disable no-console */

const Provider = require('oidc-provider');
const path = require('path');
const _ = require('lodash');
const bodyParser = require('body-parser');
const querystring = require('querystring');
const ejs = require('ejs');
const express = require('express');
const app = express();

app.engine('html',ejs.__express);
app.set('view engine', 'html');
app.set ('views', path.resolve(__dirname, 'views'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const port = process.env.PORT || 3000;

const Account = require('./account');
const settings = require('./settings');

const issuer = process.env.ISSUER || 'http://localhost:3000';

if (process.env.MONGODB_URI) {
  const MongoAdapter = require('./adapters/mongodb'); // eslint-disable-line global-require
  settings.config.adapter = MongoAdapter;
}

settings.config.findById = Account.findById;
const clients = settings.clients;

const provider = new Provider(issuer, settings.config);

if (process.env.HEROKU) {
  provider.defaultHttpOptions = { timeout: 15000 };
}

provider.initialize({
  clients,
  keystore: { keys: settings.certificates },
  integrity: { keys: settings.integrityKeys },
}).then(() => {
  provider.app.keys = ['some secret key', 'and also the old one'];
  app.get('/interaction/:grant', async (req,res) => {
    const cookie = provider.interactionDetails(req);
    const client = await provider.Client.find(cookie.params.client_id);

    if (cookie.interaction.error === 'login_required') {
       res.render('login', {
        client,
        cookie,
        title: 'Sign-in',
        debug: querystring.stringify(cookie.params, ',<br/>', ' = ', {
          encodeURIComponent: value => value,
        }),
        interaction: querystring.stringify(cookie.interaction, ',<br/>', ' = ', {
          encodeURIComponent: value => value,
        }),
      });
    } else {
        res.render('interaction', {
        client,
        cookie,
        title: 'Authorize',
        debug: querystring.stringify(cookie.params, ',<br/>', ' = ', {
          encodeURIComponent: value => value,
        }),
        interaction: querystring.stringify(cookie.interaction, ',<br/>', ' = ', {
          encodeURIComponent: value => value,
        }),
      });
    }

  });

  app.post('/interaction/:grant/confirm', (req,res, next) => {
    const result = { consent: {} };
    provider.interactionFinished(req, res, result);
    return next();
  });

  app.post('/interaction/:grant/login', async (req,res, next) => {
    const account = await Account.findByLogin(req.body.login);

    const result = {
      login: {
        account: account.accountId,
        acr: 'urn:mace:incommon:iap:bronze',
        amr: ['pwd'],
        remember: !!req.body.remember,
        ts: Math.floor(Date.now() / 1000),
      },
      consent: {},
    };

    provider.interactionFinished(req, res, result);
  });

  app.use('/', provider.callback);
  app.listen(port)
})
.catch((err) => {
  console.error(err);
  process.exit(1);
});
