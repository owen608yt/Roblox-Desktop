require("v8-compile-cache");

const findProc = require("find-process");

import { authenticate, checkRSKey, getUserInfo } from "./authenticator.js";
import { getStore } from "./persist.js";
import { error, print, exec } from "./logger.js";
import { getXCSRFSecure, getRobloxHomeCarrousel, httpGet } from "./http.js";
import { gameCardTemplate } from "./templates.js";
import { initiateTransition } from "./transition.js";
import invokeGameManager from "./gameManager.js";
import gameManager from "./gameManager.js";

const { Worker } = require("worker_threads");
const path = require("path");

var userData = await getStore("RobloxDesktopUserData-1", { ".ROBLOSECURITY": "" });

var username, displayName, userId;

var roblosecurity, xcsrf;

var loadedPlaceId = 0;
var loadedUniverseId = 0;

var gameLastOpened = 0;

const badgeCache = [];

async function loadGameInfo(universeid, placeid) {
    const achievements = document.getElementById("achievements-stat");
    const playtime = document.getElementById("play-time");
    const lastPlayed = document.getElementById("last-played");

    achievements.innerText = "??/?? Obtained";
    playtime.innerText = "0 seconds";
    lastPlayed.innerText = "Never";

    var badgesOnGame = 0;
    var awardedBadges = 0;
    if (badgeCache[placeid]) {
        badgesOnGame = badgeCache[placeid].badges;
        awardedBadges = badgeCache[placeid].awarded;
    } else {
        var res = await httpGet(
            `https://badges.roblox.com/v1/universes/${universeid}/badges?limit=100&sortOrder=Asc`,
            `.ROBLOSECURITY=${roblosecurity}`
        );

        var url = `https://badges.roblox.com/v1/users/${userId}/badges/awarded-dates?badgeIds=`;
        for (const badge of res.data.data) {
            url += badge.id + ",";
        }

        var res2 = await httpGet(url, `.ROBLOSECURITY=${roblosecurity}`);

        badgesOnGame += res.data.data.length;
        awardedBadges += res2.data.data.length;

        var nextPageCursor = res.data.nextPageCursor;
        while (nextPageCursor != null) {
            res = await httpGet(
                `https://badges.roblox.com/v1/universes/${universeid}/badges?limit=100&cursor=${nextPageCursor}&sortOrder=Asc`,
                `.ROBLOSECURITY=${roblosecurity}`
            );

            var url = `https://badges.roblox.com/v1/users/${userId}/badges/awarded-dates?badgeIds=`;
            for (const badge of res.data.data) {
                url += badge.id + ",";
            }

            var res2 = await httpGet(url, `.ROBLOSECURITY=${roblosecurity}`);

            badgesOnGame += res.data.data.length;
            awardedBadges += res2.data.data.length;

            nextPageCursor = res.data.nextPageCursor;

            achievements.innerText = awardedBadges + "/" + badgesOnGame + " obtained";
        }

        badgeCache[placeid] = {
            badges: badgesOnGame,
            awarded: awardedBadges,
        };
    }

    achievements.innerText = awardedBadges + "/" + badgesOnGame + " obtained";
}

async function generateCardsForCarrousel(carrousel, contentIds) {
    var url = "https://games.roblox.com/v1/games?universeIds=";
    var url2 = "https://thumbnails.roblox.com/v1/games/icons?universeIds=";
    for (var i = 0; i < 100 && i < contentIds.length; i++) {
        url += contentIds[i].contentId + ",";
        url2 += contentIds[i].contentId + ",";
    }

    url2 += "&returnPolicy=PlaceHolder&size=150x150&format=Png&isCircular=false";

    const cardInfo = await httpGet(url, `.ROBLOSECURITY=${roblosecurity}`);
    const cardImgRes = await httpGet(url2, `.ROBLOSECURITY=${roblosecurity}`);

    carrousel.innerHTML = "";
    if (cardInfo.status > 199 && cardInfo.status < 300) {
        for (const cardData of cardInfo.data.data) {
            const title = cardData.name;
            const creator = cardData.creator.name;
            const id = cardData.rootPlaceId;
            const universeId = cardData.id;

            // im sorry i just wanted this constant
            const image = (() => {
                if (cardImgRes.status == 200)
                    for (const img of cardImgRes.data.data) if (img.targetId == universeId) return img.imageUrl;
                return "";
            })();

            const card = gameCardTemplate(title, image, creator);
            const element = new DOMParser().parseFromString(card, "text/html").body.firstChild;
            carrousel.appendChild(element);

            const btn = element.getElementsByClassName("game-card-button")[0];
            btn.addEventListener("click", () => {
                initiateTransition(async () => {
                    const thumb = document.getElementById("home-gameimage");
                    thumb.classList.remove("hidden");
                    document.getElementById("default-home").classList.add("hidden");
                    document.getElementById("home-gameview").classList.remove("hidden");

                    // TODO: add support for verified games
                    document.getElementById("home-img-logo").classList.add("hidden");

                    const etitle = document.getElementById("home-logo-title");
                    etitle.classList.remove("hidden");
                    etitle.innerText = title;

                    loadGameInfo(universeId, id);

                    loadedPlaceId = id;
                    loadedUniverseId = universeId;

                    const res = await httpGet(
                        `https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=${universeId}&countPerUniverse=1&defaults=true&size=768x432&format=Png&isCircular=false`,
                        `.ROBLOSECURITY=${roblosecurity}`
                    );

                    if (res.status == 200) {
                        const json = res.data;
                        thumb.src = json.data[0].thumbnails[0].imageUrl;
                    }
                });
            });
        }
    }
}

document.getElementById("home-gameview-close-btn").onclick = () => {
    initiateTransition(() => {
        document.getElementById("home-gameimage").classList.add("hidden");
        document.getElementById("default-home").classList.remove("hidden");
        document.getElementById("home-gameview").classList.add("hidden");
    });

    loadedPlaceId = 0;
    loadedUniverseId = 0;
};

// something that actually looks interesting in the code??
// wow its not just get and post requests
document.getElementById("play-btn").onclick = () => {
    if (loadedPlaceId != 0) {
        if (new Date().getTime() - gameLastOpened >= 5000) {
            gameLastOpened = new Date().getTime();
            findProc("name", "RobloxPlayerBeta", false).then((list) => {
                if (!list.length) {
                    const a = document.createElement("a");
                    a.href = `roblox://placeId=${loadedPlaceId}`;
                    a.click();
                    a.remove();
                } else {
                    for (const proc of list) {
                        process.kill(proc.pid, "SIGKILL");
                    }
                }
            });
        }
    }
};

async function main() {
    if (userData.get(".ROBLOSECURITY") == "" || !checkRSKey(userData.get(".ROBLOSECURITY"))) {
        document.getElementById("login").classList.remove("hidden");
        document.getElementById("main").classList.add("hidden");
        await authenticate(userData);
    }

    roblosecurity = userData.get(".ROBLOSECURITY");
    const valid = await checkRSKey(roblosecurity);
    if (!valid) {
        // reinit login
        print(".ROBLOSECURITY is invalid! Reinitializing login.");
        await main();
        return;
    }

    xcsrf = await getXCSRFSecure(roblosecurity);
    print("Successfully logged in and verified .ROBLOSECURITY.");

    [username, displayName, userId] = await getUserInfo(roblosecurity);

    document.getElementById("login").classList.add("hidden");
    document.getElementById("main").classList.remove("hidden");

    document.getElementById("welcome-username").innerText = displayName;

    const recents = await getRobloxHomeCarrousel("Continue", xcsrf, roblosecurity);
    generateCardsForCarrousel(document.getElementById("recently-played"), recents.recommendationList);

    gameManager();
}

main();
