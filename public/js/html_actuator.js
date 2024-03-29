function HTMLActuator() {
    this.tileContainer = document.querySelector(".tile-container");
    this.messageContainer = document.querySelector(".game-message");
    console.log(this.messageContainer);
    this.scoreContainer = document.querySelector(".score-container");
    this.bestContainer = document.querySelector(".best-container");
    this.modeContainer = document.querySelector(".current-mode");
    this.anarchyVoteContainer = document.querySelector(".anarchy-votes");
    this.democracyVoteContainer = document.querySelector(".democracy-votes");
    this.dvcContainer = document.querySelector(".democracy-vote-counter");
    this.upVoteContainer = document.querySelector(".up-votes-n");
    this.rightVoteContainer = document.querySelector(".right-votes-n");
    this.downVoteContainer = document.querySelector(".down-votes-n");
    this.leftVoteContainer = document.querySelector(".left-votes-n");
    this.gamesLostContainer = document.querySelector(".games-lost-n");
    this.gamesWonContainer = document.querySelector(".games-won-n");
    this.logContainer = document.querySelector(".log");

    this.logIndex = 0;
}

HTMLActuator.prototype.actuate = function (grid, metadata) {
    var self = this;

    window.requestAnimationFrame(function () {
        self.clearContainer(self.tileContainer);

        grid.cells.forEach(function (column) {
            column.forEach(function (cell) {
                if (cell) {
                    self.addTile(cell);
                }
            });
        });

        self.updateScore(metadata.score);
        self.updateBestScore(metadata.bestScore);

        if (metadata.terminated) {
            if (metadata.over) {
                self.message(false); // You lose
                window.setTimeout(self.clearMessage, 2000);
            } else if (metadata.won) {
                self.message(true); // You win!
                window.setTimeout(self.clearMessage, 2000);
            }

        }



    });
};

// Continues the game (both restart and keep playing)
HTMLActuator.prototype.continueGame = function () {
    console.log("ola");
    this.clearMessage();
};

HTMLActuator.prototype.clearContainer = function (container) {
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
};

HTMLActuator.prototype.addTile = function (tile) {
    var self = this;

    var wrapper = document.createElement("div");
    var inner = document.createElement("div");
    var position = tile.previousPosition || { x: tile.x, y: tile.y };
    var positionClass = this.positionClass(position);

    // We can't use classlist because it somehow glitches when replacing classes
    var classes = ["tile", "tile-" + tile.value, positionClass];

    if (tile.value > 2048) classes.push("tile-super");

    this.applyClasses(wrapper, classes);

    inner.classList.add("tile-inner");
    inner.textContent = tile.value;

    if (tile.previousPosition) {
        // Make sure that the tile gets rendered in the previous position first
        window.requestAnimationFrame(function () {
            classes[2] = self.positionClass({ x: tile.x, y: tile.y });
            self.applyClasses(wrapper, classes); // Update the position
        });
    } else if (tile.mergedFrom) {
        classes.push("tile-merged");
        this.applyClasses(wrapper, classes);

        // Render the tiles that merged
        tile.mergedFrom.forEach(function (merged) {
            self.addTile(merged);
        });
    } else {
        classes.push("tile-new");
        this.applyClasses(wrapper, classes);
    }

    // Add the inner part of the tile to the wrapper
    wrapper.appendChild(inner);

    // Put the tile on the board
    this.tileContainer.appendChild(wrapper);
};

HTMLActuator.prototype.applyClasses = function (element, classes) {
    element.setAttribute("class", classes.join(" "));
};

HTMLActuator.prototype.normalizePosition = function (position) {
    return { x: position.x + 1, y: position.y + 1 };
};

HTMLActuator.prototype.positionClass = function (position) {
    position = this.normalizePosition(position);
    return "tile-position-" + position.x + "-" + position.y;
};

HTMLActuator.prototype.updateScore = function (score) {
    this.clearContainer(this.scoreContainer);

    var difference = score - this.score;
    this.score = score;

    this.scoreContainer.textContent = this.score;

    if (difference > 0) {
        var addition = document.createElement("div");
        addition.classList.add("score-addition");
        addition.textContent = "+" + difference;

        this.scoreContainer.appendChild(addition);
    }
};

HTMLActuator.prototype.updateBestScore = function (bestScore) {
    this.bestContainer.textContent = bestScore;
};

HTMLActuator.prototype.updateCurrentMode = function (mode) {
    if(mode == "Anarchy") {
        this.modeContainer.style.backgroundColor = anarchy_color;
        this.dvcContainer.style.opacity = 0;
    } else {
        this.modeContainer.style.backgroundColor = democracy_color;
        this.dvcContainer.style.opacity = 1;
    }

    this.modeContainer.textContent = mode;
};

HTMLActuator.prototype.updateDemocracyVotes = function (votes) {
    this.democracyVoteContainer.textContent = votes;
};

HTMLActuator.prototype.updateAnarchyVotes = function (votes) {
    this.anarchyVoteContainer.textContent = votes;
};

HTMLActuator.prototype.updateDemocracyMoves = function (up, right, down, left) {
    this.upVoteContainer.textContent = up;
    this.rightVoteContainer.textContent = right;
    this.downVoteContainer.textContent = down;
    this.leftVoteContainer.textContent = left;
};

HTMLActuator.prototype.updateGamesLost = function (n) {
    this.gamesLostContainer.textContent = " " + n;
};

HTMLActuator.prototype.updateGamesWon = function (n) {
    this.gamesWonContainer.textContent = " " + n;
};

HTMLActuator.prototype.addLog = function (name, direction) {
    this.logIndex++;
    //this.gamesWonContainer.textContent = " " + n;
};

HTMLActuator.prototype.message = function (won) {
    var type = won ? "game-won" : "game-over";
    var message = won ? "You win!" : "Game over!";

    this.messageContainer.classList.add(type);
    this.messageContainer.getElementsByTagName("p")[0].textContent = message;
};

HTMLActuator.prototype.clearMessage = function () {
    this.messageContainer = document.querySelector(".game-message");
    // IE only takes one value to remove at a time.
    this.messageContainer.classList.remove("game-won");
    this.messageContainer.classList.remove("game-over");
};
