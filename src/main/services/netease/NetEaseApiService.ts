import {ChildProcessWithoutNullStreams, spawn} from 'child_process';
import * as http from 'http';
import * as net from 'net';

interface NetEaseApiServiceOptions {
    port?: number;
    host?: string;
    startupTimeoutMs?: number;
}

export class NetEaseApiService {
    private readonly preferredPort: number;
    private port: number;
    private readonly host: string;
    private readonly startupTimeoutMs: number;
    private readonly healthPath = '/login/status';
    private process: ChildProcessWithoutNullStreams | null = null;
    private startedByMusicBox = false;
    private externalEndpointAdopted = false;

    constructor(options: NetEaseApiServiceOptions = {}) {
        this.preferredPort = options.port ?? 3000;
        this.port = this.preferredPort;
        this.host = options.host ?? '127.0.0.1';
        this.startupTimeoutMs = options.startupTimeoutMs ?? 45000;
    }

    get endpoint(): string {
        return `http://${this.host}:${this.port}`;
    }

    async start(): Promise<boolean> {
        if (this.process) {
            return await this.isAvailable();
        }

        if (await this.probeNetEaseApi(this.endpoint)) {
            console.log(`NetEase API already available at ${this.endpoint}`);
            return true;
        }

        const entry = this.resolveApiEntry();
        if (!entry) {
            console.warn('NetEase API dependency not found. Install NeteaseCloudMusicApi to enable automatic startup.');
            return false;
        }

        this.port = await this.findLaunchPort();
        if (this.externalEndpointAdopted) {
            console.log(`NetEase API already available at ${this.endpoint}`);
            return true;
        }
        const nodeExecutable = process.env.MUSICBOX_NETEASE_NODE || this.resolveNodeExecutable();
        const env = {
            ...process.env,
            ELECTRON_RUN_AS_NODE: '1',
            PORT: String(this.port),
            HOST: this.host,
            NO_PROXY: this.appendNoProxy(process.env.NO_PROXY || process.env.no_proxy || '')
        };

        this.process = spawn(nodeExecutable, [entry], {
            cwd: process.cwd(),
            env,
            windowsHide: true
        });
        this.startedByMusicBox = true;

        this.process.stdout.on('data', (chunk: Buffer) => {
            const message = this.sanitizeLogMessage(chunk.toString('utf8'));
            if (message) console.log(`[NetEase API] ${message}`);
        });

        this.process.stderr.on('data', (chunk: Buffer) => {
            const message = this.sanitizeLogMessage(chunk.toString('utf8'));
            if (message) console.warn(`[NetEase API] ${message}`);
        });

        this.process.once('exit', (code, signal) => {
            if (this.startedByMusicBox) {
                console.log(`NetEase API exited (code=${code ?? 'null'}, signal=${signal ?? 'null'})`);
            }
            this.process = null;
            this.startedByMusicBox = false;
        });

        const ready = await this.waitUntilReady(this.startupTimeoutMs);
        if (ready) {
            console.log(`NetEase API started at ${this.endpoint}`);
        } else {
            console.warn(`NetEase API did not become ready within ${this.startupTimeoutMs}ms`);
        }
        return ready;
    }

    async stop(): Promise<void> {
        const child = this.process;
        if (!child || !this.startedByMusicBox) {
            return;
        }

        this.startedByMusicBox = false;
        this.process = null;

        await new Promise<void>((resolve) => {
            const timeout = setTimeout(() => {
                if (!child.killed) {
                    child.kill('SIGKILL');
                }
                resolve();
            }, 3000);

            child.once('exit', () => {
                clearTimeout(timeout);
                resolve();
            });

            child.kill();
        });
    }

    async isAvailable(): Promise<boolean> {
        return this.probeNetEaseApi(this.endpoint);
    }

    private async findLaunchPort(): Promise<number> {
        for (let offset = 0; offset < 20; offset++) {
            const candidate = this.preferredPort + offset;
            const endpoint = `http://${this.host}:${candidate}`;
            if (await this.probeNetEaseApi(endpoint)) {
                this.port = candidate;
                this.externalEndpointAdopted = true;
                return candidate;
            }
            if (await this.isPortAvailable(candidate)) {
                this.externalEndpointAdopted = false;
                return candidate;
            }
        }

        this.externalEndpointAdopted = false;
        return this.preferredPort;
    }

    private isPortAvailable(port: number): Promise<boolean> {
        return this.canBindPort(port, this.host)
            .then((hostAvailable) => hostAvailable ? this.canBindPort(port, '0.0.0.0') : false);
    }

    private canBindPort(port: number, host: string): Promise<boolean> {
        return new Promise((resolve) => {
            const server = net.createServer();
            server.once('error', (error: NodeJS.ErrnoException) => {
                if (error.code === 'EADDRINUSE') {
                    resolve(false);
                    return;
                }
                resolve(false);
            });
            server.once('listening', () => {
                server.close(() => resolve(true));
            });
            server.listen(port, host);
        });
    }

    private async probeNetEaseApi(endpoint: string): Promise<boolean> {
        return new Promise((resolve) => {
            const url = `${endpoint}${this.healthPath}?timestamp=${Date.now()}`;
            const request = http.get(url, (response) => {
                let body = '';
                response.setEncoding('utf8');
                response.on('data', (chunk: string) => {
                    body += chunk;
                    if (body.length > 1024 * 1024) {
                        request.destroy();
                        resolve(false);
                    }
                });
                response.on('end', () => {
                    if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 500) {
                        resolve(false);
                        return;
                    }
                    try {
                        const data = JSON.parse(body);
                        resolve(data?.code === 200 || data?.data?.code === 200);
                    } catch {
                        resolve(false);
                    }
                });
            });

            request.setTimeout(1500, () => {
                request.destroy();
                resolve(false);
            });

            request.on('error', () => resolve(false));
        });
    }

    private async waitUntilReady(timeoutMs: number): Promise<boolean> {
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
            if (await this.isAvailable()) {
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        return false;
    }

    private resolveApiEntry(): string | null {
        try {
            return require.resolve('NeteaseCloudMusicApi/app.js');
        } catch {
            return null;
        }
    }

    private resolveNodeExecutable(): string {
        return process.execPath;
    }

    private appendNoProxy(current: string): string {
        const values = current
            .split(',')
            .map(value => value.trim())
            .filter(Boolean);
        for (const value of ['localhost', '127.0.0.1']) {
            if (!values.includes(value)) {
                values.push(value);
            }
        }
        return values.join(',');
    }

    private sanitizeLogMessage(message: string): string {
        const trimmed = message.trim();
        if (!trimmed) {
            return '';
        }

        return trimmed
            .replace(/cookie=[^ ]+/gi, 'cookie=[redacted]')
            .replace(/MUSIC_[A-Z_]+=[^;,\s]+/g, match => `${match.split('=')[0]}=[redacted]`)
            .replace(/__csrf=[^;,\s]+/g, '__csrf=[redacted]')
            .slice(0, 600);
    }
}
