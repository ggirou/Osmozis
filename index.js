const os = require('os');
const delay = require('delay');
const { run } = require('./run');
const OCR = require('./ocr');
const fetch = require('node-fetch');
const { writeFile } = require('fs');
const { promisify } = require('util');
const writeFilePromise = promisify(writeFile);
const PrettyError = require('pretty-error');
const pe = new PrettyError();
const faker = require('faker');
const ocr = new OCR();
const SSID = process.argv[2];
const interface = process.argv[3] || (os.platform() === 'darwin' ? 'en0' : 'wlan0');

const spoofCommands = os.platform() === 'darwin' ? () => [
    `ifconfig ${interface} ether ${randomMacAddress()}`,
    `networksetup -setairportnetwork ${interface} "${SSID}"`
] : () => [
    `iwconfig ${interface} essid off`,
    `ifconfig ${interface} down`,
    `ifconfig ${interface} hw ether ${randomMacAddress()}`,
    `ifconfig ${interface} up`,
    `iwconfig ${interface} essid "${SSID}"`,
];

// Mac address first byte must be even
const randomMacAddress = () => [~1, ~0, ~0, ~0, ~0, ~0].map(i => (Math.floor(Math.random() * 255) & i).toString(16).padStart(2, '0')).join(":");

let renewalRunning = false;
if (process.getuid() !== 0) {
    console.log('must be ran as root (required for spoof)');
    return;
}

const getAuthUrl = () => fetch('http://www.wifi69.com', { redirect: 'manual' })
    .then(resp => resp.headers.get('location'))

//const isNetwork = async () => !(await getAuthUrl().catch(e => "FAILED"));
const isConnected = async () => !(await getAuthUrl().catch(e => "FAILED"));

const spoof = async () => {
    await run(spoofCommands().join(" && "));
}

async function waitForNetwork() {
    let redirectUrl = null;
    while (!redirectUrl) {
        try {
            redirectUrl = await getAuthUrl();
        } catch (ex) {
            console.log('Network appears to be down, retrying in a second');
        }

        // MACOS only
        if (os.platform() === 'darwin') {
            await run('pkill "Captive Network Assistant.app"').catch(e => "ignore");
        }

        await delay(1000);
    }

    console.log('Network appears to be up again, going to attempt a renewal...');
    return redirectUrl;
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

            // Store some data for futur dev
            await run(`mkdir -p .tmp`);
            await run(`cp current.png .tmp/captcha-${Date.now()}.png`);
            
            const code = await ocr.getCode(targetColor, "current.png");
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
                console.log('Spoof required, spoofing... ☁')
                await spoof();

                // wait for network to come back up online
                await waitForNetwork();
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

const go = async () => {
    if (!renewalRunning) {
        giveMeWifi()
            .catch(x => console.error(pe.render(x)));
    }
}

async function main() {
    console.log("Starting...");

    await ocr.init();

    console.log('Initial Spoof, spoofing... ☁')
    await spoof();

    setInterval(() => go(), 1000);
    go();
}

main();
