// Minimal, zero-dependency ISO/IEC 18004 QR Code matrix generator (Byte mode, ECC Level L, Versions 1..6, up to 134 bytes)

const VERSION_PARAMS: Record<number, { size: number; totalCodewords: number; ecCodewords: number; align: number[] }> = {
    1: { size: 21, totalCodewords: 26, ecCodewords: 7, align: [] },
    2: { size: 25, totalCodewords: 44, ecCodewords: 10, align: [6, 18] },
    3: { size: 29, totalCodewords: 70, ecCodewords: 15, align: [6, 22] },
    4: { size: 33, totalCodewords: 100, ecCodewords: 20, align: [6, 26] },
    5: { size: 37, totalCodewords: 134, ecCodewords: 26, align: [6, 30] },
    6: { size: 41, totalCodewords: 172, ecCodewords: 36, align: [6, 34] }, // 2 blocks of (68 data, 18 ec)
};

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
    let x = 1;
    for (let i = 0; i < 255; i++) {
        GF_EXP[i] = x;
        GF_LOG[x] = i;
        x <<= 1;
        if (x & 0x100) x ^= 0x11d;
    }
    for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
})();

const gfMul = (a: number, b: number) => (a === 0 || b === 0 ? 0 : GF_EXP[GF_LOG[a] + GF_LOG[b]]);

const rsGeneratorPoly = (degree: number): Uint8Array => {
    let poly = new Uint8Array([1]);
    for (let i = 0; i < degree; i++) {
        const next = new Uint8Array(poly.length + 1);
        for (let j = 0; j < poly.length; j++) {
            next[j] ^= poly[j];
            next[j + 1] ^= gfMul(poly[j], GF_EXP[i]);
        }
        poly = next;
    }
    return poly;
};

const rsEncode = (data: Uint8Array, ecLen: number): Uint8Array => {
    const gen = rsGeneratorPoly(ecLen);
    const rem = new Uint8Array(ecLen);
    for (let i = 0; i < data.length; i++) {
        const factor = data[i] ^ rem[0];
        rem.copyWithin(0, 1);
        rem[ecLen - 1] = 0;
        for (let j = 0; j < ecLen; j++) {
            rem[j] ^= gfMul(gen[j + 1], factor);
        }
    }
    return rem;
};

export function generateQRMatrix(text: string): boolean[][] {
    const bytes = new TextEncoder().encode(text);
    let version = 1;
    while (version <= 6) {
        const p = VERSION_PARAMS[version];
        const dataCapacity = p.totalCodewords - p.ecCodewords - 2;
        if (bytes.length <= dataCapacity) break;
        version++;
    }
    if (version > 6) version = 6;
    const { size, totalCodewords, ecCodewords, align } = VERSION_PARAMS[version];
    const dataCodewordsLen = totalCodewords - ecCodewords;

    // Build bit stream: Byte mode (0100) + 8-bit length + bytes + terminator
    const bits: number[] = [];
    const pushBits = (val: number, len: number) => {
        for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1);
    };
    pushBits(0b0100, 4);
    pushBits(Math.min(bytes.length, dataCodewordsLen - 2), 8);
    for (let i = 0; i < Math.min(bytes.length, dataCodewordsLen - 2); i++) pushBits(bytes[i], 8);
    const maxBits = dataCodewordsLen * 8;
    pushBits(0, Math.min(4, maxBits - bits.length));
    while (bits.length % 8 !== 0) bits.push(0);

    const dataCodewords = new Uint8Array(dataCodewordsLen);
    for (let i = 0; i < bits.length / 8; i++) {
        let b = 0;
        for (let j = 0; j < 8; j++) b = (b << 1) | bits[i * 8 + j];
        dataCodewords[i] = b;
    }
    let padByte = 0xec;
    for (let i = bits.length / 8; i < dataCodewordsLen; i++) {
        dataCodewords[i] = padByte;
        padByte = padByte === 0xec ? 0x11 : 0xec;
    }

    let finalCodewords: Uint8Array;
    if (version === 6) {
        // Version 6-L has 2 blocks: each 68 data codewords + 18 EC codewords
        const b1 = dataCodewords.slice(0, 68);
        const b2 = dataCodewords.slice(68, 136);
        const ec1 = rsEncode(b1, 18);
        const ec2 = rsEncode(b2, 18);
        finalCodewords = new Uint8Array(totalCodewords);
        let idx = 0;
        for (let i = 0; i < 68; i++) { finalCodewords[idx++] = b1[i]; finalCodewords[idx++] = b2[i]; }
        for (let i = 0; i < 18; i++) { finalCodewords[idx++] = ec1[i]; finalCodewords[idx++] = ec2[i]; }
    } else {
        const ec = rsEncode(dataCodewords, ecCodewords);
        finalCodewords = new Uint8Array(totalCodewords);
        finalCodewords.set(dataCodewords, 0);
        finalCodewords.set(ec, dataCodewordsLen);
    }

    const modules: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
    const isFunc: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

    const setFunc = (r: number, c: number, val: boolean) => {
        if (r >= 0 && r < size && c >= 0 && c < size) {
            modules[r][c] = val;
            isFunc[r][c] = true;
        }
    };

    // Finder patterns + separators
    const drawFinder = (r0: number, c0: number) => {
        for (let dy = -1; dy <= 7; dy++) {
            for (let dx = -1; dx <= 7; dx++) {
                const d = Math.max(Math.abs(dx - 3), Math.abs(dy - 3));
                setFunc(r0 + dy, c0 + dx, d !== 2 && d !== 4);
            }
        }
    };
    drawFinder(0, 0);
    drawFinder(0, size - 7);
    drawFinder(size - 7, 0);

    // Timing patterns
    for (let i = 8; i < size - 8; i++) {
        setFunc(6, i, i % 2 === 0);
        setFunc(i, 6, i % 2 === 0);
    }

    // Alignment patterns
    for (const r of align) {
        for (const c of align) {
            if ((r === 6 && c === 6) || (r === 6 && c === size - 7) || (r === size - 7 && c === 6)) continue;
            for (let dy = -2; dy <= 2; dy++) {
                for (let dx = -2; dx <= 2; dx++) {
                    setFunc(r + dy, c + dx, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
                }
            }
        }
    }

    // Reserve format areas + dark module
    for (let i = 0; i <= 8; i++) {
        if (!isFunc[8][i]) setFunc(8, i, false);
        if (!isFunc[i][8]) setFunc(i, 8, false);
        if (i < 8) {
            setFunc(8, size - 1 - i, false);
            setFunc(size - 1 - i, 8, false);
        }
    }
    setFunc(size - 8, 8, true);

    // Place data bits (zigzag from bottom-right)
    let bitIdx = 0;
    const totalBits = finalCodewords.length * 8;
    for (let right = size - 1; right >= 1; right -= 2) {
        if (right === 6) right = 5;
        for (let vert = 0; vert < size; vert++) {
            for (let j = 0; j < 2; j++) {
                const c = right - j;
                const upward = ((right + 1) & 2) === 0;
                const r = upward ? size - 1 - vert : vert;
                if (!isFunc[r][c]) {
                    let bit = false;
                    if (bitIdx < totalBits) {
                        bit = ((finalCodewords[bitIdx >>> 3] >>> (7 - (bitIdx & 7))) & 1) !== 0;
                        bitIdx++;
                    }
                    // Mask 0: (r + c) % 2 === 0
                    if ((r + c) % 2 === 0) bit = !bit;
                    modules[r][c] = bit;
                }
            }
        }
    }

    // Format bits for ECC Level L (01) and Mask 0 (000) -> precomputed BCH format word = 0x77c4 (30660)
    const formatWord = 0x77c4;
    const getFormatBit = (i: number) => ((formatWord >>> i) & 1) !== 0;
    for (let i = 0; i <= 5; i++) setFunc(8, i, getFormatBit(i));
    setFunc(8, 7, getFormatBit(6));
    setFunc(8, 8, getFormatBit(7));
    setFunc(7, 8, getFormatBit(8));
    for (let i = 9; i < 15; i++) setFunc(14 - i, 8, getFormatBit(i));
    for (let i = 0; i < 8; i++) setFunc(8, size - 1 - i, getFormatBit(i));
    for (let i = 8; i < 15; i++) setFunc(size - 15 + i, 8, getFormatBit(i));

    return modules;
}
