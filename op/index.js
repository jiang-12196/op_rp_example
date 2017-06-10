'use strict';

/* eslint-disable no-console */

const Provider = require('oidc-provider');
const path = require('path');
const _ = require('lodash');
const bodyParser = require('koa-body');
const querystring = require('querystring');
const Router = require('koa-router');
const render = require('koa-ejs');
const Koa = require('koa');
const app = new Koa();

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
  render(app, {
    cache: false,
    layout: '_layout',
    root: path.join(__dirname, 'views'),
  });

  provider.app.keys = ['some secret key', 'and also the old one'];
  provider.app.proxy = true;

  if (process.env.NODE_ENV === 'production') {
    provider.app.proxy = true;
    _.set(settings.config, 'cookies.short.secure', true);
    _.set(settings.config, 'cookies.long.secure', true);

    provider.app.middleware.unshift(function* ensureSecure(next) {
      if (this.secure) {
        yield next;
      } else if (this.method === 'GET' || this.method === 'HEAD') {
        this.redirect(this.href.replace(/^http:\/\//i, 'https://'));
      } else {
        this.body = {
          error: 'invalid_request',
          error_description: 'do yourself a favor and only use https',
        };
        this.status = 400;
      }
    });
  }

  const router = new Router();

  router.get('/interaction/:grant', async(ctx, next) => {
    const cookie = provider.interactionDetails(ctx.req);
    const client = await provider.Client.find(cookie.params.client_id);

    if (cookie.interaction.error === 'login_required') {
      await ctx.render('login', {
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
        await ctx.render('interaction', {
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

    return next();
  });

  const body = bodyParser();

  router.post('/interaction/:grant/confirm', async(ctx, next) => {
    const result = { consent: {} };
    provider.interactionFinished(ctx.req, ctx.res, result);
    return next();
  });

  router.post('/interaction/:grant/login', async(ctx, next) => {
    const account = await Account.findByLogin(ctx.request.body.login);

    const result = {
      login: {
        account: account.accountId,
        acr: 'urn:mace:incommon:iap:bronze',
        amr: ['pwd'],
        remember: !!ctx.request.body.remember,
        ts: Math.floor(Date.now() / 1000),
      },
      consent: {},
    };

    provider.interactionFinished(ctx.req, ctx.res, result);
  });

  app.use(async(ctx, next) => provider.callback);
  app.use(router.routes());
  app.use(router.allowedMethods());
  app.listen(port)
})
.then(() => {

})
.catch((err) => {
  console.error(err);
  process.exit(1);
});
