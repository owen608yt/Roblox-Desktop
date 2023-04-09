export function gameCardTemplate(title, image, creator) {
    var trueTitle = "";
    var updateInfo = "";

    // reminder that names like "ex[a]mple" will be filtering the "[a]" as an update title
    // haven't seen many of these so just don't make cringey names
    // it's not hard to fix but idc about them lol
    if (
        (title.startsWith("(") && title.endsWith(")")) ||
        (title.startsWith("[") && title.endsWith("]")) ||
        (title.startsWith("{") && title.endsWith("}"))
    ) {
        trueTitle = title;
        updateInfo = "";
    } else {
        // "sick programming language lexer"
        for (var i = 0; i < title.length; i++) {
            const char = title.charAt(i);
            if (char == "[") {
                const start = i;
                while (i < title.length && title.charAt(i) != "]") i++;

                if (updateInfo != "") updateInfo += ", ";
                updateInfo += title.substring(start + 1, i);

                continue;
            } else if (char == "(") {
                const start = i;
                while (i < title.length && title.charAt(i) != ")") i++;

                if (updateInfo != "") updateInfo += ", ";
                updateInfo += title.substring(start + 1, i);

                continue;
            } else if (char == "{") {
                const start = i;
                while (i < title.length && title.charAt(i) != "}") i++;

                if (updateInfo != "") updateInfo += ", ";
                updateInfo += title.substring(start + 1, i);

                continue;
            }

            trueTitle += char;
        }
    }

    if (updateInfo.length > 25) {
        // trim it so we don't get "some update ..." or "  another update"
        updateInfo = updateInfo.substring(0, 22).trim() + "...";
    }

    const str = `<div class="game-card-container"><button class="game-card-button"><span class="game-card-thumbnail">
    <img src="${image}" /></span><p class="game-card-name">${trueTitle}</p><p class="game-card-creator">By ${creator}
    </p><p class="game-card-version-info">${updateInfo}</p></button></div>`;

    return str;
}
