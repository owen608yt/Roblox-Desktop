import { httpPost, httpGet, getXCSRF } from "./http.js";
const fun = require("funcaptcha");

// document objects
const loginBtn = document.getElementById("login-button");

const twostepAuthenticatorCodes = [...document.querySelectorAll("input.code-input-ts-authenticator")];

// main stuff
var twostepGetting = false;
var twostepMedia = "Authenticator";
var twostepTicket = "";

twostepAuthenticatorCodes.forEach((element, index) => {
    element.addEventListener("keydown", (e) => {
        if (e.keyCode === 8 && e.target.value === "") twostepAuthenticatorCodes[Math.max(0, index - 1)].focus();
    });

    element.addEventListener("input", (e) => {
        const [first, ...rest] = e.target.value;
        e.target.value = first ?? "";

        const lastBox = index === twostepAuthenticatorCodes.length - 1;
        const didInsertContent = first !== undefined;
        if (didInsertContent && !lastBox) {
            twostepAuthenticatorCodes[index + 1].focus();
            twostepAuthenticatorCodes[index + 1].value = rest.join("");
            twostepAuthenticatorCodes[index + 1].dispatchEvent(new Event("input"));
        }
    });
});

function getTwostepAuthCode() {
    const code = twostepAuthenticatorCodes.map(({ value }) => value).join("");
    return code;
}

async function captchaComplete() {
    return new Promise((resolve, _reject) => {
        var x;
        x = (e) => {
            if (e.data == "complete") {
                window.removeEventListener("message", x);
                resolve();
            }
        };

        window.addEventListener("message", x);
    });
}

async function authUser(xcsrf, userid, action) {
    return new Promise(async (resolve, _reject) => {
        document.getElementById("ts-authenticator-submit").addEventListener(
            "click",
            async () => {
                const res = await httpPost(
                    `https://twostepverification.roblox.com/v1/users/${userid}/challenges/authenticator/verify`,
                    xcsrf,
                    { challengeId: twostepTicket, code: parseInt(getTwostepAuthCode()), actionType: action }
                );

                resolve([res.statusCode == 200, await res.json()]);
            },
            { once: true }
        );
    });
}

export function authenticate(store) {
    return new Promise((resolve, _rej) => {
        loginBtn.onclick = async (_) => {
            const username = document.getElementById("login-username").value;
            const password = document.getElementById("login-password").value;

            if (username.trim() == "") return;
            if (password.trim() == "") return;

            const xcsrf = await getXCSRF();

            const res = await httpPost("https://auth.roblox.com/v1/login/", xcsrf, {
                ctype: "Username",
                captchaToken: "",
                cvalue: username.trim(),
                password: password.trim(),
            });

            const data = await res.json();
            const headers = res.headers;

            // TODO: make sure they have to pass robot test and it isnt some willy nilly error

            const fdata = JSON.parse(data.errors[0].fieldData);

            const token = await fun.getToken({
                pkey: "476068BF-9607-4799-B53D-966BE98E2B81",
                surl: "https://roblox-api.arkoselabs.com",
                data: {
                    blob: fdata.dxBlob,
                },
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36",
                },
            });

            const session = new fun.Session(token, {
                userAgent:
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36", // OPTIONAL: Custom user agent for all future requests
            });

            const url = session.getEmbedUrl();

            const iframe = document.getElementById("captcha-iframe");
            const captchaContainer = document.getElementById("captcha");
            captchaContainer.classList.remove("hidden");
            iframe.src = url;

            await captchaComplete();
            captchaContainer.classList.add("hidden");
            iframe.src = "";

            const challengeId = (await session.getChallenge()).gameType;

            const tok = token.token;
            const loginRes = await httpPost("https://auth.roblox.com/v1/login/", xcsrf, {
                ctype: "Username",
                captchaToken: tok,
                captchaProvider: "PROVIDER_ARKOS_LABS",
                cvalue: username.trim(),
                password: password.trim(),
                captchaId: fdata.unifiedCaptchaId,
                challengeId: challengeId.toString(),
            });

            const loginData = await loginRes.json();
            if (loginData.isBanned) {
                // TODO: show "User is banned" error
                return;
            }

            if (loginData.twoStepVerificationData) {
                document.getElementById("twostep-authenticator").classList.remove("hidden");

                twostepGetting = true;
                twostepMedia = loginData.twoStepVerificationData.mediaType;
                twostepTicket = loginData.twoStepVerificationData.ticket;

                const [success, verifTok] = await authUser(xcsrf, loginData.user.id, 1);

                console.log(twostepTicket);
                console.log(verifTok.verificationToken);

                const identityRes = await httpPost(
                    `https://auth.roblox.com/v3/users/${loginData.user.id}/two-step-verification/login`,
                    xcsrf,
                    {
                        challengeId: twostepTicket,
                        verificationToken: verifTok.verificationToken,
                        rememberDevice: true,
                    }
                );

                if (identityRes.headers["set-cookie"]) {
                    identityRes.headers["set-cookie"].forEach((val, _idx) => {
                        if (val.startsWith(".ROBLOSECURITY=")) {
                            store.set(".ROBLOSECURITY", val.substr(15).split(";")[0]);
                            resolve();
                        }
                    });
                }

                resolve();
            }
        };
    });
}

export async function checkRSKey(roblosecurity) {
    const res = await httpGet("https://users.roblox.com/v1/users/authenticated", `.ROBLOSECURITY=${roblosecurity}`);
    if (res.status == 200) return true;
    return false;
}

export async function getUserInfo(roblosecurity) {
    const res = await httpGet("https://users.roblox.com/v1/users/authenticated", `.ROBLOSECURITY=${roblosecurity}`);
    if (res.status == 200) {
        return [res.data.name, res.data.displayName, res.data.id];
    }

    return [null, null, null];
}
