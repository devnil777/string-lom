class I18n {
    constructor() {
        this.translations = {
            en: LANG_EN,
            ru: LANG_RU
        };
        this.locale = this.detectLocale();
        this.applyLocale();
    }

    detectLocale() {
        const saved = localStorage.getItem('stringlom_lang');
        if (saved && this.translations[saved]) return saved;

        const sysLang = (navigator.language || navigator.userLanguage || 'en').split('-')[0];
        if (this.translations[sysLang]) return sysLang;

        return 'en'; // Fallback
    }

    setLocale(locale) {
        if (!this.translations[locale]) return;
        this.locale = locale;
        localStorage.setItem('stringlom_lang', locale);
        this.applyLocale();

        // Trigger UI update
        if (window.app) {
            window.app.updateUIStrings();
            window.app.reRenderAll();
        }
    }

    applyLocale() {
        document.documentElement.lang = this.locale;
    }

    t(key) {
        const trans = this.translations[this.locale] || this.translations['en'];
        return trans[key] || key;
    }

    translatePage() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = this.t(key);

            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = translation;
            } else {
                el.textContent = translation;
            }
        });

        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            el.title = this.t(key);
        });
    }
}

const i18n = new I18n();
window.i18n = i18n;

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { i18n };
}
