import {netEaseApiClient} from './NetEaseApiClient';
import type {
    NetEaseAccountProfile,
    NetEaseLoginResult,
    NetEaseQRConfirmationResult,
    NetEaseQRCodeResult,
    NetEaseQRCheckResult
} from '../types';

class NetEaseAuthService {
    private qrKey: string = '';
    private qrCheckTimer: number | null = null;
    private readonly qrConfirmAttempts = 12;
    private readonly qrConfirmIntervalMs = 1000;

    get isAuthenticated(): boolean {
        return netEaseApiClient.hasAccountCookie();
    }

    async checkLoginStatus(): Promise<boolean> {
        if (!netEaseApiClient.hasAccountCookie()) {
            return false;
        }

        try {
            const data = await netEaseApiClient.get('/user/account');
            if (data && data.account) {
                return true;
            }
            netEaseApiClient.clearCookie();
            return false;
        } catch {
            return false;
        }
    }

    async confirmQRLogin(cookie?: string): Promise<NetEaseQRConfirmationResult> {
        const diagnostics: NetEaseQRConfirmationResult['diagnostics'] = {
            cookieAdopted: Boolean(cookie),
            attempts: 0,
            lastAccountCheck: 'not-started'
        };

        if (cookie) {
            netEaseApiClient.setCookie(cookie);
        }

        for (let attempt = 0; attempt < this.qrConfirmAttempts; attempt++) {
            diagnostics.attempts = attempt + 1;
            const profile = await this.getAccountProfile((state) => {
                diagnostics.lastAccountCheck = state;
            });
            if (profile) {
                return {profile, diagnostics};
            }
            await this.wait(this.qrConfirmIntervalMs);
        }

        netEaseApiClient.clearCookie();
        return {profile: null, diagnostics};
    }

    async getAccountProfile(onCheck?: (state: NetEaseQRConfirmationResult['diagnostics']['lastAccountCheck']) => void): Promise<NetEaseAccountProfile | null> {
        if (!netEaseApiClient.hasAccountCookie()) {
            onCheck?.('missing-cookie');
            return null;
        }

        try {
            const data = await netEaseApiClient.get('/user/account');
            const profile = data?.profile;
            if (!profile) {
                onCheck?.('profile-missing');
                return null;
            }
            onCheck?.('profile-found');

            return {
                nickname: typeof profile.nickname === 'string' ? profile.nickname : undefined,
                avatarUrl: typeof profile.avatarUrl === 'string' ? profile.avatarUrl : undefined
            };
        } catch {
            onCheck?.('request-failed');
            return null;
        }
    }

    private wait(ms: number): Promise<void> {
        return new Promise((resolve) => window.setTimeout(resolve, ms));
    }

    async getQRCode(): Promise<NetEaseQRCodeResult | null> {
        const keyData = await netEaseApiClient.get('/login/qr/key', {
            skipCookie: 'true',
            timestamp: Date.now().toString()
        });

        if (!keyData || !keyData.data || !keyData.data.unikey) {
            return null;
        }

        this.qrKey = keyData.data.unikey;

        const qrData = await netEaseApiClient.post('/login/qr/create', {
            key: this.qrKey,
            qrimg: 'true',
            skipCookie: 'true',
            timestamp: Date.now().toString()
        });

        if (!qrData || !qrData.data) {
            return null;
        }

        return {
            key: this.qrKey,
            qrimg: qrData.data.qrimg || '',
            qrurl: qrData.data.qrurl || ''
        };
    }

    async checkQRStatus(): Promise<NetEaseQRCheckResult> {
        if (!this.qrKey) {
            return {status: 'expired'};
        }

        const data = await netEaseApiClient.get('/login/qr/check', {
            key: this.qrKey,
            noCookie: 'true',
            skipCookie: 'true',
            timestamp: Date.now().toString()
        });

        if (!data) {
            return {status: 'waiting'};
        }

        switch (data.code) {
            case 801:
                return {status: 'waiting'};
            case 802:
                return {status: 'scanned'};
            case 803:
                return {status: 'confirmed', cookie: data.cookie || data._cookie || ''};
            case 800:
                return {status: 'expired'};
            default:
                return {status: 'waiting'};
        }
    }

    async loginWithPhone(phone: string, password: string): Promise<NetEaseLoginResult> {
        const data = await netEaseApiClient.post('/login/cellphone', {
            phone,
            password
        });

        if (!data) {
            return {success: false, error: '网络请求失败'};
        }

        if (data.code === 200) {
            netEaseApiClient.adoptResponseCookie(data);
            const cookie = data.cookie || '';
            return {
                success: true,
                cookie,
                nickname: data.profile?.nickname,
                avatarUrl: data.profile?.avatarUrl
            };
        }

        return {success: false, error: data.message || '登录失败'};
    }

    stopQRCheck(): void {
        if (this.qrCheckTimer) {
            clearInterval(this.qrCheckTimer);
            this.qrCheckTimer = null;
        }
    }
}

export const netEaseAuthService = new NetEaseAuthService();
export {NetEaseAuthService};
