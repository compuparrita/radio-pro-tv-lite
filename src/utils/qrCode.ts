const dataCodewordsByVersion = [0, 19, 34, 55, 80, 108, 136, 156, 194, 232, 274];
const errorCodewordsByVersion = [0, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18];
const blockCountsByVersion = [0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4];
const alignmentPositionsByVersion: number[][] = [
    [], [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34],
    [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50],
];

function multiplyInGaloisField(x: number, y: number): number {
    let product = 0;
    for (let bit = 7; bit >= 0; bit--) {
        product = (product << 1) ^ ((product >>> 7) * 0x11d);
        product ^= ((y >>> bit) & 1) * x;
    }
    return product;
}

function reedSolomonDivisor(degree: number): number[] {
    const result = new Array<number>(degree).fill(0);
    result[degree - 1] = 1;
    let root = 1;

    for (let i = 0; i < degree; i++) {
        for (let j = 0; j < degree; j++) {
            result[j] = multiplyInGaloisField(result[j], root);
            if (j + 1 < degree) result[j] ^= result[j + 1];
        }
        root = multiplyInGaloisField(root, 2);
    }
    return result;
}

function reedSolomonRemainder(data: number[], divisor: number[]): number[] {
    const result = new Array<number>(divisor.length).fill(0);
    for (const byte of data) {
        const factor = byte ^ result.shift()!;
        result.push(0);
        divisor.forEach((coefficient, index) => {
            result[index] ^= multiplyInGaloisField(coefficient, factor);
        });
    }
    return result;
}

function appendBits(target: number[], value: number, length: number): void {
    for (let bit = length - 1; bit >= 0; bit--) {
        target.push((value >>> bit) & 1);
    }
}

function createDataCodewords(bytes: Uint8Array, version: number): number[] | null {
    const capacity = dataCodewordsByVersion[version] * 8;
    const countBits = version < 10 ? 8 : 16;
    const bits: number[] = [];

    appendBits(bits, 0b0100, 4);
    appendBits(bits, bytes.length, countBits);
    for (const byte of bytes) appendBits(bits, byte, 8);
    if (bits.length > capacity) return null;

    appendBits(bits, 0, Math.min(4, capacity - bits.length));
    while (bits.length % 8 !== 0) bits.push(0);

    const codewords: number[] = [];
    for (let i = 0; i < bits.length; i += 8) {
        codewords.push(bits.slice(i, i + 8).reduce((value, bit) => (value << 1) | bit, 0));
    }
    for (let pad = 0; codewords.length < dataCodewordsByVersion[version]; pad++) {
        codewords.push(pad % 2 === 0 ? 0xec : 0x11);
    }
    return codewords;
}

function addErrorCorrection(data: number[], version: number): number[] {
    const blockCount = blockCountsByVersion[version];
    const errorCodewords = errorCodewordsByVersion[version];
    const shortBlockLength = Math.floor(data.length / blockCount);
    const shortBlockCount = blockCount - (data.length % blockCount);
    const divisor = reedSolomonDivisor(errorCodewords);
    const blocks: number[][] = [];
    let offset = 0;

    for (let block = 0; block < blockCount; block++) {
        const dataLength = shortBlockLength + (block < shortBlockCount ? 0 : 1);
        const chunk = data.slice(offset, offset + dataLength);
        offset += dataLength;
        blocks.push([...chunk, ...reedSolomonRemainder(chunk, divisor)]);
    }

    const result: number[] = [];
    const maxDataLength = Math.max(...blocks.map((block) => block.length - errorCodewords));
    for (let i = 0; i < maxDataLength; i++) {
        for (let block = 0; block < blockCount; block++) {
            const dataLength = blocks[block].length - errorCodewords;
            if (i < dataLength) result.push(blocks[block][i]);
        }
    }
    for (let i = 0; i < errorCodewords; i++) {
        for (const block of blocks) result.push(block[block.length - errorCodewords + i]);
    }
    return result;
}

function bchRemainder(value: number, polynomial: number): number {
    let remainder = value;
    const polynomialDegree = 31 - Math.clz32(polynomial);
    while (31 - Math.clz32(remainder) >= polynomialDegree) {
        remainder ^= polynomial << ((31 - Math.clz32(remainder)) - polynomialDegree);
    }
    return remainder;
}

export function generateQrCodeMatrix(text: string): boolean[][] | null {
    const bytes = new TextEncoder().encode(text);
    let version = 1;
    let dataCodewords: number[] | null = null;
    for (; version <= 10; version++) {
        dataCodewords = createDataCodewords(bytes, version);
        if (dataCodewords) break;
    }
    if (version > 10 || !dataCodewords) return null;

    const size = version * 4 + 17;
    const modules: (boolean | null)[][] = Array.from({ length: size }, () => new Array<boolean | null>(size).fill(null));
    const functionModules = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
    const setFunctionModule = (x: number, y: number, dark: boolean) => {
        modules[y][x] = dark;
        functionModules[y][x] = true;
    };

    const drawFinder = (centerX: number, centerY: number) => {
        for (let dy = -4; dy <= 4; dy++) {
            for (let dx = -4; dx <= 4; dx++) {
                const x = centerX + dx;
                const y = centerY + dy;
                if (x >= 0 && x < size && y >= 0 && y < size) {
                    const distance = Math.max(Math.abs(dx), Math.abs(dy));
                    setFunctionModule(x, y, distance !== 2 && distance !== 4);
                }
            }
        }
    };

    drawFinder(3, 3);
    drawFinder(size - 4, 3);
    drawFinder(3, size - 4);

    for (let i = 8; i < size - 8; i++) {
        setFunctionModule(6, i, i % 2 === 0);
        setFunctionModule(i, 6, i % 2 === 0);
    }

    for (const centerY of alignmentPositionsByVersion[version]) {
        for (const centerX of alignmentPositionsByVersion[version]) {
            if (functionModules[centerY][centerX]) continue;
            for (let dy = -2; dy <= 2; dy++) {
                for (let dx = -2; dx <= 2; dx++) {
                    setFunctionModule(centerX + dx, centerY + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
                }
            }
        }
    }

    if (version >= 7) {
        const versionInfo = (version << 12) | bchRemainder(version << 12, 0x1f25);
        for (let i = 0; i < 18; i++) {
            const dark = ((versionInfo >>> i) & 1) !== 0;
            const a = size - 11 + (i % 3);
            const b = Math.floor(i / 3);
            setFunctionModule(a, b, dark);
            setFunctionModule(b, a, dark);
        }
    }

    const formatData = 0b01000;
    const formatInfo = ((formatData << 10) | bchRemainder(formatData << 10, 0x537)) ^ 0x5412;
    const formatBit = (index: number) => ((formatInfo >>> index) & 1) !== 0;
    for (let i = 0; i <= 5; i++) setFunctionModule(8, i, formatBit(i));
    setFunctionModule(8, 7, formatBit(6));
    setFunctionModule(8, 8, formatBit(7));
    setFunctionModule(7, 8, formatBit(8));
    for (let i = 9; i < 15; i++) setFunctionModule(14 - i, 8, formatBit(i));
    for (let i = 0; i < 8; i++) setFunctionModule(size - 1 - i, 8, formatBit(i));
    for (let i = 8; i < 15; i++) setFunctionModule(8, size - 15 + i, formatBit(i));
    setFunctionModule(8, size - 8, true);

    const codewords = addErrorCorrection(dataCodewords, version);
    const bits = codewords.flatMap((byte) => Array.from({ length: 8 }, (_, index) => (byte >>> (7 - index)) & 1));
    let bitIndex = 0;
    let upward = true;
    for (let right = size - 1; right >= 1; right -= 2) {
        if (right === 6) right = 5;
        for (let vert = 0; vert < size; vert++) {
            const y = upward ? size - 1 - vert : vert;
            for (let offset = 0; offset < 2; offset++) {
                const x = right - offset;
                if (functionModules[y][x]) continue;
                const bit = bitIndex < bits.length ? bits[bitIndex++] === 1 : false;
                modules[y][x] = bit !== ((x + y) % 2 === 0);
            }
        }
        upward = !upward;
    }

    return modules.map((row) => row.map((module) => module === true));
}
