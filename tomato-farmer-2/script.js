function checkWorkerSpriteAtCell(x, y) {
    for (let i = 0; i < workers.length; i++) {
        const workerPosition = workers[i].position;
        if (workerPosition[0] === x && workerPosition[1] === y)
            return workerSprites[i];
    }
    return null;
}

function changeCellNew(x, y, template) {
    game.setCellAt(x, y, template);
    const workerSprite = checkWorkerSpriteAtCell(x, y);
    if (workerSprite) {
        game.updateCellAt(x, y, {
            sprite: odyc.mergeSprites(sprites[template], workerSprite)
        });
    }
}

async function buyUpgrade(price, onSuccess, buyDialog) {
    if (totalMoney >= price) {
        await game.openDialog(buyDialog);
        totalMoney -= price;
        onSuccess();
    } else {
        await game.openDialog("You don't have enough money");
    }
}

async function talkToPlotMerchant() {
    if (mapIndex === maps.length - 1) {
        await game.openDialog("Your field is at max size");
        return;
    }
    const plotPrice = plotPrices[mapIndex];
    await game.openDialog("Do you want to expand your field?");
    const expandPlot = await game.prompt(`Yes - $${plotPrice}`, "No");
    if (expandPlot === 0) {
        buyUpgrade(plotPrice, () => {
            mapIndex += 1
        }, "Thank you for your purchase");
    } else {
        await game.openDialog("Alright, see you later");
    }
}

async function talkToEqMerchant() {
    const remaining = equipments.filter(eq => eq.level !== 3);
    if (remaining.length === 0) {
        await game.openDialog("You have bought all the upgrades");
        return;
    }
    await game.openDialog("Do you want to upgrade your gear?");
    const upgradeIndex = await game.prompt(...remaining.map(eq => eq.name), "Leave");
    if (upgradeIndex === remaining.length) {
        await game.openDialog("Have a nice day");
        return;
    }
    const equipment = remaining[upgradeIndex];
    const level = equipment.level;
    if (level >= 3) {
        await game.openDialog(`Your ${equipment.name.toLowerCase()} is at max level`);
        return;
    }
    await game.openDialog(`${level === 0 ? `${equipment.upgradeDesc}|` : ""}Do you want to buy this upgrade?`);
    const price = equipment.prices[level];
    const buy = await game.prompt(`Yes - $${price}`, "No");
    if (buy === 0) {
        buyUpgrade(price, () => {
            equipment.level += 1;
        }, "Thank you for your purchase");
    } else {
        await game.openDialog("Have a nice day");
    }
}

async function talkToWorker() {
    if (boughtWorkerToday) {
        await game.openDialog("See you at the farm");
        return;
    }
    await game.openDialog(`I can work for you for $${workerSalary} a day|Do you want to hire me?`);
    const hire = await game.prompt(`Yes - $${workerPrice}`, "No");
    if (hire === 0) {
        buyUpgrade(workerPrice, () => {
            boughtWorkerToday = true;
            workers.push({position: null, direction: null});
        }, "Thank you, see you at the farm");
    } else {
        await game.openDialog("Catch you later");
    }
}

function nextWorkerPosition(worker) {
    const [xpos, ypos] = worker.position;
    const [xdir, ydir] = worker.direction;
    if (game.getCellAt(xpos + xdir, ypos)?.symbol !== null) {
        worker.position = [xpos + xdir, ypos];
        return
    } else if (game.getCellAt(xpos, ypos + ydir)?.symbol !== null) {
        worker.position = [xpos, ypos + ydir]
        worker.direction = [-xdir, ydir];
        return
    }
    worker.direction = [-xdir, -ydir];
    worker.position = [xpos, ypos - ydir];
}

function moveWorker() {
    workers.forEach(worker => {
        game.updateCellAt(...worker.position, {
                sprite: sprites[game.getCellAt(...worker.position).symbol]
            });
        nextWorkerPosition(worker);
    });
    drawWorkerNewCell();
}

function drawWorkerNewCell() {
    workers.forEach((worker, index) => {
        const newPositionCell = game.getCellAt(...worker.position);
        game.updateCellAt(...worker.position, {
            sprite: odyc.mergeSprites(newPositionCell.sprite, workerSprites[index])
        });
        const newPositionSymbol = newPositionCell.symbol;
        switch (newPositionSymbol) {
            case 'x':
                changeCellNew(...worker.position, 'y');
                break;
            case 'y':
                changeCellNew(...worker.position, 'z');
                break;
            case 'q':
                changeCellNew(...worker.position, 'w');
                break;
            case 'e':
                changeCellNew(...worker.position, 'f');
                break;
            case 'g':
                changeCellNew(...worker.position, 'y');
                game.playSound("PICKUP");
                dailyProfit += 10;
                break;
            case 'r':
                changeCellNew(...worker.position, 'f');
                break;
            default:
                break;
        }
    });
}

function goToMarket() {
    lastDayMap = getMap();
    game.player.position = [3, 3];
    const selectedMap = workers.length >= workerLimit ? marketMapNoWorker : marketMap;
    game.loadMap(selectedMap);
    if (selectedMap === marketMap) {
        game.getAll('p').forEach(worker => {
            worker.sprite = workerSpriteMarket(workers.length);
        });
    }
    inMarket = true;
}

async function leaveMarket() {
    await game.openDialog("Are you sure you want to leave the market?")
    const leave = await game.prompt("Yes", "No");
    if (leave === 0) {
        game.player.position = [3, 0];
        game.loadMap(odyc.mergeSprites(maps[mapIndex].sprite, lastDayMap));
        workers.forEach((worker, index) => {
            const workerCell = maps[mapIndex].corners[index];
            game.updateCellAt(...workerCell, {
                sprite: odyc.mergeSprites(game.getCellAt(...workerCell).sprite, workerSprites[index])
            });
            worker.position = workerCell;
            worker.direction = maps[mapIndex].dir[index];
        });
        inMarket = false;
        boughtWorkerToday = false;
        dayStartTurn = game.turn;
        savePersistance();
        await game.openMessage(`Day ${day}`);
    }
}

function getMap() {
    let mapString = '';
    for (let y = 0; y < game.height; y++) {
        let row = '';
        for (let x = 0; x < game.width; x++) {
            row += game.getCellAt(x, y).symbol ?? '.';
        }
        mapString += row + '\n';
    }
    return mapString;
}

async function advanceForm(from, to, turns, sound) {
    if (game.turn !== 0 && game.turn % turns === 0) {
        const list = game.getAll(from);
        if (list.length > 0) {
            if (sound) game.playSound(sound);
            const index = Math.floor(Math.random() * list.length);
            const selected = list[index];
            changeCellNew(...selected.position, to);
        }
    }
}

async function checkDayEnd() {
    if (game.turn - dayStartTurn >= dayTime) {
        totalMoney += dailyProfit;
        totalMoney -= workers.length * workerSalary;
        await game.openDialog("The day is over");
        goToMarket();
        await game.openMessage(
            `End of Day ${day}\n` +
            "----------------\n" +
            `Earned: $${dailyProfit}\n` +
            `${workers.length > 0 ? `Worker(s): -$${workers.length * workerSalary}\n` : ""}` +
            `\nTotal: $${totalMoney}\n`
        );
        dailyProfit = 0;
        day += 1;
    }
}

const marketMap = 
`
    ..2p2...
    ..222...
    22222222
    m222222t
    22222222
    ..222...
    ..222...
    ..2n2...
`;

const marketMapNoWorker = 
`
    ..222...
    ..222...
    22222222
    m222222t
    22222222
    ..222...
    ..222...
    ..2n2...
`;

function workerSpriteMarket(index) {
    return workerSprites[index].replaceAll('.', '2');
}

const workerSprites = [
    `
        ...99...
        ..9999..
        ...55...
        ..3883..
        ..3333..
        ..9339..
        ...33...
        ...00...
    `,
    `
        ...99...
        ..9999..
        ...55...
        ..4774..
        ..4444..
        ..9449..
        ...44...
        ...00...
    `,
    `
        ...99...
        ..9999..
        ...66...
        ..5445..
        ..5555..
        ..9559..
        ...55...
        ...00...
    `,
    `
        ...99...
        ..9999..
        ...66...
        ..7337..
        ..7777..
        ..9779..
        ...77...
        ...00...
    `,
];

const sprites = {
    x: `
        66666666
        66666666
        66666666
        66666666
        66666666
        66666666
        66666666
        66666666
    `,
    y: `
        66666666
        66966666
        66666966
        66666666
        69666666
        66666696
        66696666
        66666666
    `,
    z: `
        99999999
        99099999
        99999099
        99999999
        90999999
        99999909
        99909999
        99999999
    `,
    q: `
        67766666
        66766776
        66666766
        67766666
        66666776
        66776676
        66676666
        66666666
    `,
    w: `
        97799999
        99799779
        99999799
        97799999
        99999779
        99779979
        99979999
        99999999
    `,
    e: `
        66677666
        76677667
        77677677
        67777776
        76677667
        77677677
        67777776
        66677666
    `,
    f: `
        99977999
        79977997
        77977977
        97777779
        79977997
        77977977
        97777779
        99977999
    `,
    g: `
        66677666
        14677614
        44677644
        67777776
        14677614
        44677644
        67777776
        66677666
    `,
    r: `
        22265222
        52265225
        56255266
        26555552
        52256225
        55256255
        26655662
        22265222
    `
};

let workers = [];
const workerLimit = 4;
let boughtWorkerToday = false;
let dayStartTurn = 0;
let inMarket = false;
let lastDayMap = `
    ........
    ........
    ........
    ........
    ........
    ........
    ........
    ........
`;
let mapIndex = 0;
let day = 1;
let dailyProfit = 0;
let totalMoney = 0;
const workerPrice = 500;
const workerSalary = 80;
const plotPrices = [250, 500, 750];
const dayTime = 250;

function getEqLvl(name) {
    return equipments.find(eq => eq.name === name)?.level;
}

const equipments = [
    {
        name: "Watering Can",
        level: 0,
        prices: [100, 200, 300],
        upgradeDesc: "Your plants will hold water for longer"
    }, 
    {
        name: "Fertilizer",
        level: 0,
        prices: [200, 300, 400],
        upgradeDesc: "Your plants will grow faster"
    }, 
    {
        name: "Bug Spray",
        level: 0,
        prices: [100, 150, 200],
        upgradeDesc: "Your plants will be more resistant against bugs"
    }
];
const maps = [
    {
        sprite: `
            ........
            ........
            ........
            ..xxxx..
            ..xxxx..
            ........
            ........
            ........
        `,
        corners: [[2, 3], [5, 3], [2, 4], [5, 4]],
        dir: [[1, 1], [-1, 1], [1, -1], [-1, -1]]
    },
    {
        sprite: `
            ........
            ........
            .xxxxxx.
            .xxxxxx.
            .xxxxxx.
            .xxxxxx.
            ........
            ........
        `,
        corners: [[1, 2], [6, 2], [1, 5], [6, 5]],
        dir: [[1, 1], [-1, 1], [1, -1], [-1, -1]]
    },
    {
        sprite: `
            ........
            xxxxxxxx
            xxxxxxxx
            xxxxxxxx
            xxxxxxxx
            xxxxxxxx
            xxxxxxxx
            ........
        `,
        corners: [[0, 1], [7, 1], [0, 6], [7, 6]],
        dir: [[1, 1], [-1, 1], [1, -1], [-1, -1]]
    },
    {
        sprite: `
            xxxxxxxx
            xxxxxxxx
            xxxxxxxx
            xxxxxxxx
            xxxxxxxx
            xxxxxxxx
            xxxxxxxx
            xxxxxxxx
        `,
        corners: [[0, 0], [7, 0], [0, 7], [7, 7]],
        dir: [[1, 1], [-1, 1], [1, -1], [-1, -1]]
    },
];

const game = odyc.createGame({
background: 7,
    player: {
    /*x (empty) -> y (dry seed) -> z (watered seed) -> q (dry sprout) -> w (watered sprout) 
    -> e (dry plant) -> f (watered plant) -> g (fruit plant)
    r (infected plant)
    x -> y (plant)
    y -> z (water)
    z -> q (6) (-1 * fertilizer)
    q -> w (water)
    w -> e (6) (-1 * fertilizer)
    e -> f (water)
    r -> f (spray)
    f -> g (10) (-2 * fertilizer)
    x <- y (16) (+2 * watering can)
    y <- z (24) (+4 * watering can)
    x <- q (32) (+4 * watering can)
    q <- w (24) (+4 * watering can)
    x <- e (40) (+6 * watering can)
    e <- f (28) (+4 * watering can)
    r <- f (30) (+8 * bug spray)
    x <- r (20) (+8 * bug spray)
    */
        onTurn() {
            if (inMarket || game.turn - dayStartTurn === 0) return;
            moveWorker();
            advanceForm('y', 'x', 16 + 2 * getEqLvl("Watering Can"), null);
            advanceForm('z', 'y', 24 + 4 * getEqLvl("Watering Can"), null);
            advanceForm('q', 'x', 32 + 4 * getEqLvl("Watering Can"), null);
            advanceForm('z', 'q', 6 - getEqLvl("Fertilizer"), null);
            advanceForm('e', 'x', 40 + 6 * getEqLvl("Watering Can"), 'HIT');
            advanceForm('w', 'e', 6 - getEqLvl("Fertilizer"), null);
            advanceForm('w', 'q', 24 + 4 * getEqLvl("Watering Can"), null);
            advanceForm('r', 'x', 20 + 8 * getEqLvl("Bug Spray"), 'HIT');
            advanceForm('f', 'e', 28 + 4 * getEqLvl("Watering Can"), null);
            advanceForm('f', 'r', 30 + 8 * getEqLvl("Bug Spray"), null);
            advanceForm('f', 'g', 10 - 2 * getEqLvl("Fertilizer"), null);
            checkDayEnd();
        },
        sprite: 
        `
            ...66...
            ..6666..
            ...55...
            .434434.
            4.3333.4
            4.3333.4
            ..3..3..
            .00..00.
        `,
        position: [3, 0]
    },
    templates: {
        x: {
            sprite: sprites.x,
            solid: false,
            onEnter(target) {
                changeCellNew(...target.position, 'y');
            },
        },
        y: {
            sprite: sprites.y,
            solid: false,
            onEnter(target) {
                changeCellNew(...target.position, 'z');
            },
        },
        z: {
            sprite: sprites.z,
            solid: false
        },
        q: {
            sprite: sprites.q,
            solid: false,
            onEnter(target) {
                changeCellNew(...target.position, 'w');
            }
        },
        w: {
            sprite: sprites.w,
            solid: false
        },
        e: {
            sprite: sprites.e,
            solid: false,
            onEnter(target) {
                changeCellNew(...target.position, 'f');
            }
        },
        f: {
            sprite: sprites.f,
            solid: false
        },
        g: {
            sprite: sprites.g,
            solid: false,
            onEnter(target) {
                game.playSound("PICKUP");
                dailyProfit += 10;
                changeCellNew(...target.position, 'y');
            }
        },
        r: {
            sprite: sprites.r,
            solid: false,
            onEnter(target) {
                changeCellNew(...target.position, 'f');
            }
        },
        t: {
            sprite: `
                99999922
                99499992
                94149999
                91119999
                91619992
                99999922
                22992222
                22992222
            `,
            solid: false,
            onEnter: leaveMarket
        },
        m: {
            sprite: `
                22299222
                22999922
                22255222
                22344322
                22344322
                22544522
                22244222
                22200222
            `,
            onCollide: talkToPlotMerchant
        },
        2: {
            sprite: 2,
            solid: false
        },
        n: {
            sprite: `
                22299222
                22999922
                22266222
                22477422
                22477422
                22633622
                22233222
                22200222
            `,
            onCollide: talkToEqMerchant
        },
        p: {
            sprite: `
                22299222
                22999922
                22255222
                22377322
                22377322
                22977922
                22277222
                22200222
            `,
            onCollide: talkToWorker
        }
    },
    map: maps[mapIndex].sprite
});


async function checkPersistance() {
    const choice = await game.prompt("New Game", "Continue");
    if (choice === 0) {
        localStorage.removeItem("eqLevels");
        localStorage.removeItem("totalMoney");
        localStorage.removeItem("day");
        localStorage.removeItem("mapIndex");
        localStorage.removeItem("lastDayMap");
        localStorage.removeItem("workers");
    } else {
        const eqLevels = JSON.parse(localStorage.getItem("eqLevels"));
        const savedTotalMoney = parseInt(localStorage.getItem("totalMoney"));
        const savedDay = parseInt(localStorage.getItem("day"));
        const savedMapIndex = parseInt(localStorage.getItem("mapIndex"));
        const savedLastDayMap = localStorage.getItem("lastDayMap");
        const savedWorkers =  JSON.parse(localStorage.getItem("workers"));
        if (eqLevels) {
            equipments.forEach((eq, i) => eq.level = eqLevels[i]);
        }
        if (!isNaN(savedMapIndex) && savedLastDayMap !== null && savedWorkers) {
            mapIndex = savedMapIndex;
            lastDayMap = savedLastDayMap;
            workers = savedWorkers;
            game.loadMap(odyc.mergeSprites(maps[mapIndex].sprite, lastDayMap));
            workers.forEach((worker, index) => {
                const workerCell = maps[mapIndex].corners[index];
                game.updateCellAt(...workerCell, {
                    sprite: odyc.mergeSprites(game.getCellAt(...workerCell).sprite, workerSprites[index])
                });
                worker.position = workerCell;
                worker.direction = maps[mapIndex].dir[index];
            });
        }
        totalMoney = isNaN(savedTotalMoney) ? totalMoney : savedTotalMoney;
        day = isNaN(savedDay) ? day : savedDay;
    }
    await game.openMessage("Tomato Farmer");
    await game.openMessage(`Day ${day}`);
}

function savePersistance() {
    localStorage.setItem("eqLevels", JSON.stringify(equipments.map(eq => eq.level)));
    localStorage.setItem("totalMoney", totalMoney);
    localStorage.setItem("day", day);
    localStorage.setItem("mapIndex", mapIndex);
    localStorage.setItem("lastDayMap", lastDayMap);
    localStorage.setItem("workers", JSON.stringify(workers));
}

checkPersistance();