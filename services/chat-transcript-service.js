/** Session-scoped chat persistence. It is intentionally excluded from IndexedDB backups. */
(function exposeChatTranscriptService(root, factory) {
    const ChatTranscriptService = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = ChatTranscriptService;
    if (root) root.ChatTranscriptService = ChatTranscriptService;
})(typeof window !== 'undefined' ? window : null, function createChatTranscriptService() {
    class ChatTranscriptService {
        constructor(storage, options = {}) {
            this.storage = storage;
            this.key = options.key || 'demasy.assistant.chat.v1';
            this.maximumMessages = options.maximumMessages || 20;
        }

        load() {
            try {
                const parsed = JSON.parse(this.storage?.getItem(this.key) || '[]');
                if (!Array.isArray(parsed)) return [];
                return parsed.map(entry => this.normalize(entry)).filter(Boolean).slice(-this.maximumMessages);
            } catch { return []; }
        }

        save(entries) {
            const normalized = (Array.isArray(entries) ? entries : [])
                .map(entry => this.normalize(entry)).filter(Boolean).slice(-this.maximumMessages);
            try { this.storage?.setItem(this.key, JSON.stringify(normalized)); } catch { /* Storage may be disabled. */ }
            return normalized;
        }

        clear() {
            try { this.storage?.removeItem(this.key); } catch { /* Storage may be disabled. */ }
        }

        normalize(entry) {
            if (!entry || !['user', 'assistant'].includes(entry.type) || typeof entry.content !== 'string') return null;
            return {
                type: entry.type,
                content: entry.content.slice(0, 10000),
                source: ['local', 'remote', 'mock', 'error'].includes(entry.source) ? entry.source : null,
                fallback: Boolean(entry.fallback)
            };
        }
    }

    return ChatTranscriptService;
});
