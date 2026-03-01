// --- APP ENGINE ---

class BlockApp {
    constructor() {
        this.chain = []; // Array of { id, type, params }
        this.blockCounter = 0;
        this.container = document.getElementById('chain-container');
        this.insertIndex = null;
        this.isBlocksCollapsed = false;

        this.currentChainName = null;
        this.currentChainId = null;
        this.isEditingTitle = false;
        this.isSavedListCollapsed = false;
        this.lastRemovedBlock = null;
        this.undoTimer = null;
        this.theme = 'dark'; // default
        this.isModified = false;

        // Initialize I18n
        this.updateUIStrings();

        // Initialize Source Block if empty
        this.addBlock('source');
        // Initial state is not modified
        this.isModified = false;

        this.setupModal();
        this.initTheme();

        // Browser warning on tab close
        window.onbeforeunload = (e) => {
            if (this.isModified) {
                e.preventDefault();
                e.returnValue = '';
                return '';
            }
        };

        // Bind buttons
        const resetBtn = document.getElementById('reset-btn-sidebar');
        if (resetBtn) resetBtn.onclick = () => this.clearChain();
        const pasteBtn = document.getElementById('paste-chain-btn-sidebar');
        if (pasteBtn) pasteBtn.onclick = () => this.importChain();
        const closeModalBtn = document.getElementById('close-modal-btn');
        if (closeModalBtn) closeModalBtn.onclick = () => this.closeToolModal();
        const saveChainBtn = document.getElementById('save-chain-btn');
        if (saveChainBtn) saveChainBtn.onclick = () => this.saveCurrentChain();
        const shareChainBtn = document.getElementById('share-chain-btn');
        if (shareChainBtn) shareChainBtn.onclick = () => this.shareChain();
        const copyChainBtn = document.getElementById('copy-chain-btn');
        if (copyChainBtn) copyChainBtn.onclick = () => this.exportChain();
        const themeBtn = document.getElementById('theme-toggle-btn');
        if (themeBtn) themeBtn.onclick = () => this.toggleTheme();

        const langSelect = document.getElementById('lang-select');
        if (langSelect) {
            langSelect.value = i18n.locale;
            langSelect.onchange = (e) => i18n.setLocale(e.target.value);
        }

        const searchInput = document.getElementById('tool-search-input');
        if (searchInput) {
            searchInput.oninput = (e) => {
                this.setupModal(e.target.value);
            };
        }

        // Dynamic toolbar border on scroll
        const container = document.querySelector('.container');
        const toolbar = document.getElementById('workspace-toolbar');
        if (container && toolbar) {
            container.onscroll = () => {
                if (container.scrollTop > 10) {
                    toolbar.classList.add('scrolled');
                } else {
                    toolbar.classList.remove('scrolled');
                }
            };
        }

        // Check for shared link in URL
        this.checkSharedLink();
        this.migrateSavedChains();
        this.checkUrlForChainId();
        const fDelim = document.getElementById('final-delimiter-select');
        const fCustom = document.getElementById('final-custom-delimiter-input');
        if (fDelim) {
            fDelim.addEventListener('change', () => {
                if (fCustom) fCustom.style.display = fDelim.value === 'custom' ? 'block' : 'none';
                this.runChain();
                this.isModified = true;
            });
        }
        if (fCustom) {
            fCustom.addEventListener('input', () => {
                this.runChain();
                this.isModified = true;
            });
        }
        const copyFinalBtn = document.getElementById('copy-final-btn');
        if (copyFinalBtn) copyFinalBtn.onclick = () => this.copyFinalResult();
        const downloadFinalBtn = document.getElementById('download-final-btn');
        if (downloadFinalBtn) downloadFinalBtn.onclick = () => this.downloadFinalResult();

        // Drag events for result block
        const resultBlock = document.querySelector('.block[data-type="result"]');
        if (resultBlock) {
            const resWrapper = resultBlock.closest('.chain-container');
            if (resWrapper) {
                resWrapper.classList.add('result-block-wrapper');
                resWrapper.style.position = 'relative';
                resWrapper.addEventListener('dragover', (e) => this.handleDragOver(e));
                resWrapper.addEventListener('dragleave', (e) => this.handleDragLeave(e));
                resWrapper.addEventListener('drop', (e) => this.handleDrop(e, -1)); // -1 means result block
            }
        }

        // Initial render of saved chains
        this.renderSavedChains();

        const toggleSavedBtn = document.getElementById('toggle-saved-btn');
        if (toggleSavedBtn) toggleSavedBtn.onclick = () => this.toggleSavedList();

        // App Menu Toggle
        const menuBtn = document.getElementById('app-menu-btn');
        const menuDropdown = document.getElementById('app-menu-dropdown');
        if (menuBtn && menuDropdown) {
            menuBtn.onclick = (e) => {
                e.stopPropagation();

                // Toggle active class
                const isActive = menuDropdown.classList.toggle('active');

                if (isActive) {
                    menuDropdown.style.display = 'block';
                    // Force reflow for transition
                    menuDropdown.offsetHeight;
                    menuDropdown.style.opacity = '1';
                    menuDropdown.style.transform = 'translateY(0)';
                } else {
                    menuDropdown.style.opacity = '0';
                    menuDropdown.style.transform = 'translateY(-8px)';
                    setTimeout(() => {
                        if (!menuDropdown.classList.contains('active')) {
                            menuDropdown.style.display = 'none';
                        }
                    }, 200);
                }
            };

            // Close menu on click outside
            window.addEventListener('click', (e) => {
                if (menuDropdown.classList.contains('active') && !menuDropdown.contains(e.target)) {
                    menuDropdown.classList.remove('active');
                    menuDropdown.style.opacity = '0';
                    menuDropdown.style.transform = 'translateY(-8px)';
                    setTimeout(() => {
                        if (!menuDropdown.classList.contains('active')) {
                            menuDropdown.style.display = 'none';
                        }
                    }, 200);
                }
            });

            // Prevent closing when clicking inside dropdown, but allow items to trigger closing
            menuDropdown.onclick = (e) => {
                const target = e.target.closest('.menu-item');
                // If we clicked a link or a menu item, close the menu
                if (target && !target.id.includes('theme-toggle-btn') && !target.classList.contains('lang-item')) {
                    menuDropdown.classList.remove('active');
                    menuDropdown.style.opacity = '0';
                    menuDropdown.style.transform = 'translateY(-8px)';
                    setTimeout(() => {
                        if (!menuDropdown.classList.contains('active')) {
                            menuDropdown.style.display = 'none';
                        }
                    }, 200);
                }
                e.stopPropagation();
            };
        }

        // Global Key Listeners for Modals & Shortcuts
        window.addEventListener('keydown', (e) => {
            // --- FOCUS TRAP LOGIC ---
            if (e.key === 'Tab') {
                const toolModal = document.getElementById('tool-modal');
                const dialogModal = document.getElementById('dialog-modal');
                let targetArea = null;

                if (dialogModal && dialogModal.classList.contains('active')) {
                    targetArea = dialogModal;
                } else if (toolModal && toolModal.classList.contains('active')) {
                    targetArea = toolModal;
                } else {
                    // Default: ONLY workspace main area (blocks), excluding toolbar
                    targetArea = document.querySelector('main');
                }

                if (targetArea) {
                    // Strictly pick only focusable elements that are NOT marked with tabindex="-1"
                    const selector = 'button:not([tabindex="-1"]), [href]:not([tabindex="-1"]), input:not([tabindex="-1"]), select:not([tabindex="-1"]), textarea:not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])';
                    const focusable = Array.from(targetArea.querySelectorAll(selector))
                        .filter(el => {
                            const style = window.getComputedStyle(el);
                            return style.display !== 'none' && style.visibility !== 'hidden' && !el.disabled;
                        });

                    if (focusable.length > 0) {
                        const first = focusable[0];
                        const last = focusable[focusable.length - 1];

                        if (e.shiftKey) { // Shift + Tab
                            if (document.activeElement === first || !targetArea.contains(document.activeElement)) {
                                last.focus();
                                e.preventDefault();
                            }
                        } else { // Tab
                            if (document.activeElement === last || !targetArea.contains(document.activeElement)) {
                                first.focus();
                                e.preventDefault();
                            }
                        }
                    }
                }
            }

            // Tool Modal Escape
            if (e.key === 'Escape') {
                const toolModal = document.getElementById('tool-modal');
                if (toolModal && toolModal.classList.contains('active')) {
                    const searchInput = document.getElementById('tool-search-input');
                    if (searchInput && searchInput.value.length > 0) {
                        searchInput.value = '';
                        this.setupModal('');
                    } else {
                        this.closeToolModal();
                    }
                }

                const dialogModal = document.getElementById('dialog-modal');
                if (dialogModal && dialogModal.classList.contains('active')) {
                    dialogModal.classList.remove('active');
                }
            }

            // Dialog Modal Enter (for Alert/Confim)
            if (e.key === 'Enter') {
                const dialogModal = document.getElementById('dialog-modal');
                if (dialogModal && dialogModal.classList.contains('active')) {
                    // Find the primary button in the footer and click it
                    const primaryBtn = dialogModal.querySelector('.btn-modal.primary');
                    const activeInput = dialogModal.querySelector('input, textarea');
                    if (primaryBtn && (!activeInput || activeInput.tagName !== 'TEXTAREA')) {
                        primaryBtn.click();
                        e.preventDefault();
                    }
                }
            }

            // App Shortcuts - Only if no modals are open
            const toolModal = document.getElementById('tool-modal');
            const dialogModal = document.getElementById('dialog-modal');
            const anyModalActive = (toolModal?.classList.contains('active')) ||
                (dialogModal?.classList.contains('active'));
            if (anyModalActive) return;

            const isCtrl = e.ctrlKey || e.metaKey;
            const isAlt = e.altKey;

            // Alt + S or Ctrl + S (Save)
            if ((isAlt || isCtrl) && e.code === 'KeyS') {
                e.preventDefault();
                this.saveCurrentChain();
            }

            // Alt + N (New)
            if (!isCtrl && isAlt && e.code === 'KeyN') {
                e.preventDefault();
                this.clearChain();
            }

            // Alt + I (Import)
            if (!isCtrl && isAlt && e.code === 'KeyI') {
                e.preventDefault();
                this.importChain();
            }

            // Alt + E (Export)
            if (!isCtrl && isAlt && e.code === 'KeyE') {
                e.preventDefault();
                this.exportChain();
            }

            // Alt + R (Rename)
            if (!isCtrl && isAlt && e.code === 'KeyR' && this.currentChainId) {
                e.preventDefault();
                this.startEditingTitle();
            }

            // Block shortcuts (when focused inside a block)
            const blockEl = document.activeElement.closest('.block');
            if (blockEl && !anyModalActive) {
                const index = parseInt(blockEl.dataset.index);
                const isSource = index === 0;
                const isResult = blockEl.dataset.type === 'result';

                // Alt + A (Add After)
                if (!isCtrl && isAlt && e.code === 'KeyA') {
                    if (!isResult) {
                        e.preventDefault();
                        this.openToolModal(index + 1);
                    }
                }
                // Alt + B (Add Before)
                if (!isCtrl && isAlt && e.code === 'KeyB') {
                    if (!isSource) {
                        e.preventDefault();
                        // If focused on result, add to the very end of chain
                        const targetIdx = isResult ? this.chain.length : index;
                        this.openToolModal(targetIdx);
                    }
                }
                // Alt + Delete (Remove)
                if (!isCtrl && isAlt && (e.code === 'Delete' || e.code === 'Backspace')) {
                    if (!isSource && !isResult) {
                        e.preventDefault();
                        this.removeBlock(index);
                    }
                }
            }
        });
    }

    updateUIStrings() {
        if (typeof i18n !== 'undefined') {
            i18n.translatePage();
            this.updateWorkspaceTitle();
            this.renderSavedChains();
            const searchInput = document.getElementById('tool-search-input');
            this.setupModal(searchInput?.value || '');
        }
    }

    initTheme() {
        const savedTheme = localStorage.getItem('stringlom_theme');
        if (savedTheme) {
            this.setTheme(savedTheme);
        } else {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.setTheme(prefersDark ? 'dark' : 'light');
        }
    }

    setTheme(theme) {
        // Disable transitions for instant switch
        document.body.classList.add('no-transitions');

        this.theme = theme;
        const btn = document.getElementById('theme-toggle-btn');
        if (theme === 'light') {
            document.body.classList.add('light-theme');
            if (btn) {
                btn.querySelector('i').className = 'fas fa-sun';
                btn.querySelector('span').textContent = typeof i18n !== 'undefined' ? i18n.t('theme_light') : 'Светлая тема';
            }
        } else {
            document.body.classList.remove('light-theme');
            if (btn) {
                btn.querySelector('i').className = 'fas fa-moon';
                btn.querySelector('span').textContent = typeof i18n !== 'undefined' ? i18n.t('theme_dark') : 'Темная тема';
            }
        }
        localStorage.setItem('stringlom_theme', theme);

        // Force reflow and remove the lock
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                document.body.classList.remove('no-transitions');
            });
        });
    }

    toggleTheme() {
        this.setTheme(this.theme === 'dark' ? 'light' : 'dark');
    }

    toggleSavedList() {
        this.isSavedListCollapsed = !this.isSavedListCollapsed;
        this.renderSavedChains();
    }

    copyFinalResult() {
        const txt = document.getElementById('final-output-box').textContent;
        if (!txt) return;
        const btn = document.getElementById('copy-final-btn');
        navigator.clipboard.writeText(txt).then(() => {
            const original = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check" style="color:var(--success)"></i>';
            setTimeout(() => btn.innerHTML = original, 1500);
        }).catch(err => {
            const ta = document.createElement('textarea');
            ta.value = txt;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);

            const original = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check" style="color:var(--success)"></i>';
            setTimeout(() => btn.innerHTML = original, 1500);
        });
    }

    downloadFinalResult() {
        const txt = document.getElementById('final-output-box').textContent;
        if (!txt) return;
        const blob = new Blob([txt], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = (this.currentChainName || 'result') + '.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    genId() {
        return 'blk_' + (this.blockCounter++);
    }

    genChainId() {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let id = '';
        for (let i = 0; i < 8; i++) {
            id += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return id;
    }

    updateWorkspaceTitle() {
        const titleEl = document.getElementById('workspace-title-display');
        if (!titleEl || this.isEditingTitle) return;

        const name = this.currentChainName ? this.currentChainName : (typeof i18n !== 'undefined' ? i18n.t('new_chain') : 'Новая цепочка');
        titleEl.innerHTML = `<i class="fas fa-desktop" style="color:var(--primary)"></i> <span id="workspace-title-text">${name}</span>`;

        // Update Page Title
        document.title = this.currentChainName ? `${this.currentChainName} | StringLOM` : 'StringLOM';

        if (this.currentChainName) {
            titleEl.style.cursor = 'pointer';
            titleEl.title = typeof i18n !== 'undefined' ? i18n.t('rename_title') : 'Нажмите, чтобы переименовать (Alt + R)';
            titleEl.onclick = () => this.startEditingTitle();
            titleEl.onmouseover = () => { titleEl.style.color = 'var(--primary)'; };
            titleEl.onmouseout = () => { titleEl.style.color = 'var(--dark)'; };
        } else {
            titleEl.style.cursor = 'default';
            titleEl.title = '';
            titleEl.onclick = null;
            titleEl.onmouseover = null;
            titleEl.onmouseout = null;
        }
    }

    startEditingTitle() {
        if (this.isEditingTitle || !this.currentChainName) return;
        this.isEditingTitle = true;

        const titleEl = document.getElementById('workspace-title-display');
        const confirmTitle = typeof i18n !== 'undefined' ? i18n.t('confirm') : 'Подтвердить';
        const cancelTitle = typeof i18n !== 'undefined' ? i18n.t('cancel') : 'Отмена';
        const placeholder = typeof i18n !== 'undefined' ? i18n.t('chain_name_placeholder') : 'Название цепочки...';

        titleEl.innerHTML = `
            <div class="workspace-title-editor">
                <i class="fas fa-desktop" style="color:var(--primary)"></i>
                <input type="text" id="workspace-title-input" value="${this.currentChainName || ''}" placeholder="${placeholder}" autofocus>
                <button class="btn-title-action confirm" id="confirm-title-btn" title="${confirmTitle}"><i class="fas fa-check"></i></button>
                <button class="btn-title-action cancel" id="cancel-title-btn" title="${cancelTitle}"><i class="fas fa-times"></i></button>
            </div>
        `;

        const input = document.getElementById('workspace-title-input');
        input.focus();
        input.select();

        input.onkeydown = (e) => {
            if (e.key === 'Enter') this.applyTitleRename();
            if (e.key === 'Escape') this.cancelEditingTitle();
        };

        document.getElementById('confirm-title-btn').onclick = (e) => {
            e.stopPropagation();
            this.applyTitleRename();
        };
        document.getElementById('cancel-title-btn').onclick = (e) => {
            e.stopPropagation();
            this.cancelEditingTitle();
        };

        titleEl.onclick = (e) => e.stopPropagation();

        const outsideClickListener = (e) => {
            if (this.isEditingTitle && !titleEl.contains(e.target)) {
                this.cancelEditingTitle();
            }
        };
        setTimeout(() => document.addEventListener('mousedown', outsideClickListener), 0);
        this._titleOutsideClickListener = outsideClickListener;
    }

    // --- CUSTOM DIALOGS ---
    customDialog({ title, body, footer, onShow, isLarge }) {
        const modal = document.getElementById('dialog-modal');
        if (!modal) return;
        const modalContainer = modal.querySelector('.modal');
        const titleEl = document.getElementById('dialog-title');
        const bodyEl = document.getElementById('dialog-body');
        const footerEl = document.getElementById('dialog-footer');
        const closeBtn = document.getElementById('close-dialog-btn');

        if (isLarge) modalContainer.classList.add('large');
        else modalContainer.classList.remove('large');

        titleEl.textContent = title || (typeof i18n !== 'undefined' ? i18n.t('confirmation') : 'Подтверждение');
        bodyEl.innerHTML = '';
        if (typeof body === 'string') {
            bodyEl.innerHTML = `<div style="padding-top: 4px;">${body}</div>`;
        } else if (body instanceof HTMLElement) {
            bodyEl.appendChild(body);
        }

        footerEl.innerHTML = '';
        footer.forEach(btnDef => {
            const btn = document.createElement('button');
            btn.className = `btn-modal ${btnDef.type || 'secondary'}`;
            btn.textContent = btnDef.text;
            btn.onclick = () => {
                const shouldClose = btnDef.onClick ? btnDef.onClick() !== false : true;
                if (shouldClose) modal.classList.remove('active');
            };
            footerEl.appendChild(btn);
        });

        if (closeBtn) closeBtn.onclick = () => modal.classList.remove('active');
        modal.classList.add('active');
        if (onShow) onShow();
    }

    confirmAction(msg, onConfirm, isDanger = false) {
        const confirmTitle = typeof i18n !== 'undefined' ? i18n.t('confirmation') : 'Подтверждение';
        const cancelText = typeof i18n !== 'undefined' ? i18n.t('cancel') : 'Отмена';
        const confirmText = typeof i18n !== 'undefined' ? i18n.t('confirm') : 'Подтвердить';
        this.customDialog({
            title: confirmTitle,
            body: msg,
            footer: [
                { text: cancelText, type: 'secondary' },
                { text: confirmText, type: isDanger ? 'danger' : 'primary', onClick: onConfirm }
            ]
        });
    }

    promptAction(msg, defaultValue, onConfirm, options = {}) {
        const input = options.textarea ? document.createElement('textarea') : document.createElement('input');
        if (!options.textarea) input.type = 'text';
        input.value = defaultValue || '';
        input.style.width = '100%';
        input.style.marginTop = '15px';
        input.style.boxSizing = 'border-box';
        input.placeholder = options.placeholder || (typeof i18n !== 'undefined' ? i18n.t('enter_value') : 'Введите значение...');
        if (options.textarea) input.style.minHeight = '150px';

        const wrapper = document.createElement('div');
        wrapper.textContent = msg;
        wrapper.appendChild(input);

        const cancelText = typeof i18n !== 'undefined' ? i18n.t('cancel') : 'Отмена';
        const okText = typeof i18n !== 'undefined' ? i18n.t('ok') : 'ОК';
        const inputTitle = typeof i18n !== 'undefined' ? i18n.t('input_data') : 'Ввод данных';

        this.customDialog({
            title: options.title || inputTitle,
            body: wrapper,
            isLarge: options.isLarge,
            onShow: () => {
                input.focus();
                input.select();
            },
            footer: [
                { text: cancelText, type: 'secondary' },
                { text: okText, type: 'primary', onClick: () => onConfirm(input.value) }
            ]
        });
    }

    alertAction(msg, title) {
        const alertTitle = title || (typeof i18n !== 'undefined' ? i18n.t('attention') : 'Внимание');
        const closeText = typeof i18n !== 'undefined' ? i18n.t('close') : 'Закрыть';
        this.customDialog({
            title: alertTitle,
            body: msg,
            footer: [
                { text: closeText, type: 'primary' }
            ]
        });
    }

    cancelEditingTitle() {
        if (this._titleOutsideClickListener) {
            document.removeEventListener('mousedown', this._titleOutsideClickListener);
            this._titleOutsideClickListener = null;
        }
        this.isEditingTitle = false;
        this.updateWorkspaceTitle();
    }

    applyTitleRename() {
        const input = document.getElementById('workspace-title-input');
        const newName = input.value.trim();

        if (!newName) {
            this.cancelEditingTitle();
            return;
        }

        if (newName === this.currentChainName) {
            this.cancelEditingTitle();
            return;
        }

        if (this._titleOutsideClickListener) {
            document.removeEventListener('mousedown', this._titleOutsideClickListener);
            this._titleOutsideClickListener = null;
        }
        this.isEditingTitle = false;

        if (this.currentChainId) {
            this.renameCurrentChain(newName);
        } else {
            this.currentChainName = newName;
            this.updateWorkspaceTitle();
        }
    }

    renameCurrentChain(newName) {
        if (!this.currentChainId) return;
        const saved = this.getSavedChains();
        const idx = saved.findIndex(x => x.id === this.currentChainId);
        if (idx !== -1) {
            saved[idx].name = newName;
            localStorage.setItem('strings_saved_chains', JSON.stringify(saved));
            this.currentChainName = newName;
            this.updateWorkspaceTitle();
            this.renderSavedChains();
        }
    }

    getChainConfig() {
        const blocks = this.chain.map(block => ({
            type: block.type,
            params: { ...block.params }
        }));
        const sel = document.getElementById('final-delimiter-select');
        const custom = document.getElementById('final-custom-delimiter-input');
        return {
            blocks,
            settings: {
                finalDelimiter: sel ? sel.value : '\\n',
                finalCustomDelimiter: custom ? custom.value : ''
            }
        };
    }

    loadChainConfig(data, clearData = false) {
        let blocksData = [];
        let settings = null;

        if (Array.isArray(data)) {
            blocksData = data;
        } else if (data && data.blocks) {
            blocksData = data.blocks;
            settings = data.settings;
        }

        const defaultSource = typeof i18n !== 'undefined' ? i18n.t('default_source_text') : 'Пример строки\nВторая строка\n123';
        const currentSourceValue = (this.chain.length > 0 && !clearData) ? this.chain[0].value : defaultSource;

        this.chain = blocksData.map(blockData => {
            return {
                id: this.genId(),
                type: blockData.type,
                params: blockData.params || {},
                value: blockData.type === 'source' ? currentSourceValue : null
            };
        });

        if (settings) {
            const sel = document.getElementById('final-delimiter-select');
            const custom = document.getElementById('final-custom-delimiter-input');

            if (sel && settings.finalDelimiter !== undefined) {
                sel.value = settings.finalDelimiter;
                sel.dispatchEvent(new Event('change'));
            }
            if (custom && settings.finalCustomDelimiter !== undefined) {
                custom.value = settings.finalCustomDelimiter;
                custom.dispatchEvent(new Event('input'));
            }
        }

        this.reRenderAll();
        this.isModified = false;
    }

    shareChain() {
        const config = this.getChainConfig();
        try {
            const json = JSON.stringify(config);
            const encoded = btoa(unescape(encodeURIComponent(json)));
            const url = new URL(window.location.href);
            url.searchParams.delete('id');
            url.searchParams.set('chain', encoded);

            navigator.clipboard.writeText(url.toString()).then(() => {
                const btn = document.getElementById('share-chain-btn');
                const original = btn.innerHTML;
                const copiedText = typeof i18n !== 'undefined' ? i18n.t('copied') : 'Скопировано';
                btn.innerHTML = `<i class="fas fa-check" style="color:var(--success)"></i> ${copiedText}`;
                setTimeout(() => btn.innerHTML = original, 1500);
            });
        } catch (e) {
            this.alertAction(typeof i18n !== 'undefined' ? i18n.t('share_error') : 'Ошибка при создании ссылки');
        }
    }

    checkSharedLink() {
        const urlParams = new URLSearchParams(window.location.search);
        const sharedData = urlParams.get('chain');
        if (sharedData) {
            try {
                const json = decodeURIComponent(escape(atob(sharedData)));
                const importData = JSON.parse(json);
                const blocks = Array.isArray(importData) ? importData : importData.blocks;
                if (Array.isArray(blocks) && blocks.length > 0 && blocks[0].type === 'source') {
                    this.currentChainName = null;
                    this.currentChainId = null;
                    this.loadChainConfig(importData, true);

                    const url = new URL(window.location.href);
                    url.searchParams.delete('chain');
                    url.searchParams.delete('id');
                    window.history.replaceState({}, document.title, url.toString());
                }
            } catch (e) {
                console.error('Failed to load shared chain', e);
            }
        }
    }

    updateUrlWithChain(id) {
        const url = new URL(window.location.href);
        if (id) {
            url.searchParams.set('id', id);
        } else {
            url.searchParams.delete('id');
        }
        window.history.replaceState({}, document.title, url.toString());
    }

    checkUrlForChainId() {
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('id');
        if (id) {
            const saved = this.getSavedChains();
            const item = saved.find(x => x.id === id);
            if (item) {
                this.currentChainName = item.name;
                this.currentChainId = item.id;
                this.loadChainConfig(item.data);
                this.updateWorkspaceTitle();
                this.renderSavedChains();
                this.isModified = false;
            }
        }
    }

    migrateSavedChains() {
        let saved = this.getSavedChains();
        const idRegex = /^[a-z0-9]{8}$/;
        let changed = false;

        saved = saved.map(item => {
            if (!item.id || !idRegex.test(item.id)) {
                let newId;
                do {
                    newId = this.genChainId();
                } while (saved.some(s => s.id === newId));

                item.id = newId;
                changed = true;
            }
            return item;
        });

        if (changed) {
            localStorage.setItem('strings_saved_chains', JSON.stringify(saved));
        }
    }

    exportChain() {
        const exportData = this.getChainConfig();

        const txt = JSON.stringify(exportData);
        navigator.clipboard.writeText(txt).then(() => {
            const btn = document.getElementById('copy-chain-btn');
            const original = btn.innerHTML;
            const exportedText = typeof i18n !== 'undefined' ? i18n.t('exported') : 'Экспортировано';
            btn.innerHTML = `<i class="fas fa-check" style="color:var(--success)"></i> ${exportedText}`;
            setTimeout(() => btn.innerHTML = original, 1500);
        }).catch(err => {
            const errorMsg = typeof i18n !== 'undefined' ? i18n.t('copy_clipboard_error') : 'Не удалось скопировать в буфер обмена. Используйте экспорт в файл или скопируйте вручную.';
            const exportTitle = typeof i18n !== 'undefined' ? i18n.t('export') : 'Экспорт';
            this.alertAction(errorMsg, exportTitle);
        });
    }

    importChain() {
        const promptMsg = typeof i18n !== 'undefined' ? i18n.t('import_prompt') : 'Вставьте ранее скопированный код цепочки (JSON):';
        const importTitle = typeof i18n !== 'undefined' ? i18n.t('import') : 'Импорт цепочки';
        this.promptAction(promptMsg, '', (txt) => {
            if (!txt) return;
            try {
                const importData = JSON.parse(txt);
                const blocks = Array.isArray(importData) ? importData : importData.blocks;
                if (!Array.isArray(blocks) || blocks.length === 0 || blocks[0].type !== 'source') {
                    const formatError = typeof i18n !== 'undefined' ? i18n.t('invalid_chain_format') : 'Некорректный формат цепочки';
                    throw new Error(formatError);
                }
                this.currentChainName = null;
                this.currentChainId = null;
                this.loadChainConfig(importData);
                this.updateWorkspaceTitle();
                this.renderSavedChains();
            } catch (e) {
                const errorMsg = typeof i18n !== 'undefined' ? i18n.t('import_error') : 'Ошибка импорта: Неверный формат данных';
                const attentionTitle = typeof i18n !== 'undefined' ? i18n.t('attention') : 'Внимание';
                this.alertAction(errorMsg, attentionTitle);
            }
        }, { textarea: true, title: importTitle, placeholder: '[{ "type": "source", ... }]', isLarge: true });
    }

    // --- LOCAL STORAGE LOGIC ---
    getSavedChains() {
        try {
            return JSON.parse(localStorage.getItem('strings_saved_chains') || '[]');
        } catch (e) {
            return [];
        }
    }

    saveCurrentChain() {
        let name = this.currentChainName;
        const proceedSave = (targetName) => {
            const finalName = targetName.trim();
            const data = this.getChainConfig();
            const saved = this.getSavedChains();

            let idToSave = this.currentChainId || this.genChainId();
            const existingIndex = saved.findIndex(x => x.name === finalName);

            if (existingIndex !== -1) {
                idToSave = saved[existingIndex].id;
                const item = saved.splice(existingIndex, 1)[0];
                item.data = data;
                saved.unshift(item);
            } else {
                if (this.currentChainId && saved.find(x => x.id === this.currentChainId)) {
                    const idx = saved.findIndex(x => x.id === this.currentChainId);
                    const item = saved.splice(idx, 1)[0];
                    item.name = finalName;
                    item.data = data;
                    saved.unshift(item);
                    idToSave = item.id;
                } else {
                    idToSave = this.genChainId();
                    saved.unshift({ id: idToSave, name: finalName, data });
                }
            }

            this.currentChainName = finalName;
            this.currentChainId = idToSave;

            localStorage.setItem('strings_saved_chains', JSON.stringify(saved));
            this.renderSavedChains();
            this.updateWorkspaceTitle();
            this.updateUrlWithChain(idToSave);

            const btn = document.getElementById('save-chain-btn');
            if (btn) {
                const original = btn.innerHTML;
                const savedText = typeof i18n !== 'undefined' ? i18n.t('saved') : 'Сохранено';
                btn.innerHTML = `<i class="fas fa-check" style="color:var(--success)"></i> ${savedText}`;
                setTimeout(() => btn.innerHTML = original, 1500);
            }
            this.isModified = false;
        };

        if (!name) {
            const promptMsg = typeof i18n !== 'undefined' ? i18n.t('enter_chain_name') : 'Введите название для этой цепочки:';
            const saveTitle = typeof i18n !== 'undefined' ? i18n.t('save') : 'Сохранение цепочки';
            this.promptAction(promptMsg, '', proceedSave, { title: saveTitle });
        } else {
            proceedSave(name);
        }
    }

    deleteSavedChain(id) {
        const confirmMsg = typeof i18n !== 'undefined' ? i18n.t('delete_chain_confirm') : 'Точно удалить сохраненную цепочку?';
        this.confirmAction(confirmMsg, () => {
            let saved = this.getSavedChains();
            saved = saved.filter(x => x.id !== id);
            localStorage.setItem('strings_saved_chains', JSON.stringify(saved));

            if (this.currentChainId === id) {
                this.currentChainId = null;
                this.currentChainName = null;
                this.updateWorkspaceTitle();
                this.updateUrlWithChain(null);
            }
            this.renderSavedChains();
        }, true);
    }

    loadChain(item) {
        const proceed = () => {
            this.currentChainName = item.name;
            this.currentChainId = item.id;
            this.loadChainConfig(item.data);
            this.updateWorkspaceTitle();
            this.renderSavedChains();
            this.isModified = false;
            this.updateUrlWithChain(item.id);
        };

        if (this.isModified) {
            const confirmMsg = typeof i18n !== 'undefined' ? i18n.t('switch_chain_confirm') : 'Переключиться на другую цепочку? Все несохраненные изменения текущей будут утеряны.';
            this.confirmAction(confirmMsg, proceed, false);
        } else {
            proceed();
        }
    }

    renderSavedChains() {
        const list = document.getElementById('saved-list');
        const toggleBtn = document.getElementById('toggle-saved-btn');
        const saved = this.getSavedChains();
        if (!list) return;
        list.innerHTML = '';

        if (toggleBtn) {
            toggleBtn.innerHTML = this.isSavedListCollapsed ? '<i class="fas fa-chevron-down"></i>' : '<i class="fas fa-chevron-up"></i>';
        }

        if (this.isSavedListCollapsed) {
            list.style.display = 'none';
            return;
        }
        list.style.display = 'flex';

        if (saved.length === 0) {
            const noSavedMsg = typeof i18n !== 'undefined' ? i18n.t('no_saved_chains') : 'Нет сохраненных';
            list.innerHTML = `<div style="color:var(--gray); font-size:0.85rem; text-align:center; margin-top: 10px;">${noSavedMsg}</div>`;
            return;
        }

        saved.forEach(item => {
            const el = document.createElement('div');
            el.className = 'saved-item';
            if (this.currentChainId === item.id) {
                el.classList.add('active');
            }
            el.onclick = () => this.loadChain(item);

            const title = document.createElement('div');
            title.className = 'saved-item-title';
            title.textContent = item.name;

            const actions = document.createElement('div');
            actions.className = 'saved-item-actions';

            const btnDel = document.createElement('button');
            btnDel.className = 'btn-saved delete';
            btnDel.innerHTML = '<i class="fas fa-trash"></i>';
            btnDel.title = typeof i18n !== 'undefined' ? i18n.t('delete') : 'Удалить';
            btnDel.onclick = (e) => {
                e.stopPropagation();
                this.deleteSavedChain(item.id);
            };

            actions.appendChild(btnDel);

            el.appendChild(title);
            el.appendChild(actions);
            list.appendChild(el);
        });
    }
    // --- END LOCAL STORAGE LOGIC ---

    addBlock(type, insertIndex = null) {
        const id = this.genId();
        const toolDef = type === 'source' ? null : TOOLS.find(t => t.id === type);

        const defaultSourceText = typeof i18n !== 'undefined' ? i18n.t('default_source_text') : 'Пример строки\nВторая строка\n123';
        const block = {
            id: id,
            type: type,
            params: type === 'source' ? { delimiter: '\\n' } : {},
            value: type === 'source' ? (localStorage.getItem('strings_last_source') || defaultSourceText) : null
        };

        if (toolDef) {
            toolDef.params.forEach(p => {
                block.params[p.id] = p.value;
            });
            if (toolDef.init) {
                toolDef.init(block.params);
            }
        }

        if (insertIndex !== null) {
            this.chain.splice(insertIndex, 0, block);
        } else {
            this.chain.push(block);
        }

        if (type !== 'source') {
            this.newBlockId = id;
        }

        this.reRenderAll();
        this.isModified = true;
    }

    removeBlock(index) {
        if (index === 0) return;

        this.lastRemovedBlock = {
            block: { ...this.chain[index] },
            index: index
        };

        this.chain.splice(index, 1);

        this.runChain();
        this.reRenderAll();
        this.isModified = true;

        this.showUndoToast();
    }

    showUndoToast() {
        let toast = document.getElementById('undo-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'undo-toast';
            toast.className = 'undo-toast';
            document.body.appendChild(toast);
        }

        const blockRemovedText = typeof i18n !== 'undefined' ? i18n.t('block_removed') : 'Блок удален';
        const restoreBlockText = typeof i18n !== 'undefined' ? i18n.t('restore_block') : 'Восстановить блок';

        toast.innerHTML = `
            <div class="undo-content">
                <span>${blockRemovedText}</span>
            </div>
            <button class="undo-btn" id="undo-restore-btn">
                ${restoreBlockText}
            </button>
        `;

        const btn = toast.querySelector('#undo-restore-btn');
        btn.onclick = () => {
            this.restoreBlock();
            toast.classList.remove('active');
        };

        if (this.undoTimer) clearTimeout(this.undoTimer);

        toast.classList.remove('active');
        void toast.offsetWidth;
        toast.classList.add('active');

        this.undoTimer = setTimeout(() => {
            toast.classList.remove('active');
        }, 5000);
    }

    restoreBlock() {
        if (!this.lastRemovedBlock) return;

        const { block, index } = this.lastRemovedBlock;
        const targetIndex = Math.min(index, this.chain.length);
        this.chain.splice(targetIndex, 0, block);
        this.lastRemovedBlock = null;

        this.runChain();
        this.reRenderAll();
        this.isModified = true;
    }

    reRenderAll() {
        if (!this.container) return;
        this.container.innerHTML = '';

        if (this.chain.length > 0) {
            this.renderBlock(this.chain[0], 0, this.container);
        }

        if (this.chain.length === 1) {
            const addSectionMsg = typeof i18n !== 'undefined' ? i18n.t('add_block') : 'Добавить блок';
            const addSect = document.createElement('div');
            addSect.className = 'add-section-empty';
            addSect.innerHTML = `<button class="add-btn-empty" data-i18n="add_block"><i class="fas fa-plus"></i> ${addSectionMsg}</button>`;
            addSect.querySelector('button').onclick = () => this.openToolModal(1);
            this.container.appendChild(addSect);
        } else {
            const toggleWrapper = document.createElement('div');
            toggleWrapper.style.textAlign = 'center';
            toggleWrapper.style.margin = '5px 0 15px 0';

            const btn = document.createElement('button');
            btn.className = 'add-btn-empty';
            btn.style.padding = '6px 16px';
            btn.style.fontSize = '0.85rem';

            const expandBlocksMsg = typeof i18n !== 'undefined' ? i18n.t('expand_blocks') : 'Развернуть блоки';
            const collapseBlocksMsg = typeof i18n !== 'undefined' ? i18n.t('collapse_blocks') : 'Свернуть блоки';

            if (this.isBlocksCollapsed) {
                btn.innerHTML = `<i class="fas fa-chevron-down"></i> ${expandBlocksMsg} (${this.chain.length - 1})`;
            } else {
                btn.innerHTML = `<i class="fas fa-chevron-up"></i> ${collapseBlocksMsg} (${this.chain.length - 1})`;
            }

            btn.onclick = () => {
                this.isBlocksCollapsed = !this.isBlocksCollapsed;
                this.reRenderAll();
            };

            toggleWrapper.appendChild(btn);
            this.container.appendChild(toggleWrapper);

            const toolsWrapper = document.createElement('div');
            toolsWrapper.style.display = this.isBlocksCollapsed ? 'none' : 'flex';
            toolsWrapper.style.flexDirection = 'column';
            toolsWrapper.style.width = '100%';

            for (let i = 1; i < this.chain.length; i++) {
                this.renderBlock(this.chain[i], i, toolsWrapper);
            }
            this.container.appendChild(toolsWrapper);
        }

        this.runChain();
    }

    clearChain() {
        const btn = document.getElementById('reset-btn-sidebar');
        const proceed = () => {
            this.chain = [];
            if (this.container) this.container.innerHTML = '';
            this.currentChainName = null;
            this.currentChainId = null;
            this.addBlock('source');
            this.updateWorkspaceTitle();
            this.renderSavedChains();
            this.isModified = false;
            this.updateUrlWithChain(null);

            if (btn) {
                const original = btn.innerHTML;
                const createdText = typeof i18n !== 'undefined' ? i18n.t('created') : 'Создано';
                btn.innerHTML = `<i class="fas fa-check" style="color:var(--success)"></i> ${createdText}`;
                setTimeout(() => btn.innerHTML = original, 1500);
            }
        };

        if (this.isModified) {
            const confirmMsg = typeof i18n !== 'undefined' ? i18n.t('new_chain_confirm') : 'Создать новую цепочку? Все несохраненные изменения текущей будут утеряны.';
            this.confirmAction(confirmMsg, proceed, false);
        } else {
            proceed();
        }
    }

    // --- DRAG AND DROP ---
    handleDragStart(e, index) {
        if (index === 0) {
            e.preventDefault();
            return;
        }
        this.draggedIndex = index;
        const wrapper = e.target.closest('.block-wrapper');
        if (wrapper) wrapper.classList.add('block-dragging');
        document.body.classList.add('dragging-active');
        e.dataTransfer.effectAllowed = 'move';
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const wrapper = e.target.closest('.block-wrapper, .result-block-wrapper');
        if (!wrapper) return;

        const draggedWrapper = document.querySelector('.block-dragging');
        if (wrapper === draggedWrapper) return;

        if (this._lastDragOverWrapper && this._lastDragOverWrapper !== wrapper) {
            this._lastDragOverWrapper.classList.remove('drag-over-top', 'drag-over-bottom');
            delete this._lastDragOverWrapper._lastSide;
        }
        this._lastDragOverWrapper = wrapper;

        const rect = wrapper.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const h = rect.height;

        const threshold = h * 0.1;
        const midpoint = h / 2;

        let newSide = wrapper._lastSide || 'top';
        if (y < midpoint - threshold) {
            newSide = 'top';
        } else if (y > midpoint + threshold) {
            newSide = 'bottom';
        }

        if (wrapper._lastSide !== newSide) {
            wrapper.classList.remove('drag-over-top', 'drag-over-bottom');
            wrapper.classList.add(newSide === 'top' ? 'drag-over-top' : 'drag-over-bottom');
            wrapper._lastSide = newSide;
            this.dropSide = newSide;
        }
    }

    handleDragLeave(e) {
    }

    handleDrop(e, targetIndex) {
        e.preventDefault();

        if (this.draggedIndex === null) return;

        let insertPos = (this.dropSide === 'top') ? targetIndex : targetIndex + 1;

        if (targetIndex === -1) {
            insertPos = this.chain.length;
        }

        if (this.draggedIndex === insertPos || this.draggedIndex === insertPos - 1) {
            this.handleDragEnd();
            return;
        }

        const movedItem = this.chain.splice(this.draggedIndex, 1)[0];

        if (this.draggedIndex < insertPos) {
            insertPos--;
        }

        this.chain.splice(insertPos, 0, movedItem);

        this.draggedIndex = null;
        this.handleDragEnd();
        this.reRenderAll();
        this.isModified = true;
    }

    handleDragEnd() {
        document.body.classList.remove('dragging-active');
        document.querySelectorAll('.block-wrapper, .result-block-wrapper').forEach(b => {
            b.classList.remove('block-dragging', 'drag-over-top', 'drag-over-bottom');
            delete b._lastSide;
        });
        this._lastDragOverWrapper = null;
    }

    renderBlock(block, index, parentElement) {
        const isSource = block.type === 'source';
        const toolDef = isSource ? { title: typeof i18n !== 'undefined' ? i18n.t('input_data') : 'Исходный текст', icon: 'fas fa-file-alt' } : TOOLS.find(t => t.id === block.type);

        const wrapper = document.createElement('div');
        wrapper.className = 'block-wrapper';
        wrapper.id = `wrapper-${block.id}`;

        const canDrag = !isSource && this.chain.length > 2;

        if (canDrag) {
            const outerHandle = document.createElement('div');
            outerHandle.className = 'drag-handle-outer';
            outerHandle.innerHTML = '<i class="fas fa-grip-vertical"></i>';
            outerHandle.title = typeof i18n !== 'undefined' ? i18n.t('drag_to_move') : 'Потяните, чтобы переместить';
            wrapper.appendChild(outerHandle);

            wrapper.draggable = true;
            wrapper.addEventListener('dragstart', (e) => {
                const header = e.target.closest('.block-header');
                const outer = e.target.closest('.drag-handle-outer');

                if (header || outer || this._canDragNow) {
                    this.handleDragStart(e, index);
                } else {
                    e.preventDefault();
                }
            });

            wrapper.addEventListener('mousedown', (e) => {
                const header = e.target.closest('.block-header');
                const outer = e.target.closest('.drag-handle-outer');
                const isBtn = e.target.closest('button, a, input, select, textarea');
                this._canDragNow = !!((header || outer) && !isBtn);
            });

            wrapper.addEventListener('dragover', (e) => this.handleDragOver(e));
            wrapper.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            wrapper.addEventListener('drop', (e) => this.handleDrop(e, index));
            wrapper.addEventListener('dragend', () => this.handleDragEnd());
        }

        const el = document.createElement('div');
        el.className = `block ${isSource ? 'source-block' : 'process-block'}`;
        el.dataset.index = index;
        if (canDrag) el.classList.add('draggable');

        if (block.id === this.newBlockId) {
            el.classList.add('block-new');
            setTimeout(() => {
                this.newBlockId = null;
                el.classList.remove('block-new');
            }, 2000);
        }

        // HEADER
        const header = document.createElement('div');
        header.className = 'block-header';

        const title = document.createElement('div');
        title.className = 'block-title';
        const badgeHtml = isSource ? '' : `<span class="badge">#${index}</span>`;
        title.innerHTML = `<i class="${toolDef.icon}"></i> <span>${isSource ? toolDef.title : (typeof i18n !== 'undefined' ? i18n.t(toolDef.title) : toolDef.title)}</span> ${badgeHtml}`;

        const actions = document.createElement('div');
        actions.className = 'block-actions';

        if (isSource) {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.style.display = 'none';
            fileInput.addEventListener('change', (e) => {
                this.handleFileUpload(e.target.files[0], block);
            });

            const loadBtn = document.createElement('button');
            loadBtn.className = 'icon-btn';
            loadBtn.setAttribute('data-i18n-title', 'load_from_file');
            loadBtn.innerHTML = '<i class="fas fa-file-import"></i>';
            loadBtn.title = typeof i18n !== 'undefined' ? i18n.t('load_from_file') : 'Загрузить из файла';
            loadBtn.onclick = () => fileInput.click();

            actions.appendChild(fileInput);
            actions.appendChild(loadBtn);
        } else {
            if (toolDef && toolDef.help) {
                const helpBtn = document.createElement('a');
                helpBtn.href = toolDef.help;
                helpBtn.target = '_blank';
                helpBtn.className = 'icon-btn';
                helpBtn.innerHTML = '<i class="fas fa-question-circle"></i>';
                helpBtn.title = typeof i18n !== 'undefined' ? i18n.t('help') : 'Справка';
                actions.appendChild(helpBtn);
            }

            const addAboveBtn = document.createElement('button');
            addAboveBtn.className = 'icon-btn';
            addAboveBtn.setAttribute('data-i18n-title', 'add_block_above');
            addAboveBtn.innerHTML = '<div style="position:relative; display:inline-block;"><i class="fas fa-plus"></i><i class="fas fa-caret-up" style="position:absolute; top:-4px; right:-6px; font-size:0.6rem; opacity:0.8;"></i></div>';
            addAboveBtn.title = typeof i18n !== 'undefined' ? i18n.t('add_block_above') : 'Добавить блок выше (Alt + B)';
            addAboveBtn.onclick = () => this.openToolModal(index);
            actions.appendChild(addAboveBtn);

            const addBelowBtn = document.createElement('button');
            addBelowBtn.className = 'icon-btn';
            addBelowBtn.setAttribute('data-i18n-title', 'add_block_below');
            addBelowBtn.innerHTML = '<div style="position:relative; display:inline-block;"><i class="fas fa-plus"></i><i class="fas fa-caret-down" style="position:absolute; bottom:-4px; right:-6px; font-size:0.6rem; opacity:0.8;"></i></div>';
            addBelowBtn.title = typeof i18n !== 'undefined' ? i18n.t('add_block_below') : 'Добавить блок ниже (Alt + A)';
            addBelowBtn.onclick = () => this.openToolModal(index + 1);
            actions.appendChild(addBelowBtn);

            const delBtn = document.createElement('button');
            delBtn.className = 'icon-btn delete';
            delBtn.setAttribute('data-i18n-title', 'remove_block_alt');
            delBtn.innerHTML = '<i class="fas fa-trash"></i>';
            delBtn.title = typeof i18n !== 'undefined' ? i18n.t('remove_block_alt') : 'Удалить блок (Alt + Delete)';
            delBtn.onclick = () => this.removeBlock(index);
            actions.appendChild(delBtn);
        }

        header.appendChild(title);
        header.appendChild(actions);

        // CONTENT
        const content = document.createElement('div');
        content.className = 'block-content';

        if (isSource) {
            const group = document.createElement('div');
            group.className = 'form-group';
            const textarea = document.createElement('textarea');
            textarea.value = block.value;
            textarea.rows = 5;
            textarea.placeholder = typeof i18n !== 'undefined' ? i18n.t('source_placeholder') : 'Введите текст здесь (или перетащите файл сюда)...';
            textarea.addEventListener('input', (e) => {
                block.value = e.target.value;
                if (isSource) {
                    localStorage.setItem('strings_last_source', block.value);
                }
                this.runChain();
            });

            textarea.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                textarea.style.borderColor = 'var(--primary)';
                textarea.style.background = 'rgba(71, 114, 250, 0.05)';
            });
            textarea.addEventListener('dragleave', (e) => {
                e.preventDefault();
                e.stopPropagation();
                textarea.style.borderColor = '';
                textarea.style.background = '';
            });
            textarea.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                textarea.style.borderColor = '';
                textarea.style.background = '';
                const files = e.dataTransfer.files;
                if (files && files.length > 0) {
                    this.handleFileUpload(files[0], block);
                }
            });

            group.appendChild(textarea);
            content.appendChild(group);

            const pGrid = document.createElement('div');
            pGrid.className = 'params-grid';
            pGrid.style.marginTop = '15px';
            const grpDelim = document.createElement('div');
            grpDelim.className = 'form-group';
            const lblDelim = document.createElement('label');
            lblDelim.textContent = typeof i18n !== 'undefined' ? i18n.t('line_delimiter') : 'Разделитель строк';

            const flexBox = document.createElement('div');
            flexBox.style.display = 'flex';
            flexBox.style.gap = '8px';

            const selDelim = document.createElement('select');
            selDelim.style.flex = '1';
            const newlineText = typeof i18n !== 'undefined' ? i18n.t('newline') : 'Новая строка';
            const commaText = typeof i18n !== 'undefined' ? i18n.t('comma') : 'Запятая';
            const semicolonText = typeof i18n !== 'undefined' ? i18n.t('semicolon') : 'Точка с запятой';
            const spaceText = typeof i18n !== 'undefined' ? i18n.t('space') : 'Пробел';
            const customText = typeof i18n !== 'undefined' ? i18n.t('custom') : 'Свой...';

            [
                { v: '\\n', l: newlineText },
                { v: ',', l: commaText },
                { v: ';', l: semicolonText },
                { v: ' ', l: spaceText },
                { v: 'custom', l: customText }
            ].forEach(o => {
                const opt = document.createElement('option');
                opt.value = o.v;
                opt.textContent = o.l;
                if (o.v === (block.params.delimiter || '\\n')) opt.selected = true;
                selDelim.appendChild(opt);
            });

            const customInput = document.createElement('input');
            customInput.type = 'text';
            customInput.placeholder = typeof i18n !== 'undefined' ? i18n.t('custom_placeholder') : 'Текст...';
            customInput.style.width = '120px';
            customInput.value = block.params.customDelimiter || '';
            customInput.style.display = selDelim.value === 'custom' ? 'block' : 'none';

            selDelim.addEventListener('change', (e) => {
                block.params.delimiter = e.target.value;
                customInput.style.display = e.target.value === 'custom' ? 'block' : 'none';
                this.runChain();
                this.isModified = true;
            });
            customInput.addEventListener('input', (e) => {
                block.params.customDelimiter = e.target.value;
                this.runChain();
                this.isModified = true;
            });

            flexBox.appendChild(selDelim);
            flexBox.appendChild(customInput);

            grpDelim.appendChild(lblDelim);
            grpDelim.appendChild(flexBox);
            pGrid.appendChild(grpDelim);
            content.appendChild(pGrid);
        } else {
            // PARAMS
            if (toolDef.params && toolDef.params.length > 0) {
                const pGrid = document.createElement('div');
                pGrid.className = 'params-grid';

                toolDef.params.forEach(param => {
                    const grp = document.createElement('div');
                    grp.className = 'form-group';
                    const lbl = document.createElement('label');
                    lbl.textContent = typeof i18n !== 'undefined' ? i18n.t(param.label) : param.label;
                    grp.appendChild(lbl);

                    let field;
                    let currentVal = block.params[param.id] !== undefined ? block.params[param.id] : param.value;

                    if (param.type === 'select' || param.type === 'delimiter') {
                        field = document.createElement('select');
                        const newlineText = typeof i18n !== 'undefined' ? i18n.t('newline') : 'Новая строка';
                        const commaText = typeof i18n !== 'undefined' ? i18n.t('comma') : 'Запятая';
                        const semicolonText = typeof i18n !== 'undefined' ? i18n.t('semicolon') : 'Точка с запятой';
                        const spaceText = typeof i18n !== 'undefined' ? i18n.t('space') : 'Пробел';
                        const customText = typeof i18n !== 'undefined' ? i18n.t('custom') : 'Свой...';

                        const options = param.type === 'delimiter' ? [
                            { v: '\\n', l: newlineText },
                            { v: ',', l: commaText },
                            { v: ';', l: semicolonText },
                            { v: ' ', l: spaceText },
                            { v: 'custom', l: customText }
                        ] : (param.options || []).map(o => ({ v: o.v, l: typeof i18n !== 'undefined' ? i18n.t(o.l) : o.l }));

                        if (param.type === 'delimiter' && currentVal !== undefined) {
                            const knownVals = options.map(o => o.v);
                            if (!knownVals.includes(currentVal)) {
                                const customKey = `${param.id}Custom`;
                                block.params[customKey] = currentVal;
                                currentVal = 'custom';
                            }
                        }
                        options.forEach(o => {
                            const opt = document.createElement('option');
                            opt.value = o.v;
                            opt.textContent = o.l;
                            if (o.v == currentVal) opt.selected = true;
                            field.appendChild(opt);
                        });
                        field.addEventListener('change', (e) => {
                            block.params[param.id] = e.target.value;
                            if (param.type === 'delimiter') {
                                if (e.target.value === 'custom') {
                                    customDelimInput.style.display = 'block';
                                } else {
                                    customDelimInput.style.display = 'none';
                                }
                            }
                            this.runChain();
                            this.isModified = true;
                        });

                        let customDelimInput;
                        if (param.type === 'delimiter') {
                            customDelimInput = document.createElement('input');
                            customDelimInput.type = 'text';
                            customDelimInput.placeholder = typeof i18n !== 'undefined' ? i18n.t('custom_placeholder') : 'Текст...';
                            customDelimInput.style.width = '120px';
                            const customKey = `${param.id}Custom`;
                            customDelimInput.value = block.params[customKey] || '';
                            customDelimInput.style.display = field.value === 'custom' ? 'block' : 'none';
                            customDelimInput.addEventListener('input', (e) => {
                                block.params[customKey] = e.target.value;
                                this.runChain();
                                this.isModified = true;
                            });
                            const wrapperFlex = document.createElement('div');
                            wrapperFlex.style.display = 'flex';
                            wrapperFlex.style.gap = '8px';
                            wrapperFlex.appendChild(field);
                            wrapperFlex.appendChild(customDelimInput);
                            field = wrapperFlex;
                        }
                    } else if (param.type === 'checkbox') {
                        const labelWrap = document.createElement('label');
                        labelWrap.className = 'toggle-switch';

                        const inputField = document.createElement('input');
                        inputField.type = 'checkbox';
                        inputField.checked = currentVal;
                        inputField.addEventListener('change', (e) => {
                            block.params[param.id] = e.target.checked;
                            this.runChain();
                            this.isModified = true;
                        });

                        labelWrap.appendChild(inputField);
                        field = labelWrap;
                    } else if (param.type === 'textarea') {
                        field = document.createElement('textarea');
                        field.value = currentVal;
                        field.rows = 3;
                        field.placeholder = typeof i18n !== 'undefined' ? i18n.t(param.placeholder || '') : (param.placeholder || '');
                        field.addEventListener('input', (e) => {
                            block.params[param.id] = e.target.value;
                            this.runChain();
                            this.isModified = true;
                        });
                    } else {
                        field = document.createElement('input');
                        field.type = 'text';
                        field.value = currentVal;
                        field.placeholder = typeof i18n !== 'undefined' ? i18n.t(param.placeholder || '') : (param.placeholder || '');
                        field.addEventListener('input', (e) => {
                            block.params[param.id] = e.target.value;
                            this.runChain();
                            this.isModified = true;
                        });
                    }

                    grp.appendChild(field);
                    pGrid.appendChild(grp);
                });
                content.appendChild(pGrid);
            }

            const stats = document.createElement('div');
            stats.className = 'stats';
            stats.id = `stats-${block.id}`;
            stats.style.marginTop = '10px';

            content.appendChild(stats);
        }

        el.appendChild(header);
        el.appendChild(content);
        wrapper.appendChild(el);

        if (parentElement) parentElement.appendChild(wrapper);
    }

    runChain() {
        let currentLines = [];
        let globalDelimiter = '\n';

        this.chain.forEach((block, index) => {
            if (block.type === 'source') {
                const delimParam = block.params.delimiter;
                let innerDelim = '\\n';
                if (delimParam === 'custom') {
                    innerDelim = block.params.customDelimiter || '';
                } else {
                    innerDelim = delimParam;
                }
                globalDelimiter = innerDelim === '\\n' ? '\n' : (innerDelim || '\n');
                const text = block.value || '';
                currentLines = text ? text.split(globalDelimiter) : [];
            } else {
                const toolDef = TOOLS.find(t => t.id === block.type);
                const statsDiv = document.getElementById(`stats-${block.id}`);

                if (toolDef) {
                    const res = toolDef.process(currentLines, block.params);

                    if (res.error) {
                        if (statsDiv) {
                            statsDiv.innerHTML = `<span style="color:var(--danger); font-size: 0.85rem;">${res.result}</span>`;
                        }
                        currentLines = [];
                    } else {
                        currentLines = res.result;

                        if (statsDiv) {
                            statsDiv.innerHTML = '';
                            if (res.stats) {
                                if (res.stats._html) {
                                    const debugPre = document.createElement('div');
                                    debugPre.className = 'debug-preview';
                                    debugPre.innerHTML = res.stats._html;
                                    statsDiv.appendChild(debugPre);
                                }

                                const badgeEntries = Object.entries(res.stats).filter(([k]) => !k.startsWith('_'));
                                if (badgeEntries.length > 0) {
                                    const badges = document.createElement('div');
                                    badges.className = 'stats-badges';
                                    if (res.stats._html) badges.style.marginTop = '8px';

                                    badgeEntries.forEach(([k, v]) => {
                                        const badge = document.createElement('span');
                                        badge.className = 'badge';
                                        badge.textContent = `${k}: ${v}`;
                                        badges.appendChild(badge);
                                    });
                                    statsDiv.appendChild(badges);
                                }
                            }
                        }
                    }
                }
            }
        });

        const fDelimSelect = document.getElementById('final-delimiter-select');
        if (!fDelimSelect) return;
        const finalDelimParam = fDelimSelect.value;
        let finalDelimStr = finalDelimParam;

        const fCustomInput = document.getElementById('final-custom-delimiter-input');
        if (finalDelimParam === 'custom' && fCustomInput) {
            finalDelimStr = fCustomInput.value;
        }

        const finalDelim = finalDelimStr === '\\n' ? '\n' : (finalDelimStr || '\n');

        const finalOutBox = document.getElementById('final-output-box');
        const finalStats = document.getElementById('final-stats');

        if (finalOutBox) {
            const finalOutputText = Array.isArray(currentLines) ? currentLines.join(finalDelim) : currentLines;
            finalOutBox.textContent = finalOutputText;

            if (finalStats) {
                finalStats.innerHTML = '';
                if (Array.isArray(currentLines)) {
                    const badge = document.createElement('span');
                    badge.className = 'badge';
                    const linesCountMsg = typeof i18n !== 'undefined' ? i18n.t('lines_count') : 'Строк:';
                    badge.textContent = `${linesCountMsg} ${currentLines.length}`;
                    finalStats.appendChild(badge);
                }
            }
        }
    }

    handleFileUpload(file, block) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            block.value = content;
            this.reRenderAll();
        };
        reader.readAsText(file);
    }

    // MODAL LOGIC
    setupModal(filter = '') {
        const list = document.getElementById('tool-list');
        if (!list) return;
        list.innerHTML = '';
        const query = filter.trim().toLowerCase();
        const isFiltering = query.length >= 2;

        TOOL_CATEGORIES.forEach(cat => {
            let toolsToShow = [];
            if (isFiltering) {
                cat.tools.forEach(tId => {
                    const t = TOOLS.find(x => x.id === tId);
                    const title = typeof i18n !== 'undefined' ? i18n.t(t.title) : t.title;
                    const desc = typeof i18n !== 'undefined' ? i18n.t(t.description) : t.description;
                    if (t && (title.toLowerCase().includes(query) || desc.toLowerCase().includes(query))) {
                        toolsToShow.push(t);
                    }
                });
            } else {
                cat.tools.forEach(tId => {
                    const t = TOOLS.find(x => x.id === tId);
                    if (t) toolsToShow.push(t);
                });
            }

            if (toolsToShow.length === 0) return;

            const catDiv = document.createElement('div');
            catDiv.className = 'tool-category';
            if (isFiltering) {
                catDiv.style.display = 'contents';
            } else {
                const catTitle = typeof i18n !== 'undefined' ? i18n.t(cat.title) : cat.title;
                catDiv.innerHTML = `<div class="tool-category-title">${catTitle}</div>`;
            }

            const gridDiv = document.createElement('div');
            gridDiv.className = 'tool-category-grid';

            toolsToShow.forEach(t => {
                const item = document.createElement('div');
                item.className = 'tool-item';
                item.tabIndex = 0;
                const toolTitle = typeof i18n !== 'undefined' ? i18n.t(t.title) : t.title;
                const toolDesc = typeof i18n !== 'undefined' ? i18n.t(t.description) : t.description;
                const addTitle = typeof i18n !== 'undefined' ? i18n.t('add_without_closing') : 'Добавить без закрытия';
                item.innerHTML = `
                    <i class="${t.icon}"></i>
                    <div class="tool-info">
                        <h4>${toolTitle}</h4>
                        <p>${toolDesc}</p>
                    </div>
                    <button class="btn-add-tool-only" title="${addTitle}">
                        <i class="fas fa-plus"></i>
                    </button>
                `;

                const selectTool = (shouldClose = true) => {
                    this.addBlock(t.id, this.insertIndex);
                    if (shouldClose) {
                        this.closeToolModal();
                    } else {
                        if (this.insertIndex !== null) {
                            this.insertIndex++;
                        }
                    }
                };

                item.onclick = (e) => {
                    if (e.target.closest('.btn-add-tool-only')) {
                        e.stopPropagation();
                        selectTool(false);
                    } else {
                        selectTool(true);
                    }
                };

                item.onkeydown = (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        selectTool(true);
                    }
                };
                gridDiv.appendChild(item);
            });

            catDiv.appendChild(gridDiv);
            list.appendChild(catDiv);
        });
    }

    openToolModal(insertIndex = null) {
        this.insertIndex = insertIndex;
        const modal = document.getElementById('tool-modal');
        if (!modal) return;
        modal.classList.add('active');

        const list = document.getElementById('tool-list');
        if (list) list.scrollTop = 0;

        const searchInput = document.getElementById('tool-search-input');
        if (searchInput) {
            searchInput.value = '';
            this.setupModal('');
            setTimeout(() => searchInput.focus(), 100);
        }
    }

    closeToolModal() {
        const modal = document.getElementById('tool-modal');
        if (modal) modal.classList.remove('active');
    }
}

// Init
const app = new BlockApp();
window.app = app;

// click outside modal
window.onclick = function (event) {
    const m = document.getElementById('tool-modal');
    if (event.target == m) {
        app.closeToolModal();
    }
}
