const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text({ type: '*/*' }));

// Universal CORS configuration
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Build Logic Text Panel sequence (A to Z) -> [Shift, I5, I4, I3, I2, I1, I0]
const ALPHABET_SEQUENCE = Object.freeze([
    "1000001", // A
    "1000010", // B
    "1000011", // C
    "1000100", // D
    "1000101", // E
    "1000110", // F
    "1000111", // G
    "1001000", // H
    "1001001", // I
    "1001010", // J
    "1001011", // K
    "1001100", // L
    "1001101", // M
    "1001110", // N
    "1001111", // O
    "1010000", // P
    "1010001", // Q
    "1010010", // R
    "1010011", // S
    "1010100", // T
    "1010101", // U
    "1010110", // V
    "1010111", // W
    "1011000", // X
    "1011001", // Y
    "1011011"  // Z
]);

const SEQUENCE_MAP = Object.freeze(
    ALPHABET_SEQUENCE.reduce((acc, bin, idx) => {
        acc[bin] = idx;
        return acc;
    }, {})
);

app.get('/', (req, res) => {
    res.status(200).send("Build Logic Webhook Server Active");
});

app.post('/', (req, res) => {
    let rawValue;

    if (typeof req.body === 'object' && req.body !== null) {
        rawValue = req.body.value;
    } else if (typeof req.body === 'string') {
        try {
            let parsed = JSON.parse(req.body);
            if (typeof parsed === 'string') parsed = JSON.parse(parsed);
            rawValue = parsed ? parsed.value : req.body;
        } catch (e) {
            rawValue = req.body;
        }
    }

    if (rawValue === undefined || rawValue === null) {
        res.setHeader('Content-Type', 'application/json');
        return res.status(400).send(JSON.stringify({ error: "Missing value parameter" }));
    }

    const inputStr = String(rawValue).trim();

    if (inputStr.length < 8 || !/^[01]+$/.test(inputStr)) {
        res.setHeader('Content-Type', 'application/json');
        return res.status(400).send(JSON.stringify({ error: "Invalid payload" }));
    }

    // Extract wire inputs: [I0, I1, I2, I3, I4, I5, SHIFT, Unused]
    const i0    = inputStr.charAt(0);
    const i1    = inputStr.charAt(1);
    const i2    = inputStr.charAt(2);
    const i3    = inputStr.charAt(3);
    const i4    = inputStr.charAt(4);
    const i5    = inputStr.charAt(5);
    const shift = inputStr.charAt(6); // 7th bit
    const bit8  = inputStr.charAt(7); // 8th unused bit

    // Convert to standard binary: [SHIFT, I5, I4, I3, I2, I1, I0]
    const currentStdBinary = `${shift}${i5}${i4}${i3}${i2}${i1}${i0}`;

    const currentIndex = SEQUENCE_MAP[currentStdBinary];

    let nextIndex = 0;
    if (currentIndex !== undefined && currentIndex < ALPHABET_SEQUENCE.length - 1) {
        nextIndex = currentIndex + 1;
    }

    const nextStdBits = ALPHABET_SEQUENCE[nextIndex];

    const nextShift = nextStdBits.charAt(0);
    const nextI5    = nextStdBits.charAt(1);
    const nextI4    = nextStdBits.charAt(2);
    const nextI3    = nextStdBits.charAt(3);
    const nextI2    = nextStdBits.charAt(4);
    const nextI1    = nextStdBits.charAt(5);
    const nextI0    = nextStdBits.charAt(6);

    // Reconstruct output in wire order: [I0, I1, I2, I3, I4, I5, SHIFT, Unused]
    const outputValue = `${nextI0}${nextI1}${nextI2}${nextI3}${nextI4}${nextI5}${nextShift}${bit8}`;

    // Force strict minified JSON response
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({ value: outputValue }));
});

// Port Binding Fix for Render
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, '0.0.0.0', () => console.log(`Build Logic Render server listening on port ${PORT}`));

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));
