import express from 'express';
import bodyParser from 'body-parser';
import Provider from 'oidc-provider';
import ejs from 'ejs';
import querystring from 'querystring';
import uuid from 'uuid';

const store = new Map();
const logins = new Map();

class Account {
  constructor(id) {
    this.accountId = id || uuid();
    store.set(this.accountId, this);
  }

  claims() {
    return {
      address: {
        country: '000',
        formatted: '000',
        locality: '000',
        postal_code: '000',
        region: '000',
        street_address: '000',
      },
      birthdate: '1987-10-16',
      email: 'johndoe@example.com',
      email_verified: false,
      family_name: 'Doe',
      gender: 'male',
      given_name: 'John',
      locale: 'en-US',
      middle_name: 'Middle',
      name: 'John Doe',
      nickname: 'Johny',
      phone_number: '+49 000 000000',
      phone_number_verified: false,
      picture: 'http://lorempixel.com/400/200/',
      preferred_username: 'Jdawg',
      profile: 'https://johnswebsite.com',
      sub: this.accountId,
      updated_at: 1454704946,
      website: 'http://example.com',
      zoneinfo: 'Europe/Berlin',
    };
  }

  static findByLogin(login) {
    if (!logins.get(login)) {
      logins.set(login, new Account());
    }

    return Promise.resolve(logins.get(login));
  }

  static findById(id) {
    if (!store.get(id)) new Account(id); // eslint-disable-line no-new
    return Promise.resolve(store.get(id));
  }
}

const app = express();

app.engine('html', ejs.renderFile);
app.set('view engine', 'html');

const config = {
  acrValues: ['session', 'urn:mace:incommon:iap:bronze'],
  cookies: {
    long: { signed: true },
    short: { signed: true },
  },
  discovery: {
    // service_documentation: pkg.homepage,
    // version: pkg.version,
  },
  claims: {
    amr: null,
    address: ['address'],
    email: ['email', 'email_verified'],
    phone: ['phone_number', 'phone_number_verified'],
    profile: ['birthdate', 'family_name', 'gender', 'given_name', 'locale', 'middle_name', 'name',
      'nickname', 'picture', 'preferred_username', 'profile', 'updated_at', 'website', 'zoneinfo'],
  },
  features: {
    devInteractions: false,
    claimsParameter: true,
    clientCredentials: true,
    encryption: true,
    introspection: true,
    registration: true,
    registrationManagement: false,
    request: true,
    requestUri: true,
    revocation: true,
    sessionManagement: true,
    backchannelLogout: true,
    oauthNativeApps: true,
    pkce: { skipClientAuth: true },
  },
  subjectTypes: ['public', 'pairwise'],
  pairwiseSalt: 'da1c442b365b563dfc121f285a11eedee5bbff7110d55c88',
  interactionUrl: function interactionUrl(interaction) { // eslint-disable-line no-unused-vars
    // this => koa context;
    return `/interaction/${this.oidc.uuid}`;
  },
};

const clients = [{
  token_endpoint_auth_method: 'client_secret_basic',
  client_id: 'client-basic',
  client_secret: 'secret',
  redirect_uris: ['http://localhost:8080/simple-web-app/openid_connect_login'],
}];

const certificates = [{
  d: 'VEZOsY07JTFzGTqv6cC2Y32vsfChind2I_TTuvV225_-0zrSej3XLRg8iE_u0-3GSgiGi4WImmTwmEgLo4Qp3uEcxCYbt4NMJC7fwT2i3dfRZjtZ4yJwFl0SIj8TgfQ8ptwZbFZUlcHGXZIr4nL8GXyQT0CK8wy4COfmymHrrUoyfZA154ql_OsoiupSUCRcKVvZj2JHL2KILsq_sh_l7g2dqAN8D7jYfJ58MkqlknBMa2-zi5I0-1JUOwztVNml_zGrp27UbEU60RqV3GHjoqwI6m01U7K0a8Q_SQAKYGqgepbAYOA-P4_TLl5KC4-WWBZu_rVfwgSENwWNEhw8oQ',
  dp: 'E1Y-SN4bQqX7kP-bNgZ_gEv-pixJ5F_EGocHKfS56jtzRqQdTurrk4jIVpI-ZITA88lWAHxjD-OaoJUh9Jupd_lwD5Si80PyVxOMI2xaGQiF0lbKJfD38Sh8frRpgelZVaK_gm834B6SLfxKdNsP04DsJqGKktODF_fZeaGFPH0',
  dq: 'F90JPxevQYOlAgEH0TUt1-3_hyxY6cfPRU2HQBaahyWrtCWpaOzenKZnvGFZdg-BuLVKjCchq3G_70OLE-XDP_ol0UTJmDTT-WyuJQdEMpt_WFF9yJGoeIu8yohfeLatU-67ukjghJ0s9CBzNE_LrGEV6Cup3FXywpSYZAV3iqc',
  e: 'AQAB',
  kty: 'RSA',
  n: 'xwQ72P9z9OYshiQ-ntDYaPnnfwG6u9JAdLMZ5o0dmjlcyrvwQRdoFIKPnO65Q8mh6F_LDSxjxa2Yzo_wdjhbPZLjfUJXgCzm54cClXzT5twzo7lzoAfaJlkTsoZc2HFWqmcri0BuzmTFLZx2Q7wYBm0pXHmQKF0V-C1O6NWfd4mfBhbM-I1tHYSpAMgarSm22WDMDx-WWI7TEzy2QhaBVaENW9BKaKkJklocAZCxk18WhR0fckIGiWiSM5FcU1PY2jfGsTmX505Ub7P5Dz75Ygqrutd5tFrcqyPAtPTFDk8X1InxkkUwpP3nFU5o50DGhwQolGYKPGtQ-ZtmbOfcWQ',
  p: '5wC6nY6Ev5FqcLPCqn9fC6R9KUuBej6NaAVOKW7GXiOJAq2WrileGKfMc9kIny20zW3uWkRLm-O-3Yzze1zFpxmqvsvCxZ5ERVZ6leiNXSu3tez71ZZwp0O9gys4knjrI-9w46l_vFuRtjL6XEeFfHEZFaNJpz-lcnb3w0okrbM',
  q: '3I1qeEDslZFB8iNfpKAdWtz_Wzm6-jayT_V6aIvhvMj5mnU-Xpj75zLPQSGa9wunMlOoZW9w1wDO1FVuDhwzeOJaTm-Ds0MezeC4U6nVGyyDHb4CUA3ml2tzt4yLrqGYMT7XbADSvuWYADHw79OFjEi4T3s3tJymhaBvy1ulv8M',
  qi: 'wSbXte9PcPtr788e713KHQ4waE26CzoXx-JNOgN0iqJMN6C4_XJEX-cSvCZDf4rh7xpXN6SGLVd5ibIyDJi7bbi5EQ5AXjazPbLBjRthcGXsIuZ3AtQyR0CEWNSdM7EyM5TRdyZQ9kftfz9nI03guW3iKKASETqX2vh0Z8XRjyU',
  use: 'sig',
}, {
  d: 'QCRapETx5p-iZ2eg7TCK9LWmIB38CZvbiDwjaDZPGM-hOvgYiD5HdsKmKyc40R6XWduAZgINQ8WfPQ2ms6Xfdnwdy7u0scy0lhDQlvWrF-FU1SQ3t4jEzI02zDZ3EeZOg3car5XpP5PRVBkC9yxmVYpQN1MRdNCwfkeeMSJtUf9LwVZXdfkk6VN0i_FjXH77cDhoPk4WEayWWSKLNeq1Hu9bhkXwakDoveHtpdgVoWR6H8RVZcIndzFS-tKxRUkUum6cr4V9zrcH7vI28W9M0LT2EU5omrs0MNIBjBzsxH_osYOol0EawTPIjejhnQSM6akQlKWzQEv6iPXKvHF5',
  dp: 'qNx5nc47pEfF_hfn72Xh3Tn_cQFIC-3dsWUQkZt9P7ve4Ue30S-sICXb9sEaeJ3oF2G_jGW6sLu9o7pkyKBQnaoBbZrDfCrPqF_5wFkR14SSV6PteFCMuooGeyrC5RNnoziFAX0roV8mpIyUlr1_NuItMqIBcKprvIUaCPQbaGs',
  dq: 'HUUQCZO4Xqe-0tknlk0RUzqFOKvdHTmMeAAKb74_aG5R9_YmfE-U_JO5SwSzer0BPfbIQ8w6NsU1MTiptW9DPkkzsZg1xjuYWvdfjsfuJUN0pq1QNxotEWna5YpZP1nXBXO68LbBU84KU7RMgOd8mSGI9zANoCOPgEzWP5FiY-k',
  e: 'AQAB',
  kty: 'RSA',
  n: 'mXauIvyeUFA74P2vcmgAWSCMw6CP6-MJ6EvFuRARfLLJEi49AzQvJl_4pwDvLkZcCqS7OqPE1ufNyDH6oQPEc7JuukHMY02EgwqHjJ6GG6FQqJuiWlKB_l-7c9y9r4bh4r58xdZc6T5dFVSNT2VcIVoSjq9VmzwpaTKCUyVeZYHZhnLfWMm9rKU5WSz75siG-_jbudItsfhEwA59kvi4So2IV9TxHwW50i4IcTB1gXwG1olNgiX3-Mq1Iw5VGPzMo2hQXI3q1y-ZjhSwhvG5dje9J8htBEWdVYk4f6cv19IE9gEx7T-2vIVw5FCpAmmfFuRebec49c7zjfr0EyTI4w',
  p: '65DqEX3ClDSQnH2mGDcnOWgy2M66bNqGA8DSPxHiNc_alLPD_3PJh0Q4PVIZeqi5LBxaHtEl28EFCaPP_2rfM22Ki32jY8WVSdoCMT5sD8tOGCF24zChGLHTRKlq1N7xffiUUUrzFTJE8_23r1GoGxRU4b81eiIU7iLxjepYv88',
  q: 'psaPv_vFHchNJ-225VnGwvfGYYKCoNgFBSFlLO4KvjPHVwcLDLuFlw1DJMS361s1cDhngglNvl-dgATfav0fJlYiVoh3Q0qHjsAW7Zq07nPeN4IW-n0tWcLBccLPj-S4oNiGWmax2IvpEdHMkY-AhpGbgOQEz9FXYLyHa6vStq0',
  qi: 'bqrEvOsv-dzuhh6dbQfxxq6aQn_hnYi89pFcThfkCEQmHEFqOoxR121QlqQmVPoZoqN7kzxvf_qFEyjvW9I-JuUlz4CbknhwHQrniUf3YwFtJ3SouqmAEL01c5pcB52Bh40J_xmd-Z7whjnwNMCDPQXTEtQZh4BXh4TWrq1N4No',
  use: 'enc',
}, {
  crv: 'P-256',
  d: 'K9xfPv773dZR22TVUB80xouzdF7qCg5cWjPjkHyv7Ws',
  kty: 'EC',
  x: 'FWZ9rSkLt6Dx9E3pxLybhdM6xgR5obGsj5_pqmnz5J4',
  y: '_n8G69C-A2Xl4xUW2lF0i8ZGZnk_KPYrhv4GbTGu5G4',
}, {
  crv: 'P-384',
  d: 'qdPGmba6NZMJYCF1UGOfHCKbc0CBtGss0zPVegBdw0sky6H7FamJcckfwItfS0HT',
  kty: 'EC',
  x: 'ij8LkaIQ-QkODmWucHJ7PWEtnnqlyd-iQU6fZcLoEEh-ScWULv4ggleNCWHdULtZ',
  y: 'tTq_5IMhNcPR6L4W7T0ATPofr0wNRpHOZEIcTLk6DBqb5o0ZLo3g0r1ZUxNdAU3W',
}, {
  crv: 'P-521',
  d: 'P9pF8q_vq97UloR9C4d05mGeCN3cQ4AP9p3kMubrAVuzUieeNFLEjRseWmXftsk4sVFxnM9Roxt5Sy1fN5VgeWc',
  kty: 'EC',
  x: 'AamstoAouLxrWi6WHt903QR7NMpK4NszB5mNEFqLqaCxRXhPwrq_BG5R-7UP41cUIF38TQCePJpGLnoC5amCJNy3',
  y: 'AUguNqeqkhVSrmolR58H4J26S58XinSN3kcnoIl75iHMKRMJDXBI9J4lBHALVn6i0zc9N9ucQAb8kmOXfObga_9J',
}];

const integrityKeys = [{
  kty: 'oct',
  k: 'TQcYPUBhQvg68X_7hwRyVyRNxpdkN-xsrOqVjgaCi-PsbeBrPHOYHcc4lPDIzdfEtdxpQ7pOMJn5__pW-NJx9w',
  alg: 'HS512',
}];

config.findById = Account.findById;

const provider = new Provider('http://localhost:3000', config);

provider.initialize({
  clients,
  keystore: { keys: certificates },
  integrity: { keys: integrityKeys },
})
.then(() => {
  provider.app.keys = ['some secret key', 'and also the old one'];

  app.use(bodyParser.json());
  
  app.get('/interaction/:grant', (req, res) => {
    const cookie = provider.interactionDetails(req);
    console.log("error--->",cookie.interaction.error);
    provider.Client.find(cookie.params.client_id)
    .then((client) => {
      if (cookie.interaction.error === 'login_required') {
        // res.redirect(`http://www.localhost:3001/login?uuid=${cookie.uuid}`);
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
        res.render('login', { title: 'login',cookie });
    }
    });
  });
  // post('/interaction/:grant/login'
  app.post('/interaction/:grant/login', (req , res) => {
    console.log("in this post login--->",req.body.remember);
    Account.findByLogin(req.body.login)
    .then((account) => {
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

  });

  app.post('/interaction/:grant/confirm', (req,res) => {
    const result = { consent: {} };
    provider.interactionFinished(req, res, result);
  });
  
  app.use('/', provider.callback);
  // //post('/interaction/:grant/confirm'


  app.listen(3000, () => {
      console.log(`The server is running at http://localhost:3000/`);
  });
});
