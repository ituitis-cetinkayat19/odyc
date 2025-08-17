const game = odyc.createGame({
    player: {
        sprite: `
            ...00...
            ...00...
            .000000.
            0.0000.0
            0.0000.0
            ..0000..
            ..0..0..
            ..0..0..
            `,
        position: [3, 1]
    },
    templates: {
        x: {
            sprite: 2
        }
    },
    map: `
        xxxxxxxx
        x......x
        x......x
        x......x
        x......x
        x......x
        x......x
        xxxxxxxx
    `
});

const resultMap = [
    [0, 2, 1],
    [1, 0, 2],
    [2, 1, 0]
];
const moves = ["Rock", "Paper", "Scissors"];
const matchResults = ["It's a tie!", "You win!", "You lose!"];

async function RPS() {
    const gameMove = Math.floor(Math.random() * 3);
    await game.openDialog("Pick one!");
    const playerMove = await game.prompt(...moves);
    await game.openDialog(`You picked ${moves[playerMove]}, I picked ${moves[gameMove]}.`)
    const result = resultMap[playerMove][gameMove];
    await game.openDialog(matchResults[result]);
    await game.openDialog("Do you want to play again?");
    const replay = await game.prompt("Yes", "No");
    if (replay === 0) RPS();
    else game.openDialog("OK, have a nice day.");
}

async function gameStart() {
    await game.openDialog("Do you want to play Rock, Paper, Scissors?");
    const choice = await game.prompt("Yes", "No");
    if (choice === 0) RPS();
    else game.openDialog("OK, have a nice day.");
}

gameStart();