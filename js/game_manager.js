function GameManager(size, InputManager, Actuator) {
    this.size = size; // Size of the grid
    this.inputManager = new InputManager;
    this.actuator = new Actuator;
    this.socket = io.connect(server_ip + server_port);
    this.startTiles = 2;
    this.hasState = false;
    //this.current_users = 1;
    var self = this;

    this.socket.on("gameState", function (gameState, force) {
        if (!self.hasState || force)
            self.setup(gameState);
        else {
            if (!self.moved) {
                if (JSON.stringify(gameState.grid) != JSON.stringify(self.grid.serialize())) {
                    self.grid = new Grid(gameState.grid.size, gameState.grid.cells);
                    self.actuate();
                }
            }
        }
    });
    this.socket.on("move", function (direction, rTile, name) {
        self.actuator.addLog(name, direction);
        self.move(direction, rTile);
    });
    this.socket.on("gameMode", function (mode) {
        self.actuator.updateCurrentMode(mode);
    });
    this.socket.on("democracyVote", function (democracyVotes) {
        self.actuator.updateDemocracyVotes(democracyVotes);
    });
    this.socket.on("anarchyVote", function (anarchyVotes) {
        self.actuator.updateAnarchyVotes(anarchyVotes);
    });
    this.socket.on("democracyMoveVote", function (up, right, down, left) {
        console.log(up);
        console.log(right);
        console.log(down);
        console.log(left);
        self.actuator.updateDemocracyMoves(up, right, down, left);
    });


    this.socket.emit("getGameState");
    this.inputManager.on("requestMove", this.requestMove.bind(this));
    this.inputManager.on("anarchyVote", this.anarchyVote.bind(this));
    this.inputManager.on("democracyVote", this.democracyVote.bind(this));
}

GameManager.prototype.syncChecker = function () {
    if (this.socket == undefined)
        this.socket = io.connect(server_ip + server_port);
    this.socket.emit("getGameState");
    this.moved = false;
};

// Vote for democracy mode
GameManager.prototype.democracyVote = function () {
    this.socket.emit("democracyVote");
};

// Vote for anarchy mode
GameManager.prototype.anarchyVote = function () {
    this.socket.emit("anarchyVote");
};

// Restart the game
GameManager.prototype.restart = function () {
    this.storageManager.clearGameState();
    this.actuator.continueGame(); // Clear the game won/lost message
    this.setup();
};

// Keep playing after winning (allows going over 2048)
GameManager.prototype.keepPlaying = function () {
    this.keepPlaying = true;
    this.actuator.continueGame(); // Clear the game won/lost message
};

// Return true if the game is lost, or has won and the user hasn"t kept playing
GameManager.prototype.isGameTerminated = function () {
    return this.over || (this.won && !this.keepPlaying);
};

// Set up the game
GameManager.prototype.setup = function (gameState) {
    this.hasState = true;
    // Get previous game from server if present
    if (gameState != null) {
        this.grid = new Grid(gameState.grid.size, gameState.grid.cells); // Reload grid
        this.over = gameState.over;
        this.won = gameState.won;
        this.score       = gameState.score;
        this.bestScore = gameState.bestScore;
        this.keepPlaying = gameState.keepPlaying;
    }
    // Update the actuator
    this.actuator.updateCurrentMode(gameState.currentMode);
    this.actuator.updateDemocracyVotes(gameState.democracyVotes);
    this.actuator.updateAnarchyVotes(gameState.anarchyVotes);
    this.actuator.updateGamesLost(gameState.gamesLost);
    this.actuator.updateGamesWon(gameState.gamesWon);
    this.actuate();
    this.actuator.continueGame();
    this.syncCheck = setInterval(this.syncChecker, sync_interval);
};

// Sends the updated grid to the actuator
GameManager.prototype.actuate = function () {
    if (this.bestScore < this.score) {
        this.bestScore = this.score;
    }
    // Clear the state when the game is over (game over only, not win)
    if (this.over) {
        //this.storageManager.clearGameState();
    }

    this.actuator.actuate(this.grid, {
        score: this.score,
        bestScore: this.bestScore,
        over: this.over,
        won: this.won,
        terminated: this.isGameTerminated()
    });

};

// Represent the current game as an object
GameManager.prototype.serialize = function () {
    return {
        grid: this.grid.serialize(),
        score: this.score,
        over: this.over,
        won: this.won,
        keepPlaying: this.keepPlaying
    };
};

// Save all tile positions and remove merger info
GameManager.prototype.prepareTiles = function () {
    this.grid.eachCell(function (x, y, tile) {
        if (tile) {
            tile.mergedFrom = null;
            tile.savePosition();
        }
    });
};

// Move a tile and its representation
GameManager.prototype.moveTile = function (tile, cell) {
    this.grid.cells[tile.x][tile.y] = null;
    this.grid.cells[cell.x][cell.y] = tile;
    tile.updatePosition(cell);
};

GameManager.prototype.requestMove = function (direction) {
    var self = this;
    this.socket.emit("move", direction, self.grid.serialize());
};

// Move tiles on the grid in the specified direction
GameManager.prototype.move = function (direction, randoms) {
    // 0: up, 1: right, 2: down, 3: left
    var self = this;
    this.moved = true;
    if (this.isGameTerminated()) return; // Don"t do anything if the game"s over
    var cell, tile;
    var vector = this.getVector(direction);
    var traversals = this.buildTraversals(vector);
    var moved = false;
    // Save the current tile positions and remove merger information
    this.prepareTiles();
    // Traverse the grid in the right direction and move tiles
    traversals.x.forEach(function (x) {
        traversals.y.forEach(function (y) {
            cell = { x: x, y: y };
            tile = self.grid.cellContent(cell);
            if (tile) {
                var positions = self.findFarthestPosition(cell, vector);
                var next = self.grid.cellContent(positions.next);
                // Only one merger per row traversal?
                if (next && next.value === tile.value && !next.mergedFrom) {
                    var merged = new Tile(positions.next, tile.value * 2);
                    merged.mergedFrom = [tile, next];
                    self.grid.insertTile(merged);
                    self.grid.removeTile(tile);
                    self.score += merged.value;
                    // Converge the two tiles" positions
                    tile.updatePosition(positions.next);
                    // The mighty 2048 tile
                    if (merged.value === 2048) self.won = true;
                } else {
                    self.moveTile(tile, positions.farthest);
                }
                if (!self.positionsEqual(cell, tile)) {
                    moved = true; // The tile moved from its original cell!
                }
            }
        });
    });
    this.actuator.updateDemocracyMoves(0, 0, 0, 0);
    if (moved) {
        if (randoms != null) {
            var rTile = new Tile(randoms.cell, randoms.value);
            this.grid.insertTile(rTile);
        }
        if (!this.movesAvailable()) {
            this.over = true; // Game over!
        }
        this.actuate();
    }
};

// Get the vector representing the chosen direction
GameManager.prototype.getVector = function (direction) {
    // Vectors representing tile movement
    var map = {
        0: { x: 0, y: -1 }, // Up
        1: { x: 1, y: 0 },  // Right
        2: { x: 0, y: 1 },  // Down
        3: { x: -1, y: 0 }   // Left
    };

    return map[direction];
};

// Build a list of positions to traverse in the right order
GameManager.prototype.buildTraversals = function (vector) {
    var traversals = { x: [], y: [] };

    for (var pos = 0; pos < this.size; pos++) {
        traversals.x.push(pos);
        traversals.y.push(pos);
    }

    // Always traverse from the farthest cell in the chosen direction
    if (vector.x === 1) traversals.x = traversals.x.reverse();
    if (vector.y === 1) traversals.y = traversals.y.reverse();

    return traversals;
};

GameManager.prototype.findFarthestPosition = function (cell, vector) {
    var previous;

    // Progress towards the vector direction until an obstacle is found
    do {
        previous = cell;
        cell = { x: previous.x + vector.x, y: previous.y + vector.y };
    } while (this.grid.withinBounds(cell) &&
        this.grid.cellAvailable(cell));

    return {
        farthest: previous,
        next: cell // Used to check if a merge is required
    };
};

GameManager.prototype.movesAvailable = function () {
    return this.grid.cellsAvailable() || this.tileMatchesAvailable();
};

// Check for available matches between tiles (more expensive check)
GameManager.prototype.tileMatchesAvailable = function () {
    var self = this;

    var tile;

    for (var x = 0; x < this.size; x++) {
        for (var y = 0; y < this.size; y++) {
            tile = this.grid.cellContent({ x: x, y: y });

            if (tile) {
                for (var direction = 0; direction < 4; direction++) {
                    var vector = self.getVector(direction);
                    var cell = { x: x + vector.x, y: y + vector.y };

                    var other = self.grid.cellContent(cell);

                    if (other && other.value === tile.value) {
                        return true; // These two tiles can be merged
                    }
                }
            }
        }
    }

    return false;
};

GameManager.prototype.positionsEqual = function (first, second) {
    return first.x === second.x && first.y === second.y;
};