const os = require('os');
const delay = require('delay');
const { run } = require('./run');
const Osmozis = require('./osmozis');
const OCR = require('./ocr');
const fetch = require('node-fetch');
const { writeFile } = require('fs');
const { promisify } = require('util');
const writeFilePromise = promisify(writeFile);
const PrettyError = require('pretty-error');
const pe = new PrettyError();
const ocr = new OCR();
const osmozis = new Osmozis();
const SSID = process.argv[2];
const interface = process.argv[3] || (os.platform() === 'darwin' ? 'en0' : 'wlan0');

const spoofCommands = os.platform() === 'darwin' ? () => [
    `ifconfig ${interface} ether ${randomMacAddress()}`,
    `ifconfig ${interface} down`,
    `ifconfig ${interface} up`,
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

const spoof = async () => {
    await run(spoofCommands().join(" && "));

    // wait for network to come back up online
    await waitForNetwork();
}

async function waitForNetwork() {
    let resp = 0;
    let wait = 1000;
    while (!resp) {
        try {
            await fetch('http://www.wifi69.com', { redirect: 'manual' });
            resp = await fetch('http://detectportal.firefox.com/canonical.html', { redirect: 'manual' });
            //console.log(resp);
            //status = resp.status;
            return resp.status == 200;
        } catch (ex) {
            console.log('Network appears to be down, retrying in a second');
        }

        // MACOS only
        if (os.platform() === 'darwin') {
            await run('pkill "Captive Network Assistant.app"').catch(e => "ignore");
        }

        await delay(wait);
        wait = wait * 2;
    }

    console.log('Network appears to be up again, going to attempt a renewal...');
    return resp.status == 200;
}

const giveMeWifi = async () => {
    renewalRunning = true;

    // get sess token
    let redirectUrl = await osmozis.getAuthUrl().catch(e => "FAILED");

    if (!redirectUrl) {
        renewalRunning = false;
        return;
    }

    console.log('Block detected. Attempting renewal.')
    console.log('Spoofing...')
    await spoof();

    let authenticated = false;

    while (!authenticated) {
        try {
            await osmozis.init();

            // grab current color
            const targetColor = await osmozis.getTargetColor();
            console.log('Captcha color:', targetColor);

            // download captcha
            await osmozis.getCaptcha()
                .then(x => writeFilePromise('current.png', Buffer.from(x)));
            console.log('Downloaded captcha');

            // Store some data for futur dev
            await run(`mkdir -p .tmp`);
            await run(`cp current.png .tmp/captcha-${Date.now()}.png`);

            const code = await ocr.getCode(targetColor, "current.png");
            console.log('code: ' + code);

            // send challenge
            const statusCode = await osmozis.authenticate(code);
            console.log('Status code:', statusCode);

            // trial expired. mac spoof needed
            if (statusCode === -102) {
                console.log('Spoof required, spoofing...')
                await spoof();
            }

            authenticated = statusCode === 0;

            if (!authenticated) {
                console.log('Failure, retrying. 😭🔄')
            }
        } catch (ex) {
            console.log(`Failure: (${ex.message}), retrying.`); //  ex.stack .split("\n")[1]
        }
    }

    console.log("We're in 😎", new Date());
    renewalRunning = false;
};

const go = async () => {
    if (!renewalRunning) {
        await giveMeWifi()
            .catch(x => console.error(pe.render(x)));
    }
}

async function main() {
    console.log("Starting...");

    await ocr.init();

    //console.log('Initial Spoof, spoofing...')
    //await spoof();

    setInterval(async () => await go(), 1000);
    await go();
}

main();
