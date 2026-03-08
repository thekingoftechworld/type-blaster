// 1. Setup & Elements
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const gameOverScreen = document.getElementById('game-over-screen');

// 2. Load Assets (Images & Sounds)
const playerImg = new Image(); playerImg.src = 'player.png';
const enemyImg = new Image(); enemyImg.src = 'enemy.png';

// Sound Assets
const shootSound = new Audio('shoot.wav');
const blastSound = new Audio('blast.wav');

// 3. Global Variables
let score = 0, lives = 3, wave = 1, gameActive = false;
let activeWords = [], bullets = [], particles = [];
let currentTarget = null, lastSpawn = 0, wordsSpawnedInWave = 0;
let baseSpeed = 1.2, spawnInterval = 2500;

// Stats Variables
let totalKeystrokes = 0;
let correctKeystrokes = 0;
let currentStreak = 0;
let longestStreak = 0;

// 4. THE START FUNCTION
function startGame() {
    overlay.style.display = 'none'; 
    gameOverScreen.classList.add('hidden');

    // Reset Game State
    score = 0; lives = 3; wave = 1;
    activeWords = []; bullets = []; particles = [];
    wordsSpawnedInWave = 0;
    baseSpeed = 1.2;
    spawnInterval = 2500;

    // Reset Stats
    totalKeystrokes = 0;
    correctKeystrokes = 0;
    currentStreak = 0;
    longestStreak = 0;

    gameActive = true;
    updateHUD();
    requestAnimationFrame(gameLoop);
}

// 5. Classes
class Bullet {
    constructor(tx, ty) {
        this.x = canvas.width / 2;
        this.y = canvas.height - 100;
        this.tx = tx; this.ty = ty;
        this.alive = true;
    }
    update() {
        let dx = this.tx - this.x;
        let dy = this.ty - this.y;
        this.x += dx * 0.3; 
        this.y += dy * 0.3;
        if (Math.abs(dy) < 10) this.alive = false;
    }
    draw() {
        ctx.shadowBlur = 10; ctx.shadowColor = "#39ff14";
        ctx.strokeStyle = '#39ff14';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x, this.y + 15);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
}

class Word {
    constructor(text, speed) {
        this.text = text;
        this.typed = "";
        this.x = Math.random() * (canvas.width - 120) + 60;
        this.y = -30;
        this.speed = speed;
    }
    update() { this.y += this.speed; }
    draw() {
        if (enemyImg.complete && enemyImg.naturalWidth > 0) {
            ctx.drawImage(enemyImg, this.x - 25, this.y - 35, 50, 50);
        } else {
            ctx.fillStyle = "red"; ctx.fillRect(this.x - 15, this.y - 15, 30, 30);
        }
        ctx.font = "bold 20px 'Courier New'";
        ctx.textAlign = "center";
        ctx.fillStyle = "#555"; 
        ctx.fillText(this.text, this.x, this.y + 35);
        
        ctx.fillStyle = "#39ff14"; 
        let tw = ctx.measureText(this.text).width;
        let typedW = ctx.measureText(this.typed).width;
        ctx.fillText(this.typed, this.x - tw/2 + typedW/2, this.y + 35);
    }
}

// 6. Logic Functions
function updateHUD() {
    document.getElementById('score').innerText = score;
    document.getElementById('wave-display').innerText = wave;
    document.getElementById('lives-container').innerText = "❤️".repeat(lives);
}

// Helper function to play sound from start
function playSound(audioFile) {
    audioFile.currentTime = 0;
    audioFile.play().catch(e => console.log("Sound play blocked or file missing"));
}

window.addEventListener('keydown', (e) => {
    if (!gameActive) return;
    let char = e.key.toLowerCase();
    if (!/^[a-z]$/.test(char)) return; 

    totalKeystrokes++;

    if (!currentTarget) {
        currentTarget = activeWords.find(w => w.text.startsWith(char));
    }

    if (currentTarget) {
        let nextChar = currentTarget.text[currentTarget.typed.length];
        if (char === nextChar) {
            correctKeystrokes++;
            currentStreak++;
            if (currentStreak > longestStreak) longestStreak = currentStreak;

            currentTarget.typed += char;
            bullets.push(new Bullet(currentTarget.x, currentTarget.y));
            
            // WORD COMPLETION LOGIC
            if (currentTarget.typed === currentTarget.text) {
                playSound(shootSound); // Play shoot sound ONLY when word is finished
                score += 10;
                activeWords = activeWords.filter(w => w !== currentTarget);
                currentTarget = null;
                updateHUD();
            }
        } else {
            currentStreak = 0;
        }
    } else {
        currentStreak = 0;
    }
});

function gameLoop(time) {
    if (!gameActive) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let shipY = canvas.height - 90;
    if (playerImg.complete) ctx.drawImage(playerImg, canvas.width/2 - 30, shipY, 60, 60);

    bullets.forEach((b, i) => { 
        b.update(); b.draw(); 
        if(!b.alive) bullets.splice(i, 1); 
    });

    if (time - lastSpawn > spawnInterval) {
        let list = (wave < 8) ? wordBank.easy : (wave < 12 ? wordBank.medium : wordBank.hard);
        let txt = list[Math.floor(Math.random() * list.length)];
        activeWords.push(new Word(txt, baseSpeed));
        wordsSpawnedInWave++;
        
        if(wordsSpawnedInWave > 10) { 
            wave++; 
            wordsSpawnedInWave = 0; 
            if(wave < 12) baseSpeed += 0.25;
            updateHUD(); 
        }
        lastSpawn = time;
    }

    for (let i = activeWords.length - 1; i >= 0; i--) {
        let w = activeWords[i];
        w.update(); w.draw();

        if (w.y > shipY - 10) {
            lives--;
            document.getElementById('game-container').classList.add('shake');
            setTimeout(() => document.getElementById('game-container').classList.remove('shake'), 200);
            
            activeWords.splice(i, 1);
            if(w === currentTarget) currentTarget = null;
            updateHUD();

            if(lives <= 0) gameOver();
        }
    }

    requestAnimationFrame(gameLoop);
}

function gameOver() {
    gameActive = false;
    playSound(blastSound); // Play blast sound ONLY at Game Over
    
    let accuracy = totalKeystrokes > 0 ? Math.round((correctKeystrokes / totalKeystrokes) * 100) : 0;
    
    document.getElementById('final-score').innerText = score;
    document.getElementById('final-wave').innerText = wave;
    document.getElementById('final-accuracy').innerText = accuracy;
    document.getElementById('final-streak').innerText = longestStreak;
    
    gameOverScreen.classList.remove('hidden');
}