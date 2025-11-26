let randomNumber;
let gameOver = false;

function startGame() {
    randomNumber = Math.floor(Math.random() * 100) + 1;
    document.getElementById('message').textContent = '';
    document.getElementById('guessInput').value = '';
    gameOver = false;
}

function checkGuess() {
    if (gameOver) return;
    const guess = Number(document.getElementById('guessInput').value);
    if (!guess || guess < 1 || guess > 100) {
        document.getElementById('message').textContent = 'Please enter a valid number between 1 and 100!';
        return;
    }
    if (guess === randomNumber) {
        document.getElementById('message').textContent = 'Congratulations! You guessed it right!';
        gameOver = true;
    } else if (guess < randomNumber) {
        document.getElementById('message').textContent = 'Try a higher number!';
    } else {
        document.getElementById('message').textContent = 'Try a lower number!';
    }
}

function resetGame() {
    startGame();
}

// Start game on page load
startGame();
