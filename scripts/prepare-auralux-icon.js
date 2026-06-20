const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const root = path.resolve(__dirname, '..');
const inputPath = path.join(root, 'assets', 'brand', 'auralux-logo-mascot.png');
const outputPath = path.join(root, 'assets', 'brand', 'auralux-icon.png');

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function crc32(buffer) {
    let crc = 0xffffffff;
    for (let index = 0; index < buffer.length; index += 1) {
        crc ^= buffer[index];
        for (let bit = 0; bit < 8; bit += 1) {
            crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
        }
    }
    return (crc ^ 0xffffffff) >>> 0;
}

function readPng(filePath) {
    const buffer = fs.readFileSync(filePath);
    if (!buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
        throw new Error('Input is not a PNG file.');
    }

    let width = 0;
    let height = 0;
    let bitDepth = 0;
    let colorType = 0;
    const idatChunks = [];

    for (let offset = PNG_SIGNATURE.length; offset < buffer.length;) {
        const length = buffer.readUInt32BE(offset);
        const type = buffer.toString('ascii', offset + 4, offset + 8);
        const data = buffer.subarray(offset + 8, offset + 8 + length);
        offset += 12 + length;

        if (type === 'IHDR') {
            width = data.readUInt32BE(0);
            height = data.readUInt32BE(4);
            bitDepth = data[8];
            colorType = data[9];
        } else if (type === 'IDAT') {
            idatChunks.push(data);
        } else if (type === 'IEND') {
            break;
        }
    }

    if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6)) {
        throw new Error(`Unsupported PNG format: bitDepth=${bitDepth}, colorType=${colorType}. Expected 8-bit RGB or RGBA.`);
    }

    const inputBytesPerPixel = colorType === 6 ? 4 : 3;
    const outputBytesPerPixel = 4;
    const inputStride = width * inputBytesPerPixel;
    const outputStride = width * outputBytesPerPixel;
    const inflated = zlib.inflateSync(Buffer.concat(idatChunks));
    const scanlines = Buffer.alloc(width * height * inputBytesPerPixel);

    let inputOffset = 0;
    for (let y = 0; y < height; y += 1) {
        const filter = inflated[inputOffset];
        inputOffset += 1;
        const row = inflated.subarray(inputOffset, inputOffset + inputStride);
        inputOffset += inputStride;
        const outputOffset = y * inputStride;

        for (let x = 0; x < inputStride; x += 1) {
            const left = x >= inputBytesPerPixel ? scanlines[outputOffset + x - inputBytesPerPixel] : 0;
            const up = y > 0 ? scanlines[outputOffset + x - inputStride] : 0;
            const upLeft = y > 0 && x >= inputBytesPerPixel ? scanlines[outputOffset + x - inputStride - inputBytesPerPixel] : 0;
            const raw = row[x];

            let value;
            if (filter === 0) {
                value = raw;
            } else if (filter === 1) {
                value = raw + left;
            } else if (filter === 2) {
                value = raw + up;
            } else if (filter === 3) {
                value = raw + Math.floor((left + up) / 2);
            } else if (filter === 4) {
                const p = left + up - upLeft;
                const pa = Math.abs(p - left);
                const pb = Math.abs(p - up);
                const pc = Math.abs(p - upLeft);
                value = raw + (pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft);
            } else {
                throw new Error(`Unsupported PNG row filter: ${filter}.`);
            }

            scanlines[outputOffset + x] = value & 0xff;
        }
    }

    const pixels = Buffer.alloc(width * height * outputBytesPerPixel);
    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const inputOffset = y * inputStride + x * inputBytesPerPixel;
            const outputOffset = y * outputStride + x * outputBytesPerPixel;
            pixels[outputOffset] = scanlines[inputOffset];
            pixels[outputOffset + 1] = scanlines[inputOffset + 1];
            pixels[outputOffset + 2] = scanlines[inputOffset + 2];
            pixels[outputOffset + 3] = colorType === 6 ? scanlines[inputOffset + 3] : 255;
        }
    }

    return {width, height, data: pixels};
}

function writeChunk(type, data) {
    const typeBuffer = Buffer.from(type, 'ascii');
    const chunk = Buffer.alloc(12 + data.length);
    chunk.writeUInt32BE(data.length, 0);
    typeBuffer.copy(chunk, 4);
    data.copy(chunk, 8);
    chunk.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 8 + data.length);
    return chunk;
}

function writePng(filePath, image) {
    const bytesPerPixel = 4;
    const stride = image.width * bytesPerPixel;
    const raw = Buffer.alloc((stride + 1) * image.height);

    for (let y = 0; y < image.height; y += 1) {
        const rowOffset = y * (stride + 1);
        raw[rowOffset] = 0;
        image.data.copy(raw, rowOffset + 1, y * stride, y * stride + stride);
    }

    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(image.width, 0);
    ihdr.writeUInt32BE(image.height, 4);
    ihdr[8] = 8;
    ihdr[9] = 6;
    ihdr[10] = 0;
    ihdr[11] = 0;
    ihdr[12] = 0;

    fs.writeFileSync(filePath, Buffer.concat([
        PNG_SIGNATURE,
        writeChunk('IHDR', ihdr),
        writeChunk('IDAT', zlib.deflateSync(raw)),
        writeChunk('IEND', Buffer.alloc(0))
    ]));
}

const input = readPng(inputPath);
const { width, height, data } = input;
const visited = new Uint8Array(width * height);
const queue = [];

function indexOf(x, y) {
    return y * width + x;
}

function pixelOffset(x, y) {
    return indexOf(x, y) * 4;
}

function isBackgroundPixel(x, y) {
    const offset = pixelOffset(x, y);
    const alpha = data[offset + 3];
    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];

    return alpha > 0 && red <= 24 && green <= 24 && blue <= 24;
}

function enqueue(x, y) {
    if (x < 0 || y < 0 || x >= width || y >= height) {
        return;
    }

    const index = indexOf(x, y);
    if (visited[index] || !isBackgroundPixel(x, y)) {
        return;
    }

    visited[index] = 1;
    queue.push([x, y]);
}

for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
}

for (let y = 0; y < height; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
}

for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const [x, y] = queue[cursor];
    const offset = pixelOffset(x, y);
    data[offset] = 0;
    data[offset + 1] = 0;
    data[offset + 2] = 0;
    data[offset + 3] = 0;

    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
}

writePng(outputPath, input);
console.log(`Prepared Auralux transparent icon source: ${path.relative(root, outputPath)} (${queue.length} pixels cleared)`);
