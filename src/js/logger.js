export function print(text) {
    console.log("%c[RobloxDesktop]: " + text, "font-size: 18px;");
}

export function warn(text) {
    console.warn(text);
}

export function error(text) {
    console.error(text);
}

const cp_exec = require("child_process").exec;

export function exec(cmd) {
    cp_exec(cmd, (err, stdout, stderr) => {
        if (err) {
            error(err);
            return;
        }

        console.log(stdout);
        console.log(stderr);
    });
}
