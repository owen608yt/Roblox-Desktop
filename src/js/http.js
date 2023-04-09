const request = require("electron-request");

export const USERAGENT =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36 Edg/111.0.1661.62";

export const DummmySession = "01234567-89ab-cdef-ghij-klmnopqrstuv";

export async function httpPost(url, xcsrf, body, cookie = null) {
    const headers = {
        "Content-Type": "text/json",
        "x-csrf-token": xcsrf,
        "User-Agent": USERAGENT,
    };

    if (cookie != null) headers["Cookie"] = cookie;

    const res = await request(url, {
        method: "POST",
        body: JSON.stringify(body),
        headers: headers,
    });

    return res;
}

export async function httpGet(url, cookie = null, json = true) {
    const headers = {
        "User-Agent": USERAGENT,
    };

    if (cookie != null) headers["Cookie"] = cookie;

    const res = await request(url, {
        method: "GET",
        headers: headers,
    });

    if (json) return { status: res.statusCode, data: await res.json(), headers: res.headers, self: res };
    else return res;
}

export async function getXCSRF(url = "https://auth.roblox.com/v1/login") {
    const res = await httpPost(url, "", {
        ctype: "Username",
        captchaToken: "",
        cvalue: "",
        password: "",
    });
    return res.headers["x-csrf-token"];
}

export async function getXCSRFSecure(roblosecurity) {
    const res = await httpPost("https://auth.roblox.com/", "", {}, `.ROBLOSECURITY=${roblosecurity}`);
    return res.headers["x-csrf-token"];
}

export async function getRobloxHomeCarrousel(carrouselName, xcsrf, roblosecurity) {
    const res = await httpPost(
        "https://apis.roblox.com/discovery-api/omni-recommendation",
        xcsrf,
        { pageType: "Home", sessionId: DummmySession },
        `.ROBLOSECURITY=${roblosecurity}`
    );

    if (res.statusCode < 300 && res.statusCode > 199) {
        const data = await res.json();
        for (const topic of data.sorts) {
            if (topic.topic == carrouselName) {
                return topic;
            }
        }
    }

    return null;
}
