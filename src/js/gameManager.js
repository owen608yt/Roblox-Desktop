const findProc = require("find-process");

const playbtn = document.getElementById("play-btn");
const playbtnImage = document.getElementById("play-btn-img");

export default function () {
    setInterval(async () => {
        findProc("name", "RobloxPlayerBeta", false).then((list) => {
            if (!list.length) {
                playbtn.getElementsByTagName("p")[0].innerText = "PLAY";
                playbtnImage.src = "../resources/play-button.png";
                playbtn.classList.remove("close-play-btn");
            } else {
                playbtn.getElementsByTagName("p")[0].innerText = "CLOSE";
                playbtnImage.src = "../resources/close-button.png";
                playbtn.classList.add("close-play-btn");
            }
        });
    }, 10e3);
}
