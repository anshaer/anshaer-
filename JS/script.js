const canvas = document.getElementById('matrix');
const ctx = canvas.getContext('2d');

function initializeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

initializeCanvas();

const fontSize = 16;
let columns = Math.floor(canvas.width / fontSize);

const characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZぁぃぅぇぉかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙㄧㄨㄩㄛㄜㄝㄞㄟㄠㄡㄢㄣㄤㄥㄦㄧㄨㄩㄞㄟㄠㄡㄢㄣㄤㄥㄦ';
let drops = Array(columns).fill(0).map(() => ({
    position: Math.floor(Math.random() * canvas.height / fontSize),
    direction: Math.random() > 0.5 ? 1 : -1
}));

function draw() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = `${fontSize}px monospace`;

    for (let i = 0; i < drops.length; i++) {
        const text = characters[Math.floor(Math.random() * characters.length)];
        const x = i * fontSize;
        const y = drops[i].position * fontSize;
        ctx.fillStyle = `hsl(${Math.random() * 360}, 100%, 50%)`; // Random rainbow colors
        ctx.fillText(text, x, y);

        if ((y > canvas.height || y < 0) && Math.random() > 0.975) {
            drops[i].direction *= -1; // Reverse direction when out of bounds
        }

        drops[i].position += drops[i].direction;
    }
}

setInterval(draw, 50);

window.addEventListener('resize', () => {
    initializeCanvas();
    columns = Math.floor(canvas.width / fontSize);
    drops = Array(columns).fill(0).map(() => ({
        position: Math.floor(Math.random() * canvas.height / fontSize),
        direction: Math.random() > 0.5 ? 1 : -1
    }));
});
