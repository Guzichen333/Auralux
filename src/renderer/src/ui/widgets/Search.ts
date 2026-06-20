/**
 * 搜索组件 - 支持本地 + 网易云统一搜索
 * 点击外部收起结果面板（不清空输入框）
 */

import {debounce, showToast} from "@utils/index.js";
import {Component} from "@ui/base/Component";
import {unifiedSearchService} from "@/features/library/service/UnifiedSearchService";

type DebouncedSearch = ((query: string) => void) & {
    cancel?: () => void;
};

class Search extends Component {
    private debouncedSearch: DebouncedSearch | null;
    private latestQuery: string = '';
    private hasActiveResults: boolean = false;
    private searchSession: number = 0;
    private documentPointerdownHandler: ((e: Event) => void) | null = null;
    private documentKeydownHandler: ((e: Event) => void) | null = null;
    declare element: HTMLInputElement | null;

    constructor() {
        super('#search-input');
        this.debouncedSearch = null;
        this.setupEventListeners();
        this.setupDismissListeners();
    }

    setupEventListeners(): void {
        this.debouncedSearch = debounce(async (query) => {
            await this.performSearch(query);
        }, 300) as DebouncedSearch;

        if (!this.element || !this.debouncedSearch) {
            return;
        }

        this.addEventListenerManaged(this.element, 'input', (e: Event) => {
            const target = e.target as HTMLInputElement;
            const query = target.value.trim();
            if (query.length > 0) {
                this.latestQuery = query;
                this.debouncedSearch?.(query);
            } else if (query.length === 0) {
                this.clearSearch();
            }
        });
        this.addEventListenerManaged(this.element, 'focus', () => {
            if (this.latestQuery.length > 0 && !this.hasActiveResults) {
                this.debouncedSearch?.(this.latestQuery);
            }
        });
    }

    private setupDismissListeners(): void {
        this.documentPointerdownHandler = (e: Event) => {
            const target = e.target as Node;

            if (this.element && (this.element === target || this.element.contains(target))) {
                return;
            }

            const searchContainer = this.element?.closest('.search-container');
            if (searchContainer && searchContainer.contains(target)) {
                return;
            }

            const contextMenu = document.getElementById('context-menu');
            if (contextMenu && contextMenu.contains(target)) {
                return;
            }

            const dialogs = document.querySelectorAll('.modal-overlay, .dialog-overlay, [class*="dialog"]');
            for (const dialog of dialogs) {
                if (dialog.contains(target)) {
                    return;
                }
            }

            if (this.hasActiveResults || this.latestQuery.length > 0) {
                const contentArea = document.getElementById('content-area');
                if (contentArea && contentArea.contains(target)) {
                    return;
                }
            }

            this.dismissSearch();
        };

        this.documentKeydownHandler = (e: Event) => {
            const event = e as KeyboardEvent;
            if (event.key === 'Escape') {
                this.dismissSearch();
            }
        };

        document.addEventListener('pointerdown', this.documentPointerdownHandler, true);
        document.addEventListener('keydown', this.documentKeydownHandler, true);
    }

    async performSearch(query: string): Promise<void> {
        const session = this.searchSession;
        try {
            const results = await unifiedSearchService.search(query);

            if (query !== this.latestQuery || session !== this.searchSession) {
                return;
            }

            const tracks = results.map(r => r.track);
            this.hasActiveResults = true;
            this.emit('searchResults', tracks, results);
        } catch (error) {
            if (session !== this.searchSession) return;
            console.error('Search failed:', error);
            showToast('搜索失败', 'error');
        }
    }

    hideResults(): void {
        if (!this.hasActiveResults) return;
        this.hasActiveResults = false;
        this.searchSession++;
        this.emit('searchCleared');
    }

    dismissSearch(): void {
        this.searchSession++;
        if (this.hasActiveResults) {
            this.hasActiveResults = false;
            this.emit('searchCleared');
        }
    }

    clearSearch(): void {
        this.latestQuery = '';
        this.hasActiveResults = false;
        this.searchSession++;
        this.emit('searchCleared');
    }

    onTrackPlayed(): void {
        this.dismissSearch();
    }

    focusInput(): void {
        this.element?.focus();
    }

    destroy(): void {
        if (this.debouncedSearch && typeof this.debouncedSearch.cancel === 'function') {
            this.debouncedSearch.cancel();
        }
        this.debouncedSearch = null;

        if (this.documentPointerdownHandler) {
            document.removeEventListener('pointerdown', this.documentPointerdownHandler, true);
            this.documentPointerdownHandler = null;
        }

        if (this.documentKeydownHandler) {
            document.removeEventListener('keydown', this.documentKeydownHandler, true);
            this.documentKeydownHandler = null;
        }

        if (this.element && !this.isDestroyed) {
            this.element.value = '';
        }

        super.destroy();
    }
}

export { Search };
