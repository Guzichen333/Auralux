import type {NetEaseConfig} from '../types';

const DEFAULT_CONFIG: NetEaseConfig = {
    apiEndpoint: 'http://127.0.0.1:3000'
};

class NetEaseApiClient {
    private config: NetEaseConfig;
    private cookie: string = '';
    private readonly requestTimeoutMs = 8000;

    constructor(config: Partial<NetEaseConfig> = {}) {
        this.config = {...DEFAULT_CONFIG, ...config};
        this.loadCookie();
    }

    get apiEndpoint(): string {
        return this.config.apiEndpoint;
    }

    setApiEndpoint(endpoint: string): void {
        if (!endpoint) {
            return;
        }
        this.config = {...this.config, apiEndpoint: endpoint};
    }

    get isAuthenticated(): boolean {
        return this.cookie.length > 0;
    }

    get currentCookie(): string {
        return this.cookie;
    }

    hasAccountCookie(): boolean {
        return /(?:^|;\s*)MUSIC_(?:U|A)=/.test(this.cookie);
    }

    setCookie(cookie: string): void {
        if (!cookie) {
            return;
        }
        this.cookie = cookie;
        this.saveCookie();
    }

    adoptResponseCookie(data: unknown): void {
        const cookie = this.extractCookie(data);
        if (cookie) {
            this.setCookie(cookie);
        }
    }

    clearCookie(): void {
        this.cookie = '';
        try {
            localStorage.removeItem('netease-cookie');
        } catch {
            // ignore
        }
    }

    private loadCookie(): void {
        try {
            const stored = localStorage.getItem('netease-cookie');
            if (stored) {
                this.cookie = stored;
            }
        } catch {
            // ignore
        }
    }

    private saveCookie(): void {
        try {
            localStorage.setItem('netease-cookie', this.cookie);
        } catch {
            // ignore
        }
    }

    private extractCookie(data: unknown): string {
        if (!data || typeof data !== 'object') {
            return '';
        }

        const value = (data as {cookie?: unknown; _cookie?: unknown}).cookie
            ?? (data as {cookie?: unknown; _cookie?: unknown})._cookie;
        if (Array.isArray(value)) {
            return value.filter((item): item is string => typeof item === 'string' && item.length > 0).join(';');
        }
        return typeof value === 'string' ? value : '';
    }

    private async fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
        return await fetch(url, {
            ...init,
            signal: init.signal || AbortSignal.timeout(this.requestTimeoutMs)
        });
    }

    async get<T = any>(path: string, params: Record<string, string> = {}): Promise<T | null> {
        const requestParams = {...params};
        if (this.cookie && !requestParams.cookie && requestParams.skipCookie !== 'true') {
            requestParams.cookie = this.cookie;
        }
        delete requestParams.skipCookie;

        const queryString = new URLSearchParams(requestParams).toString();
        const url = `${this.config.apiEndpoint}${path}${queryString ? '?' + queryString : ''}`;

        try {
            const response = await this.fetchWithTimeout(url);
            const data = await response.json();

            const setCookie = response.headers.get('set-cookie');
            if (setCookie) {
                this.cookie = setCookie;
                this.saveCookie();
            }
            this.adoptResponseCookie(data);

            return data;
        } catch (e: any) {
            console.error('NetEase API error:', path, e.message);
            return null;
        }
    }

    async post<T = any>(path: string, params: Record<string, string> = {}): Promise<T | null> {
        const url = `${this.config.apiEndpoint}${path}`;

        try {
            const headers: Record<string, string> = {
                'Content-Type': 'application/x-www-form-urlencoded'
            };
            const requestParams = {...params};
            if (this.cookie && !requestParams.cookie && requestParams.skipCookie !== 'true') {
                requestParams.cookie = this.cookie;
            }
            delete requestParams.skipCookie;

            const response = await this.fetchWithTimeout(url, {
                method: 'POST',
                headers,
                body: new URLSearchParams(requestParams).toString()
            });
            const data = await response.json();

            const setCookie = response.headers.get('set-cookie');
            if (setCookie) {
                this.cookie = setCookie;
                this.saveCookie();
            }
            this.adoptResponseCookie(data);

            return data;
        } catch (e: any) {
            console.error('NetEase API error:', path, e.message);
            return null;
        }
    }

    async checkAvailability(): Promise<boolean> {
        try {
            const data = await this.get('/login/status', {
                timestamp: String(Date.now()),
                skipCookie: 'true'
            });
            return data?.code === 200 || data?.data?.code === 200;
        } catch {
            return false;
        }
    }
}

export const netEaseApiClient = new NetEaseApiClient();
export {NetEaseApiClient};
