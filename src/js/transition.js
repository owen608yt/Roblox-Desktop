var id = null;
var animating = false;

const MAX_TIME_MS = 1000;

export function initiateTransition(conversionCallback) {
    if (animating) return false;
    animating = true;

    const first = document.getElementById("transition-primary");
    const second = document.getElementById("transition-black");

    var completionTime = 0;
    var lastUpdate = new Date().getTime();
    var invokedCallback = false;

    function onUpdate() {
        const time = new Date().getTime();
        completionTime += time - lastUpdate;
        lastUpdate = time;

        const halfMaxTime = MAX_TIME_MS / 2;
        if (completionTime >= halfMaxTime && !invokedCallback) {
            conversionCallback();
            invokedCallback = true;
        }

        first.style.left = 100 - 100 * (completionTime / halfMaxTime) + "%";
        if (completionTime > halfMaxTime)
            second.style.left = 100 - 200 * ((completionTime - halfMaxTime) / halfMaxTime) + "%";

        if (completionTime >= MAX_TIME_MS) {
            animating = false;
            clearInterval(id);
        }
    }

    clearInterval(id);
    id = setInterval(onUpdate, 10);

    return true;
}
