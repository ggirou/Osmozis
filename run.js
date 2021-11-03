/* eslint-disable no-console */
// executes a process and returns a promise while redirecting its stdout + stdin to our own

const cp = require('child_process');
const chalk = require('chalk');

exports.run = (command, options = {}) => {
    console.log(chalk`$ {dim ${command}}`);
    return new Promise((resolve, reject) => {
        let out = '';
        const child = cp.spawn("bash", ["-c", command], {
            // stdio: 'inherit',
            // shell: true,
            ...options
        });

        child.stdout.on('data', data => {
            out += data.toString();
        })

        child.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Process ${command} exited with code ${code}: ${out}`));
            } else {
                resolve(out);
            }
        });
    });
};