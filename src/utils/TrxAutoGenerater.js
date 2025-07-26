let lastTimestamp = 0;
let counter = 0;

export function genNumericTrxIdUnique() {
    const now = Date.now(); // current time in ms

    if (now === lastTimestamp) {
        counter++;
    } else {
        counter = 0;
        lastTimestamp = now;
    }

    const randomPart = Math.floor(Math.random() * 1e6); // 6-digit random number
    const counterPart = counter.toString().padStart(3, '0'); // pad to 6 digits
    let lastTenDigit = now % 10000000000

    return `${lastTenDigit}${counterPart}${randomPart}`;
}

export function genAplhaNumTrxIdUnique() {
    const now = Date.now(); // current time in ms
    const chars = 'abcdefghijklmnopqrstuvwxyz';

    let genAplha = '';
    for (let i = 0; i < 6; i++) {
        genAplha += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    if (now === lastTimestamp) {
        counter++;
    } else {
        counter = 0;
        lastTimestamp = now;
    }

    const randomPart = Math.floor(Math.random() * 1e6); // 6-digit random number
    const counterPart = counter.toString().padStart(2, '0'); // pad to 6 digits
    let lastNineDigit = now % 10000000

    return `T${genAplha}${lastNineDigit}${counterPart}${randomPart}`
}