async function advanceForm(from, to, turns, sound) {
    if (game.turn % turns === 0) {
        const list = game.getAll(from);
        if (list.length > 0) {
            if (sound) game.playSound(sound);
            const index = Math.floor(Math.random() * list.length);
            const selected = list[index];
            game.addToCell(...selected.position, to);
            if (to === 'g') {
                checkGameEnd();
            }
        }
    }
}

const emptyMap = `
........
........
........
........
........
........
........
........
`;

const mapSize = () => {
    return maps[mapIndex].split('x').length - 1;
}

let mapIndex;
const maps = [
    `
        ........
        ........
        ........
        ..xxxx..
        ..xxxx..
        ........
        ........
        ........
    `,
    `
        ........
        ........
        .xxxxxx.
        .xxxxxx.
        .xxxxxx.
        .xxxxxx.
        ........
        ........
    `,
    `
        ........
        xxxxxxxx
        xxxxxxxx
        xxxxxxxx
        xxxxxxxx
        xxxxxxxx
        xxxxxxxx
        ........
    `,
    `
        xxxxxxxx
        xxxxxxxx
        xxxxxxxx
        xxxxxxxx
        xxxxxxxx
        xxxxxxxx
        xxxxxxxx
        xxxxxxxx
    `
];

const game = odyc.createGame({
title: "Tomato Farmer",
background: 7,
    player: {
    //x (empty) -> y (dry seed) -> z (watered seed) -> q (dry sprout) -> w (watered sprout) 
    //  -> e (dry plant) -> f (watered plant) -> g (fruit plant)
    // r (infected plant)
    // x -> y (plant)
    // y -> z (water)
    // z -> q (8)    
    // q -> w (water)
    // w -> e (8)   
    // e -> f (water)
    // f -> g (16)
    // x <- y (16)
    // y <- z (24)
    // x <- q (32)
    // q <- w (24)
    // x <- e (40)
    // e <- f (28)
    // r <- f (30)
    // x <- r (20)
        onTurn() {
            advanceForm('y', 'x', 16, null);
            advanceForm('z', 'y', 24, null);
            advanceForm('q', 'x', 32, null);
            advanceForm('z', 'q', 8, null);
            advanceForm('e', 'x', 40, 'HIT');
            advanceForm('w', 'e', 8, null);
            advanceForm('w', 'q', 24, null);
            advanceForm('r', 'x', 20, 'HIT');
            advanceForm('f', 'e', 28, null);
            advanceForm('f', 'r', 30, null);
            advanceForm('f', 'g', 16, 'PICKUP');
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
            sprite: 6,
            solid: false,
            onEnter(target) {
                game.addToCell(...target.position, 'y');
            },
        },
        y: {
            sprite: `
                66666666
                66966666
                66666966
                66666666
                69666666
                66666696
                66696666
                66666666
            `,
            solid: false,
            onEnter(target) {
                game.addToCell(...target.position, 'z');
            },
        },
        z: {
            sprite: `
                99999999
                99099999
                99999099
                99999999
                90999999
                99999909
                99909999
                99999999
            `,
            solid: false
        },
        q: {
            sprite: `
                67766666
                66766776
                66666766
                67766666
                66666776
                66776676
                66676666
                66666666
            `,
            solid: false,
            onEnter(target) {
                game.addToCell(...target.position, 'w');
            }
        },
        w: {
            sprite: `
                97799999
                99799779
                99999799
                97799999
                99999779
                99779979
                99979999
                99999999
            `,
            solid: false
        },
        e: {
            sprite: `
                66677666
                76677667
                77677677
                67777776
                76677667
                77677677
                67777776
                66677666
            `,
            solid: false,
            onEnter(target) {
                game.addToCell(...target.position, 'f');
            }
        },
        f: {
            sprite: `
                99977999
                79977997
                77977977
                97777779
                79977997
                77977977
                97777779
                99977999
            `,
            solid: false
        },
        g: {
            sprite: `
                99977999
                14977914
                44977944
                97777779
                14977914
                44977944
                97777779
                99977999
            `,
            solid: false
        },
        r: {
            sprite: `
                    22265222
                    52265225
                    56255266
                    26555552
                    52256225
                    55256255
                    26655662
                    22265222
                `,
            solid: false,
            onEnter(target) {
                game.addToCell(...target.position, 'f');
            }
        }
    },
    map: emptyMap
});

async function checkGameEnd() {
    if (game.getAll('g').length === mapSize()) {
        await game.openDialog("Farm completed");
        await game.end(`You have fully grown your crops in ~<5>${game.turn}<5>~ moves!`);
        game.loadMap(emptyMap);
        gameStart();
    }
}

async function gameStart() {
    await game.openDialog("Select plot size");
    mapIndex = await game.prompt("4x2", "6x4", "8x6", "8x8");
    game.loadMap(maps[mapIndex]);
}

gameStart();