import {systemShellService, updateService} from "@/features/appShell/service";

class AppInfoSettingsService {
    private readonly repositoryUrl = 'https://github.com/Guzichen333/Auralux';

    async updateVersionInfo(versionElementId = 'app-version-info'): Promise<void> {
        const versionElement = document.getElementById(versionElementId);
        if (!versionElement) {
            return;
        }

        const version = await updateService.getCurrentVersion();
        versionElement.textContent = `Auralux v${version || 'unknown'}`;
    }

    async openRepository(): Promise<{success: boolean; error?: string}> {
        if (!this.repositoryUrl) {
            return {success: false, error: 'Auralux repository is not configured yet.'};
        }
        return await systemShellService.openExternal(this.repositoryUrl);
    }
}

export const appInfoSettingsService = new AppInfoSettingsService();
