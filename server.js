const express = require('express');
const app = express();

// Body parsers to handle any format Roblox sends
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text({ type: '*/*' }));

// Universal CORS headers
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

// A-Z Binary Mapping: [Shift, I5, I4, I3, I2, I1, I0]
const ALPHABET_SEQUENCE = Object.freeze([
    "1000001", "1000010", "1000011", "1000100", "1000101", "1000110", "1000111",
    "1001000", "1001001", "1001010", "1001011", "1001100", "1001101", "1001110",
    "1001111", "1010000", "1010001", "1010010", "1010011", "1010100", "1010101",
    "1010110", "1010111", "1011000", "1011001", "1011011"
]);

const SEQUENCE_MAP = Object.freeze(
    ALPHABET_SEQUENCE.reduce((acc, bin, idx) => {
        acc[bin] = idx;
        return acc;
    }, {})
);

// Health check endpoint
app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(JSON.stringify({ status: "active" }));
});

// Primary POST endpoint
app.post('/', (req, res) => {
    res.setHeader('Content-Type', 'application/json');

    let rawValue = null;

    if (typeof req.body === 'object' && req.body !== null) {
        rawValue = req.body.value || req.body.data || req.body.input;
    } else if (typeof req.body === 'string') {
        try {
            let parsed = JSON.parse(req.body);
            if (typeof parsed === 'string') parsed = JSON.parse(parsed);
            rawValue = parsed ? (parsed.value || parsed.data || parsed.input) : req.body;
        } catch (e) {
            rawValue = req.body;
        }
    }

    // Default fallback to letter 'A' signal when payload is empty or invalid
    let inputStr = rawValue ? String(rawValue).trim() : "10000010";
    if (inputStr.length < 8 || !/^[01]+$/.test(inputStr)) {
        inputStr = "10000010";
    }

    // Unpack bits: [I0, I1, I2, I3, I4, I5, SHIFT, Unused]
    const i0    = inputStr.charAt(0);
    const i1    = inputStr.charAt(1);
    const i2    = inputStr.charAt(2);
    const i3    = inputStr.charAt(3);
    const i4    = inputStr.charAt(4);
    const i5    = inputStr.charAt(5);
    const shift = inputStr.charAt(6);
    const bit8  = inputStr.charAt(7);

    // Reconstruct standard binary key: [SHIFT, I5, I4, I3, I2, I1, I0]
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

    // Pack output wire format: [I0, I1, I2, I3, I4, I5, SHIFT, Unused]
    const outputValue = `${nextI0}${nextI1}${nextI2}${nextI3}${nextI4}${nextI5}${nextShift}${bit8}`;

    // Minified JSON output guaranteed
    return res.status(200).send(JSON.stringify({ value: outputValue }));
});

// Render Port Binding Fix
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server live on port ${PORT}`));
