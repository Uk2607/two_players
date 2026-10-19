/**
 * Games Catalog — Static data defining available games.
 * Add new games here; the UI auto-renders from this list.
 */

export const GAMES = [
    {
        id: 'tic-tac-toe',
        title: 'Tic Tac Toe',
        desc: 'The classic 3×3 grid showdown. Get three in a row to win!',
        icon: '✕○',
        tag: 'Classic',
        color: 'purple',
    },
    {
        id: 'rock-paper-scissors',
        title: 'Rock Paper Scissors',
        desc: 'Quick-fire rounds of the ultimate hand game. Best of 5 wins!',
        icon: '✊',
        tag: 'Quick Play',
        color: 'cyan',
    },
    {
        id: 'connect-four',
        title: 'Connect Four',
        desc: 'Drop discs into the grid and connect four in a line before your opponent.',
        icon: '🔴',
        tag: 'Strategy',
        color: 'red',
    },
    {
        id: 'memory-match',
        title: 'Memory Match',
        desc: 'Flip cards and find matching pairs. The player with the most pairs wins!',
        icon: '🃏',
        tag: 'Brain Game',
        color: 'pink',
    },
    {
        id: 'word-duel',
        title: 'Word Duel',
        desc: 'Guess the hidden word letter by letter. Race against your opponent!',
        icon: '🔤',
        tag: 'Word Game',
        color: 'orange',
    },
    {
        id: 'battleship',
        title: 'Battleship',
        desc: 'Place your fleet and hunt down enemy ships on the high seas.',
        icon: '🚢',
        tag: 'Tactical',
        color: 'green',
    },
];
