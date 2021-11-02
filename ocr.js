const fs = require('fs');
const { PNG } = require('pngjs');
const color = require('color');
const toRGB = (hex) => hex === 'green' ? [0, 255, 0] : color(hex).array();

//const { createWorker } = require('tesseract.js');
const { run } = require('./run');

class OCR {
  constructor() {
    // this.worker = createWorker({
    //   //  logger: m => console.log(m)
    // });
  }

  async init() {
    // await this.worker.load();
    // await this.worker.loadLanguage('lat');
    // await this.worker.initialize('lat');
    // await this.worker.setParameters({
    //   tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    // });
  }

  terminate() {
    // return this.worker.terminate();
  }

  async getCode(targetColor, from = 'current.png', tmp = 'current_proc.png') {
    const [r, g, b] = toRGB(targetColor);

    await new Promise((resolve, reject) => {
      fs.createReadStream(from)
        .pipe(new PNG({
          filterType: 4
        }))
        .on('parsed', function () {

          for (var y = 0; y < this.height; y++) {
            for (var x = 0; x < this.width; x++) {
              var idx = (this.width * y + x) << 2;

              // reduce opacity for other colors
              if (!(this.data[idx] == r && this.data[idx + 1] == g && this.data[idx + 2] == b)) {
                this.data[idx + 3] = 0;
              }
            }
          }

          const file = fs.createWriteStream(tmp);
          this.pack().pipe(file);
          file.on("finish", () => { resolve(true); });
          file.on("error", reject);
        });
    });

    const text = await run(`tesseract ${tmp} - --dpi 72 --psm 7 -l script/Latin -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ`); // --dpi 72 --psm 7 -l script/Latin 
    console.log("cli", text);

    // const { data: { text } } = await this.worker.recognize(tmp, 'lat');
    // console.log("js", text);

    return text.replace(/[^a-zA-Z]+/g, '').toUpperCase();
  }
}

module.exports = OCR;

async function main() {
  const ocr = await new OCR();
  await ocr.init();
  console.log(await ocr.getCode('yellow', 'current.png', 'current-yellow.png'));
  console.log(await ocr.getCode('red', 'current.png', 'current-red.png'));
  console.log(await ocr.getCode('green', 'current.png', 'current-green.png'));
  await ocr.terminate();
}
main();