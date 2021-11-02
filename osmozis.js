const faker = require('faker');
const fetch = require('node-fetch');

class Osmozis {
  async getAuthUrl() {
    const resp = await fetch('http://www.wifi69.com', { redirect: 'manual' })
    return resp.headers.get('location');
  }

  async getToken() {
    return new URL(await this.getAuthUrl()).searchParams.get('key');
  }

  async init() {
    this.token = await this.getToken();
    console.log('Token:', this.token);
  }

  async getTargetColor() {
    const captchas = await fetch('https://auth.osmoziswifi.com/api/auth-portal/v1/captchas', {
      headers: {
        'X-Session-Token': this.token,
      },
      method: 'POST',
    })
      .then(resp => resp.json());
    console.log('Captcha:', captchas);

    return captchas.color;
  }

  async getCaptcha() {
    return await fetch(`https://auth.osmoziswifi.com/api/auth-portal/v1/captchas/current?v=${Date.now()}&session-token=${this.token}`)
      .then(x => x.arrayBuffer());
  }

  async authenticate(code) {
    const status = await fetch('https://auth.osmoziswifi.com/api/auth-portal/v1/authentications', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Session-Token': this.token,
      },
      body: JSON.stringify({
        'trial_auth': {
          'email': faker.internet.email(),
          'captchaCode': code
        }
      }),
    }).then(a => a.json());

    // console.log('Status:', status);

    return status.statusCode;
  }
}

module.exports = Osmozis;

return

async function main() {
  const osmozis = await new Osmozis();
  await osmozis.init();
  console.log(await osmozis.getAuthUrl());
  console.log(await osmozis.getToken());
  console.log(await osmozis.getTargetColor());
  console.log(await osmozis.getCaptcha());
  console.log(await osmozis.authenticate("ABCDE"));
}
main();