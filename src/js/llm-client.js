class LLMClient {
    constructor() {
        this.settings = this.loadSettings();
    }

    loadSettings() {
        const saved = localStorage.getItem('stringlom_llm_settings');
        return saved ? JSON.parse(saved) : {
            baseUrl: '',
            provider: 'qwen_oauth',
            model: 'qwen3-coder-plus',
            apiKey: ''
        };
    }

    saveSettings(settings) {
        this.settings = { ...this.settings, ...settings };
        localStorage.setItem('stringlom_llm_settings', JSON.stringify(this.settings));
    }

    async process(lines, params, blockId, ui) {
        if (!this.settings.baseUrl) {
            throw new Error('LLM Proxy Base URL is not configured in settings.');
        }

        let token = this.settings.apiKey;
        let endpoint = this.settings.provider === 'deepseek' ? 'https://api.deepseek.com/chat/completions' : 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

        if (this.settings.provider === 'qwen_oauth') {
            const creds = JSON.parse(sessionStorage.getItem('qwen_oauth') || 'null');
            if (!creds || !creds.access_token) {
                throw new Error(i18n.t('tool_llm_auth_required'));
            }
            token = creds.access_token;
            if (creds.resourceUrl) {
                const ru = creds.resourceUrl.startsWith('http') ? creds.resourceUrl : `https://${creds.resourceUrl}`;
                endpoint = (ru.endsWith('/v1') ? ru : `${ru}/v1`) + '/chat/completions';
            }
        }

        const batchSize = parseInt(params.batchSize) || 1;
        const results = [];
        let totalPromptTokens = 0;
        let totalCompletionTokens = 0;

        for (let i = 0; i < lines.length; i += batchSize) {
            const batch = lines.slice(i, i + batchSize);
            const userContent = batch.map(line => params.promptTemplate.replace('{{ line }}', line)).join('\n');

            const payload = {
                model: this.settings.model,
                messages: [
                    { role: 'system', content: params.systemPrompt },
                    { role: 'user', content: userContent }
                ],
                stream: false
            };

            const proxyUrl = `${this.settings.baseUrl}/proxy?url=${encodeURIComponent(endpoint)}`;
            const response = await fetch(proxyUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error?.message || `HTTP ${response.status}`);
            }

            const data = await response.json();
            const reply = data.choices?.[0]?.message?.content || '';
            results.push(...reply.split('\n'));

            if (data.usage) {
                totalPromptTokens += data.usage.prompt_tokens || 0;
                totalCompletionTokens += data.usage.completion_tokens || 0;
            }
        }

        return {
            result: results,
            stats: {
                [i18n.t('tool_llm_stats_prompt')]: totalPromptTokens,
                [i18n.t('tool_llm_stats_completion')]: totalCompletionTokens,
                [i18n.t('tool_llm_stats_tokens')]: totalPromptTokens + totalCompletionTokens
            }
        };
    }

    async generatePKCE() {
        const array = new Uint8Array(32);
        window.crypto.getRandomValues(array);
        const verifier = btoa(String.fromCharCode.apply(null, array))
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

        const encoder = new TextEncoder();
        const data = encoder.encode(verifier);
        const hash = await window.crypto.subtle.digest('SHA-256', data);
        const challenge = btoa(String.fromCharCode.apply(null, new Uint8Array(hash)))
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

        return { verifier, challenge };
    }

    async startQwenOAuth(baseUrl, blockId, ui) {
        if (blockId !== 'settings') {
            const statsDiv = document.getElementById(`stats-${blockId}`);
            if (statsDiv) statsDiv.innerHTML = `<div class="badge on2">${i18n.t('tool_llm_waiting_auth')}</div>`;
        }

        try {
            const { verifier, challenge } = await this.generatePKCE();
            const res = await fetch(`${baseUrl}/auth/device_code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ challenge, verifier })
            });
            const data = await res.json();

            if (data.user_code) {
                ui.alertAction(`
                    <div style="text-align:center">
                        <p>${i18n.t('tool_llm_oauth_code')}</p>
                        <h2 style="color:var(--primary); letter-spacing: 2px; margin: 15px 0;">${data.user_code}</h2>
                        <a href="${data.verification_uri_complete || data.verification_uri || 'https://chat.qwen.ai/activate'}" target="_blank" class="btn-sidebar-main" style="display:inline-block; text-decoration:none; margin-bottom:10px;">Open Activation Page</a>
                    </div>
                `, i18n.t('tool_llm_login_qwen'));

                this.pollQwenToken(baseUrl, data.device_code, verifier, ui, blockId);
            }
        } catch (e) {
            console.error('OAuth start error:', e);
        }
    }

    async pollQwenToken(baseUrl, deviceCode, codeVerifier, ui, blockId) {
        const poll = async () => {
            try {
                const res = await fetch(`${baseUrl}/auth/poll`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ device_code: deviceCode, code_verifier: codeVerifier })
                });
                const data = await res.json();

                if (data.access_token) {
                    sessionStorage.setItem('qwen_oauth', JSON.stringify({
                        access_token: data.access_token,
                        refresh_token: data.refresh_token,
                        resourceUrl: data.resource_url
                    }));
                    ui.showToast(i18n.t('tool_llm_auth_success'));
                    ui.closeDialog();
                    if (blockId !== 'settings') ui.runChain();
                } else if (data.error === 'authorization_pending' || data.error === 'slow_down') {
                    setTimeout(poll, 5000);
                } else if (data.error) {
                    console.error('OAuth poll error:', data.error);
                }
            } catch (e) {
                console.error('Polling error:', e);
            }
        };
        setTimeout(poll, 5000);
    }
}

window.llmClient = new LLMClient();
