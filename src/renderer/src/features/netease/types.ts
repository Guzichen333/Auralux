export interface NetEaseSong {
    id: number;
    title: string;
    artist: string;
    album: string;
    duration: number;
    cover: string | null;
}

export type NetEaseMigrationAssetKind =
    | 'liked-songs'
    | 'created-playlists'
    | 'subscribed-playlists'
    | 'recent-plays';

export interface NetEaseMigrationAssetGroup {
    kind: NetEaseMigrationAssetKind;
    label: string;
    count: number;
}

export interface NetEaseMigrationPreview {
    userId: number;
    likedSongs: NetEaseSong[];
    createdPlaylists: NetEasePlaylist[];
    subscribedPlaylists: NetEasePlaylist[];
    recentPlays: NetEaseSong[];
    groups: NetEaseMigrationAssetGroup[];
}

export interface NetEaseMigrationProgress {
    kind: NetEaseMigrationAssetKind;
    label: string;
    current: number;
    total: number;
    message: string;
    phase?: 'preflight' | 'fetching' | 'writing' | 'refreshing' | 'completed' | 'cancelled' | 'failed';
}

export interface NetEaseMigrationControl {
    isCancelled(): boolean;
}

export interface NetEasePlaylist {
    id: number;
    name: string;
    description: string;
    cover: string;
    trackCount: number;
    tracks: NetEaseSong[];
}

export interface NetEaseLoginResult {
    success: boolean;
    cookie?: string;
    nickname?: string;
    avatarUrl?: string;
    error?: string;
}

export interface NetEaseAccountProfile {
    nickname?: string;
    avatarUrl?: string;
}

export interface NetEaseQRConfirmationResult {
    profile: NetEaseAccountProfile | null;
    diagnostics: {
        cookieAdopted: boolean;
        attempts: number;
        lastAccountCheck: 'not-started' | 'missing-cookie' | 'profile-found' | 'profile-missing' | 'request-failed';
    };
}

export interface NetEaseQRCodeResult {
    key: string;
    qrimg: string;
    qrurl: string;
}

export type NetEaseQRStatus = 'waiting' | 'scanned' | 'confirmed' | 'expired';

export interface NetEaseQRCheckResult {
    status: NetEaseQRStatus;
    cookie?: string;
}

export interface NetEaseConfig {
    apiEndpoint: string;
}
