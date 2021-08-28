const delay = require('delay');
const { run } = require('./run');
const fetch = require('node-fetch');
const queryString = require('querystring');
const { writeFile } = require('fs');
const { promisify } = require('util');
const writeFilePromise = promisify(writeFile);
const replaceColor = require('replace-color');
const color = require('color');
const PrettyError = require('pretty-error');
const every = require('every');
const pe = new PrettyError();
const faker = require('faker');
const SSID = process.argv[2];

let renewalRunning = false;
if (process.getuid() !== 0) {
    console.log('must be ran as root (required for spoof)');
    return;
}

async function getAuthUrl() {
    //await run('pkill "Captive Network Assistant.app"').catch(e => "ignore");
    return await fetch('http://www.wifi69.com', { redirect: 'manual' })
        .then(resp => resp.headers.get('location'));
}

//const isNetwork = async () => !(await getAuthUrl().catch(e => "FAILED"));
const isConnected = async () => !(await getAuthUrl().catch(e => "FAILED"));

const toRGB = (hex) => hex === 'green' ? [0, 255, 0] : color(hex).array();

const spoof = async () => {
    console.log('Spoof required, spoofing... ☁')

    // spoof mac
    await run('./node_modules/.bin/spoof randomize en0');

    // reconnect wifi (macOS ONLY)
    await run(`networksetup -setairportnetwork en0 "${SSID}"`);

    // wait for network to come back up online
    let redirectUrl = null
    while (!redirectUrl) {
        try {
            redirectUrl = await getAuthUrl();
        } catch (ex) {
            console.log('Network appears to be down, retrying in a second');
        }
        await delay(1000);
    }

    console.log('Network appears to be up again, going to attempt a renewal...');
}

const giveMeWifi = async () => {
    renewalRunning = true;

    // get sess token
    let redirectUrl = await getAuthUrl().catch(e => "FAILED");

    if (!redirectUrl) {
        renewalRunning = false;
        return;
    }

    console.log('Block detected. Attempting renewal.')

    let authenticated = false;

    while (!authenticated) {
        try {
            redirectUrl = await getAuthUrl()
            const token = new URL(redirectUrl).searchParams.get('key');
            console.log('Token:', token);

            // grab current color
            const captchas = await fetch('https://auth.osmoziswifi.com/api/auth-portal/v1/captchas', {
                headers: {
                    'X-Session-Token': token,
                },
                method: 'POST',
            })
                .then(resp => resp.json());
            console.log('Captcha:', captchas);

            const targetColor = captchas.color;
            console.log('Captcha color:', targetColor);

            // download captcha
            await fetch(`https://auth.osmoziswifi.com/api/auth-portal/v1/captchas/current?v=${Date.now()}&session-token=${token}`)
                .then(x => x.arrayBuffer())
                .then(x => writeFilePromise('current.png', Buffer.from(x)));
            console.log('Downloaded captcha');

            // color target characters white
            await replaceColor({
                image: 'current.png',
                colors: {
                    type: 'rgb',
                    targetColor: toRGB(targetColor),
                    replaceColor: [255, 255, 255],
                },
            })
                .then(image => image.write('current_proc.png'));

            // now that our target color is white, replace every other color
            for (const current of ['yellow', 'red', 'green']) {
                await replaceColor({
                    image: 'current_proc.png',
                    colors: {
                        type: 'rgb',
                        targetColor: toRGB(current),
                        replaceColor: [0, 0, 0],
                    },
                })
                    .then(image => image.write('current_proc.png'));
            }

            // guess it!
            const out = await run('tesseract current_proc.png - --dpi 72 -l script/Latin --psm 7');
            const code = out.replace(/[\s\n]/g, '').toUpperCase();
            console.log('code: ' + code);

            // send challenge
            const { statusCode } = await fetch('https://auth.osmoziswifi.com/api/auth-portal/v1/authentications', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-Session-Token': token,
                },
                body: JSON.stringify({
                    'trial_auth': {
                        'email': faker.internet.email(),
                        'captchaCode': code
                    }
                }),
            }).then(a => a.json());

            // trial expired. mac spoof needed
            if (statusCode === -102) {
                await spoof();
            }

            authenticated = statusCode === 0;

            if (!authenticated) {
                console.log('Failure, retrying. 😭🔄')
            }
        } catch (ex) {
            console.log(`Failure (${ex.message}), retrying.`);
        }
    }

    console.log("We're in 😎");
    renewalRunning = false;
};

const go = () => {
    if (!renewalRunning) {
        giveMeWifi()
            .catch(x => console.error(pe.render(x)));
    }
}

setInterval(() => go(), 1000);
go();