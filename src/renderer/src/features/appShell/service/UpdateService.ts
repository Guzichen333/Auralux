import {systemGateway} from '@/infrastructure/electron/SystemGateway';

export interface GitHubReleaseAsset {
    name: string;
    browser_download_url: string;
    size: number;
}

export interface GitHubRelease {
    tag_name: string;
    name?: string;
    body?: string;
    published_at?: string;
    html_url?: string;
    assets?: GitHubReleaseAsset[];
    [key: string]: unknown;
}

export interface UpdateCheckResult {
    currentVersion: string;
    latestVersion: string;
    releaseInfo: GitHubRelease;
    hasUpdate: boolean;
}

class UpdateService {
    private readonly githubRepo = 'Guzichen333/Auralux';
    private readonly githubApiUrl = this.githubRepo
        ? `https://api.github.com/repos/${this.githubRepo}/releases/latest`
        : '';
    private readonly releasesUrl = this.githubRepo
        ? `https://github.com/${this.githubRepo}/releases`
        : '';

    async checkForUpdates(options: {fallbackCurrentVersion?: boolean} = {}): Promise<UpdateCheckResult> {
        const currentVersion = options.fallbackCurrentVersion
            ? await this.getCurrentVersionOrEmpty()
            : await this.getCurrentVersion();
        if (!this.githubApiUrl) {
            return {
                currentVersion,
                latestVersion: currentVersion,
                releaseInfo: {tag_name: currentVersion},
                hasUpdate: false
            };
        }
        const releaseInfo = await this.getLatestRelease();
        const latestVersion = releaseInfo.tag_name.replace(/^v/, '');

        return {
            currentVersion,
            latestVersion,
            releaseInfo,
            hasUpdate: this.isNewerVersion(latestVersion, currentVersion)
        };
    }

    async getCurrentVersion(): Promise<string> {
        const version = await window.electronAPI?.getVersion?.();
        if (!version) {
            throw new Error('Auralux version bridge is unavailable.');
        }
        return version;
    }

    async getCurrentVersionOrEmpty(): Promise<string> {
        try {
            return await this.getCurrentVersion();
        } catch (_error) {
            return '';
        }
    }

    async getLatestRelease(): Promise<GitHubRelease> {
        if (!this.githubApiUrl) {
            throw new Error('Auralux update repository is not configured.');
        }
        const response = await fetch(this.githubApiUrl);

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('未找到 Auralux GitHub Release，请先发布 Release 后再检查更新。');
            }
            throw new Error(`GitHub API请求失败: ${response.status} ${response.statusText}`);
        }

        return await response.json() as GitHubRelease;
    }

    isNewerVersion(latest: string, current: string): boolean {
        const parseVersion = (version: string): number[] => {
            const parts = version.replace(/-(alpha|beta|rc).*$/, '').split('.');
            return parts.map(part => parseInt(part, 10));
        };

        const latestParts = parseVersion(latest);
        const currentParts = parseVersion(current);

        for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
            const latestPart = latestParts[i] || 0;
            const currentPart = currentParts[i] || 0;

            if (latestPart > currentPart) return true;
            if (latestPart < currentPart) return false;
        }

        return false;
    }

    async openReleasePage(url = this.releasesUrl): Promise<{success: boolean; error?: string}> {
        if (!url) {
            return {success: false, error: 'Auralux release page is not configured.'};
        }
        return await systemGateway.openExternal(url);
    }

    getFallbackReleaseUrl(): string {
        return this.releasesUrl;
    }
}

export const updateService = new UpdateService();
