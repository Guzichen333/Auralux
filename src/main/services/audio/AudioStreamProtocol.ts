import {protocol} from 'electron';
import * as fs from 'fs';
import {Readable} from 'stream';
import {assertReadableAudioFilePath} from '../../utils/audioFileSecurity';
import type {NetworkFileAdapter} from '../network/NetworkFileAdapter';

const AUDIO_STREAM_SCHEME = 'musicbox-audio';
const MAX_REMOTE_AUDIO_REDIRECTS = 3;
const REMOTE_AUDIO_FETCH_TIMEOUT_MS = 15000;
const REMOTE_AUDIO_ALLOWED_HOST_PATTERNS = [
    /(^|\.)music\.126\.net$/i,
    /(^|\.)music\.163\.com$/i,
    /(^|\.)vod\.126\.net$/i
];

let networkFileAdapter: NetworkFileAdapter | null = null;
let isRegistered = false;

function encodeAudioPath(filePath: string): string {
    return Buffer.from(filePath, 'utf8').toString('base64url');
}

function decodeAudioPath(encodedPath: string): string {
    return Buffer.from(encodedPath, 'base64url').toString('utf8');
}

function isHttpUrl(value: string): boolean {
    return value.startsWith('http://') || value.startsWith('https://');
}

function isPrivateOrLocalAddress(hostname: string): boolean {
    const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (!host || host === 'localhost' || host.endsWith('.localhost')) {
        return true;
    }

    const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4) {
        const parts = ipv4.slice(1).map(Number);
        if (parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) {
            return true;
        }
        const [a, b] = parts;
        return a === 0
            || a === 10
            // 127.0.0.0/8 loopback
            || a === 127
            // 169.254.0.0/16 link-local
            || a === 169 && b === 254
            || a === 172 && b >= 16 && b <= 31
            || a === 192 && b === 168;
    }

    return host === '::1'
        || host === '0:0:0:0:0:0:0:1'
        || host.startsWith('fc')
        || host.startsWith('fd')
        || host.startsWith('fe80:');
}

function validateRemoteAudioUrl(remoteUrl: string): URL {
    let url: URL;
    try {
        url = new URL(remoteUrl);
    } catch {
        throw new Error('Invalid remote audio URL');
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error('Unsupported remote audio URL protocol');
    }

    if (url.username || url.password) {
        throw new Error('Remote audio URL credentials are not allowed');
    }

    if (isPrivateOrLocalAddress(url.hostname)) {
        throw new Error('Remote audio URL host is not allowed');
    }

    if (!REMOTE_AUDIO_ALLOWED_HOST_PATTERNS.some(pattern => pattern.test(url.hostname))) {
        throw new Error('Remote audio URL host is not in the NetEase allowlist');
    }

    return url;
}

function sanitizeRemoteAudioUrlForLog(remoteUrl: string): string {
    try {
        const url = new URL(remoteUrl);
        return `${url.origin}${url.pathname}`;
    } catch {
        return '[invalid remote audio url]';
    }
}

function buildRemoteAudioRequestHeaders(request: Request): Headers {
    const headers = new Headers();
    for (const headerName of ['accept', 'accept-language', 'range', 'user-agent']) {
        const value = request.headers.get(headerName);
        if (value) {
            headers.set(headerName, value);
        }
    }

    // NetEase CDN links are signed, but some edge nodes still expect a music.163.com page context.
    headers.set('Referer', 'https://music.163.com/');
    headers.set('Origin', 'https://music.163.com');
    return headers;
}

function inferAudioMimeType(filePath: string): string {
    const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase();

    switch (ext) {
        case '.mp3':
            return 'audio/mpeg';
        case '.flac':
            return 'audio/flac';
        case '.wav':
            return 'audio/wav';
        case '.m4a':
        case '.mp4':
        case '.aac':
            return 'audio/mp4';
        case '.ogg':
        case '.oga':
            return 'audio/ogg';
        case '.webm':
            return 'audio/webm';
        default:
            return 'application/octet-stream';
    }
}

function buildBaseHeaders(filePath: string, size: number): Headers {
    const headers = new Headers();
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Expose-Headers', 'Accept-Ranges, Content-Length, Content-Range, Content-Type');
    headers.set('Access-Control-Allow-Headers', 'Range, Content-Type');
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Cache-Control', 'no-store');
    headers.set('Content-Type', inferAudioMimeType(filePath));
    headers.set('Content-Length', String(size));
    headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
    return headers;
}

function parseRangeHeader(rangeHeader: string, size: number): {start: number; end: number} | null {
    const match = /^bytes=(\d+)-(\d*)$/i.exec(rangeHeader.trim());
    if (!match) {
        return null;
    }

    const start = Number(match[1]);
    const end = match[2] ? Number(match[2]) : size - 1;

    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start) {
        return null;
    }

    return {
        start: Math.min(start, Math.max(0, size - 1)),
        end: Math.min(end, Math.max(0, size - 1))
    };
}

async function serveLocalAudio(filePath: string, request: Request): Promise<Response> {
    const stat = await fs.promises.stat(filePath);
    const rangeHeader = request.headers.get('range');
    const headers = buildBaseHeaders(filePath, stat.size);

    if (request.method === 'HEAD') {
        return new Response(null, {status: 200, headers});
    }

    if (!rangeHeader) {
        const stream = fs.createReadStream(filePath);
        return new Response(Readable.toWeb(stream), {status: 200, headers});
    }

    const range = parseRangeHeader(rangeHeader, stat.size);
    if (!range) {
        headers.set('Content-Range', `bytes */${stat.size}`);
        return new Response(null, {status: 416, headers});
    }

    const {start, end} = range;
    headers.set('Content-Length', String(end - start + 1));
    headers.set('Content-Range', `bytes ${start}-${end}/${stat.size}`);

    const stream = fs.createReadStream(filePath, {start, end});
    return new Response(Readable.toWeb(stream), {status: 206, headers});
}

async function serveNetworkAudio(filePath: string, request: Request): Promise<Response> {
    if (!networkFileAdapter) {
        throw new Error('Network file adapter is not available');
    }

    const buffer = await networkFileAdapter.readFile(filePath);
    const headers = buildBaseHeaders(filePath, buffer.byteLength);
    if (request.method === 'HEAD') {
        return new Response(null, {status: 200, headers});
    }

    const rangeHeader = request.headers.get('range');
    if (!rangeHeader) {
        return new Response(buffer, {status: 200, headers});
    }

    const range = parseRangeHeader(rangeHeader, buffer.byteLength);
    if (!range) {
        headers.set('Content-Range', `bytes */${buffer.byteLength}`);
        return new Response(null, {status: 416, headers});
    }

    const {start, end} = range;
    const slice = buffer.slice(start, end + 1);
    headers.set('Content-Length', String(slice.byteLength));
    headers.set('Content-Range', `bytes ${start}-${end}/${buffer.byteLength}`);
    return new Response(slice, {status: 206, headers});
}

async function fetchValidatedRemoteAudio(remoteUrl: string, request: Request, redirects = 0): Promise<Response> {
    const url = validateRemoteAudioUrl(remoteUrl);
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), REMOTE_AUDIO_FETCH_TIMEOUT_MS);

    let upstreamResponse: Response;
    try {
        upstreamResponse = await fetch(remoteUrl, {
            method: request.method,
            headers: buildRemoteAudioRequestHeaders(request),
            redirect: 'manual',
            signal: abortController.signal
        });
    } finally {
        clearTimeout(timeoutId);
    }

    if (upstreamResponse.status >= 300 && upstreamResponse.status < 400) {
        const location = upstreamResponse.headers.get('location');
        if (!location) {
            return upstreamResponse;
        }
        if (redirects >= MAX_REMOTE_AUDIO_REDIRECTS) {
            throw new Error('Too many remote audio redirects');
        }
        const redirectUrl = new URL(location, url).toString();
        validateRemoteAudioUrl(redirectUrl);
        return await fetchValidatedRemoteAudio(redirectUrl, request, redirects + 1);
    }

    return upstreamResponse;
}

async function serveRemoteAudio(remoteUrl: string, request: Request): Promise<Response> {
    if (!isHttpUrl(remoteUrl)) {
        return new Response('Unsupported remote audio source', {status: 400});
    }

    let upstreamResponse: Response;
    try {
        upstreamResponse = await fetchValidatedRemoteAudio(remoteUrl, request);
    } catch (error) {
        console.warn('NetEase remote audio proxy rejected URL', {
            error: error instanceof Error ? error.message : String(error),
            url: sanitizeRemoteAudioUrlForLog(remoteUrl)
        });
        return new Response('Unsupported remote audio source', {status: 400});
    }

    const headers = new Headers(upstreamResponse.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Expose-Headers', 'Accept-Ranges, Content-Length, Content-Range, Content-Type');
    headers.set('Cross-Origin-Resource-Policy', 'cross-origin');

    if (!upstreamResponse.ok) {
        console.warn('NetEase remote audio proxy upstream returned non-OK status', {
            status: upstreamResponse.status,
            statusText: upstreamResponse.statusText,
            contentType: upstreamResponse.headers.get('content-type'),
            url: sanitizeRemoteAudioUrlForLog(remoteUrl)
        });
    }

    if (request.method === 'HEAD') {
        return new Response(null, {
            status: upstreamResponse.status,
            statusText: upstreamResponse.statusText,
            headers
        });
    }

    return new Response(upstreamResponse.body, {
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        headers
    });
}

async function handleAudioStreamRequest(request: Request): Promise<Response> {
    if (!request.url.startsWith(`${AUDIO_STREAM_SCHEME}:`)) {
        return new Response('Unsupported audio stream request', {status: 400});
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
        return new Response(null, {status: 405});
    }

    const url = new URL(request.url);
    if (url.host === 'remote') {
        const encodedRemoteUrl = url.pathname.replace(/^\/+/, '');
        if (!encodedRemoteUrl) {
            return new Response('Missing remote audio source', {status: 400});
        }

        const remoteUrl = decodeAudioPath(encodedRemoteUrl);
        return await serveRemoteAudio(remoteUrl, request);
    }

    const encodedPath = url.pathname.replace(/^\/+/, '');
    if (!encodedPath) {
        return new Response('Missing audio path', {status: 400});
    }

    const filePath = decodeAudioPath(encodedPath);
    const isNetworkPath = networkFileAdapter?.isNetworkPath(filePath) ?? false;
    assertReadableAudioFilePath(filePath, isNetworkPath);

    if (isNetworkPath) {
        return await serveNetworkAudio(filePath, request);
    }

    return await serveLocalAudio(filePath, request);
}

export function registerAudioStreamProtocol(adapter: NetworkFileAdapter): void {
    networkFileAdapter = adapter;

    if (isRegistered) {
        return;
    }

    protocol.handle(AUDIO_STREAM_SCHEME, async (request) => {
        try {
            return await handleAudioStreamRequest(request);
        } catch (error) {
            console.error('❌ 音频流协议处理失败:', error);
            return new Response('Failed to serve audio stream', {status: 500});
        }
    });

    isRegistered = true;
    console.log('✅ 音频流协议已注册');
}

export function createAudioStreamUrl(filePath: string, isNetworkPath: boolean): string {
    assertReadableAudioFilePath(filePath, isNetworkPath);
    return `${AUDIO_STREAM_SCHEME}://audio/${encodeAudioPath(filePath)}`;
}

export function createRemoteAudioStreamUrl(remoteUrl: string): string {
    validateRemoteAudioUrl(remoteUrl);

    return `${AUDIO_STREAM_SCHEME}://remote/${encodeAudioPath(remoteUrl)}`;
}

export function getAudioStreamScheme(): string {
    return AUDIO_STREAM_SCHEME;
}
