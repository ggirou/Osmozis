## Osmozis bypass

![](https://jari.lol/nkeGPL2cKA.png)

Simple script that bypasses osmozis wifi blocking by requesting a free 10 minute trial... every 10 minutes.
Requires tesseract to be installed.

Currently only runs on MacOS but with some modifications, should be able to run everywhere.
WiFi name has been hardcoded because I'm too lazy to get it from an input arg, change it yourself.

# Installation

    sudo apt-get install -y tesseract-ocr tesseract-ocr-lat
    npm install

# Usage

    sudo node index.js "Wifi SSID"

# Pre-requisites

## NodeJS installation on armv6 Raspberry Pi OS

    sudo -s
    wget https://unofficial-builds.nodejs.org/download/release/v16.8.0/node-v16.8.0-linux-armv6l.tar.gz
    tar xzf node-v16.8.0-linux-armv6l.tar.gz
    mv node-v16.8.0-linux-armv6l /lib/nodejs

    ln -s /lib/nodejs/bin/node /usr/bin/node
    ln -s /lib/nodejs/bin/npm /usr/bin/npm
    ln -s /lib/nodejs/bin/npx /usr/bin/npx

## Tesseract installation on Raspberry Pi OS

    sudo apt-get install -y tesseract-ocr tesseract-ocr-lat
