let score = 0;
let difficulty;
let targetScore;
const firstScoreSprite = () => odyc.charToSprite((score % 10).toString(), 1);
const secondScoreSprite = () => odyc.charToSprite((score / 10).toString(), 1);
let balls = [];

const sprites = {
    t: `........
        ........
        ........
        ...11111
        ...11111
        ...11...
        ...11...
        ...11...
    `,
    u: `........
        ........
        ........
        11111...
        11111...
        ...11...
        ...11...
        ...11...
    `,
    ı: `
        ...11....
        ...11...
        ...11...
        ...11111
        ...11111
        ........
        ........
        ........
    `,
    o: `
        ...11...
        ...11...
        ...11...
        11111...
        11111...
        ........
        ........
        ........
    `,
    y: `
        22222222
        .1.1.1.1
        1.1.1.1.
        .1.1.1.1
        1.1.1.1.
        .1.1.1.1
        1.1.1.1.
        22222222
    `,
    v: `
        ...11...
        ...11...
        ...11...
        ...11...
        ...11...
        ...11...
        ...11...
        ...11...
    `,
    h: `
        ........
        ........
        ........
        11111111
        11111111
        ........
        ........
        ........
    `,
    m: `
        ...99222
        ...991.1
        ...99.1.
        ...991.1
        ...99.1.
        ...991.1
        ...99.1.
        ...99222
    `,
    n: `
        22299...
        .1.99...
        1.199...
        .1.99...
        1.199...
        .1.99...
        1.199...
        22299...
    `,
    e: `
        ........
        ........
        ........
        ..7777..
        .7....7.
        7......7
        .7....7.
        ..7777..
    `,
    b: `
        ........
        ..1100..
        .010011.
        .100111.
        .110111.
        .110000.
        ..0111..
        ........
    `,
    '.': `
        ........
        ........
        ........
        ........
        ........
        ........
        ........
        ........
    `,
    s: odyc.charToSprite('0', 1),
    a: odyc.charToSprite('0', 1)
}

const spawnX = [2, 4, 6, 8, 10];

async function finishGame() {
    await game.end(`You have reached ~<5>${targetScore}<5>~ points`);
    gameStart();
    score = 0;
}

const checkBallExistsAt = (x, y) => {
    return balls.filter(ball => ball.position[0] === x && ball.position[1] === y).length > 0;
}

const checkIfTargetExists = (x, y) => {
    return balls.filter(ball => ball.position[0] === x && ball.targetY === y).length > 0;
}

const moveBalls = () => {
    balls.forEach(ball => {
        game.updateCellAt(...ball.position, {
            sprite: sprites[game.getCellAt(...ball.position).symbol]
        });
        ball.position[1] += ball.direction;
    });
    balls = balls.filter(ball => ball.position[1] >= 0 && ball.position[1] <= 18);
    balls.forEach(ball => {
        game.updateCellAt(...ball.position, {
            sprite: odyc.mergeSprites(game.getCellAt(...ball.position).sprite, sprites.b)
        });
    });
}

    const game = odyc.createGame({
    background: "#f5bf42",
    screenHeight: 19,
    screenWidth: 14,
    title: "Volleyball Training",
    player: {
        onTurn() {
            moveBalls();
            if (game.player.position[1] <= 9) game.player.position[1] = 10;
            balls.filter(ball => ball.direction === 1).forEach(ball => {
                const ballX = ball.position[0];
                const ballY = ball.position[1];
                if (ballY === ball.targetY) {
                    if (game.player.position[0] === ballX && game.player.position[1] === ballY) {
                        score += 1;
                        game.playSound("LASER");
                        if (score >= targetScore) {
                            finishGame();
                            return;
                        }
                        ball.direction = -1;
                    } else {
                        game.playSound("FALL");
                        score = score > 0 ? score - 1 : score;
                    }
                    game.sendMessageToCells({
                        symbols: ['a', 's']
                    }, "scored");
                    game.setCellAt(...ball.position, '.');
                    game.updateCellAt(...ball.position, {
                        sprite: sprites.b
                    });
                }
            });
            if (game.turn % difficulty === 2) {
                const addOdd = (game.player.position[0] + game.player.position[1]) % 2;
                const ballX = spawnX[Math.floor(Math.random() * spawnX.length)] + addOdd;
                let targetY;
                do {
                    targetY = Math.floor(Math.random() * 7) + 10;
                } while (checkIfTargetExists(ballX, targetY));
                balls.push({
                    position: [ballX, 0],
                    targetY: targetY,
                    direction: 1
                });
                game.setCellAt(ballX, targetY, 'e');
                if (checkBallExistsAt(ballX, targetY)) {
                    game.updateCellAt(ballX, targetY, {
                        sprite: odyc.mergeSprites(sprites.e, sprites.b)
                    });
                }
            }
        },
        sprite: `
                ...44...
                ...44...
                .333333.
                3.3333.3
                4.3333.4
                ..7777..
                ..7..7..
                ..4..4..
                `,
        position: [5, 14]
    },
    templates: {
        t: {
            sprite: sprites.t
        },
        u: {
            sprite: sprites.u
        },
        ı: {
            sprite: sprites.ı
        },
        o: {
            sprite: sprites.o
        },
        y: {
            sprite: sprites.y
        },
        v: {
            sprite: sprites.v
        },
        h: {
            sprite: sprites.h
        },
        m: {
            sprite: sprites.m
        },
        n: {
            sprite: sprites.n
        },
        e: {
            sprite: sprites.e,
            solid: false
        },
        s: {
            sprite: sprites.s,
            foreground: true,
            onMessage(target, message) {
                if (message === "scored") {
                    if (checkBallExistsAt(...target.position)) {
                        target.sprite = odyc.mergeSprites(firstScoreSprite(), sprites.b);
                    } else {
                        target.sprite = firstScoreSprite();
                    }
                    sprites.s = firstScoreSprite();
                }
            }
        },
        a: {
            sprite: sprites.a,
            foreground: true,
            onMessage(target, message) {
                if (message === "scored") {
                    if (checkBallExistsAt(...target.position)) {
                        target.sprite = odyc.mergeSprites(firstScoreSprite(), sprites.b);
                    } else {
                        target.sprite = secondScoreSprite();
                    }
                    sprites.a = secondScoreSprite();
                }
            }
        },
        '.': {
            sprite: sprites['.'],
            solid: false,
        },
    },
    map: `
        ..............
        .thhhhhhhhhhu.
        .v..........v.
        .v..........v.
        .v....as....v.
        .v..........v.
        .v..........v.
        .v..........v
        .v..........v.
        .myyyyyyyyyyn
        .v..........v.
        .v..........v
        .v..........v.
        .v..........v.
        .v..........v.
        .v..........v.
        .v..........v.
        .ıhhhhhhhhhho.
        ..............
    `
    });

async function gameStart() {
    balls = [];
    const difficulties = [15, 12, 9, 6];
    const targetScores = [5, 10, 15, 20];
    await game.openDialog("Choose a difficulty");
    const difficultyIndex = await game.prompt("Easy", "Normal", "Hard", "Very Hard");
    difficulty = difficulties[difficultyIndex];
    await game.openDialog("Choose a target score");
    const targetScoreIndex = await game.prompt(...targetScores.map(score => score.toString()));
    targetScore = targetScores[targetScoreIndex];
}

gameStart();