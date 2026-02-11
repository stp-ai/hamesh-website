/**
 * AI Chat Widget
 * ha-mesh.com
 */
(function() {
    'use strict';

    var CONFIG = {
        apiEndpoint: 'https://stp2403.app.n8n.cloud/webhook/hamesh-chat',
        leadEndpoint: 'https://stp2403.app.n8n.cloud/webhook/hamesh-chat-lead',
        sessionKey: 'hamesh_chat_session',
        historyKey: 'hamesh_chat_history',
        maxHistory: 20,
        maxMessageLength: 500,
        welcomeMessage: 'שלום! איך אפשר לעזור? אני כאן לענות על שאלות לגבי המסלול "מאישיות לתוכן" ושירותי חמ"ש.',
        offlineMessage: 'הצ\'אט שלנו לא זמין כרגע. ניתן ליצור קשר בטלפון 050-994-5351 או במייל contact@ha-mesh.com',
        errorMessage: 'משהו השתבש, אפשר לנסות שוב או לדבר איתנו ישירות:',
        placeholderResponses: [
            'תודה על ההודעה! הצ\'אט החכם שלנו בהקמה. בינתיים, אפשר ליצור קשר ב-050-994-5351 או להשאיר פרטים ונחזור אליכם.',
            'השאלה התקבלה! הצ\'אט ה-AI שלנו יופעל בקרוב. רוצים להשאיר פרטים ונחזור אליכם?'
        ]
    };

    var state = {
        isOpen: false,
        sessionId: null,
        history: [],
        isTyping: false,
        leadFormShown: false,
        lastSent: 0
    };

    // --- Utilities ---

    function generateId() {
        return 'xxxx-xxxx-xxxx'.replace(/x/g, function() {
            return (Math.random() * 16 | 0).toString(16);
        });
    }

    function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function saveState() {
        try {
            localStorage.setItem(CONFIG.sessionKey, state.sessionId);
            localStorage.setItem(CONFIG.historyKey, JSON.stringify(state.history.slice(-CONFIG.maxHistory)));
        } catch (e) { /* localStorage full or unavailable */ }
    }

    function loadState() {
        try {
            state.sessionId = localStorage.getItem(CONFIG.sessionKey) || generateId();
            var saved = localStorage.getItem(CONFIG.historyKey);
            state.history = saved ? JSON.parse(saved) : [];
        } catch (e) {
            state.sessionId = generateId();
            state.history = [];
        }
    }

    // --- Inject CSS ---

    function injectStyles() {
        var style = document.createElement('style');
        style.textContent =
            /* Bubble */
            '#cw-bubble {' +
                'position: fixed; bottom: 24px; left: 24px; z-index: 9998;' +
                'width: 60px; height: 60px; border-radius: 50%;' +
                'background: linear-gradient(135deg, #F97316, #FB923C);' +
                'border: none; cursor: pointer;' +
                'box-shadow: 0 4px 20px rgba(249,115,22,0.4);' +
                'display: flex; align-items: center; justify-content: center;' +
                'transition: transform 0.3s ease, box-shadow 0.3s ease;' +
                'animation: cwPulse 3s ease-in-out infinite;' +
            '}' +
            '#cw-bubble:hover {' +
                'transform: scale(1.1);' +
                'box-shadow: 0 6px 28px rgba(249,115,22,0.5);' +
            '}' +
            '#cw-bubble:focus-visible {' +
                'outline: 3px solid #3B82F6; outline-offset: 3px;' +
            '}' +
            '#cw-bubble svg { width: 28px; height: 28px; fill: #fff; transition: transform 0.3s ease; }' +
            '#cw-bubble .cw-close-icon { display: none; }' +
            '#cw-bubble.cw-open .cw-chat-icon { display: none; }' +
            '#cw-bubble.cw-open .cw-close-icon { display: block; }' +
            '@keyframes cwPulse {' +
                '0%, 100% { box-shadow: 0 4px 20px rgba(249,115,22,0.4); }' +
                '50% { box-shadow: 0 4px 30px rgba(249,115,22,0.6); }' +
            '}' +

            /* Window */
            '#cw-window {' +
                'position: fixed; bottom: 96px; left: 24px; z-index: 9997;' +
                'width: 380px; max-height: 520px;' +
                'background: #fff; border-radius: 16px;' +
                'box-shadow: 0 12px 40px rgba(0,0,0,0.15);' +
                'display: flex; flex-direction: column;' +
                'overflow: hidden; direction: rtl;' +
                'font-family: "Heebo", sans-serif;' +
                'opacity: 0; transform: translateY(20px) scale(0.95);' +
                'pointer-events: none;' +
                'transition: opacity 0.3s ease, transform 0.3s ease;' +
            '}' +
            '#cw-window.cw-visible {' +
                'opacity: 1; transform: translateY(0) scale(1);' +
                'pointer-events: auto;' +
            '}' +

            /* Header */
            '.cw-header {' +
                'background: linear-gradient(135deg, #3B82F6, #8B5CF6);' +
                'padding: 16px 20px; color: #fff;' +
                'display: flex; align-items: center; gap: 12px;' +
                'flex-shrink: 0;' +
            '}' +
            '.cw-header-avatar {' +
                'width: 40px; height: 40px; border-radius: 50%;' +
                'background: rgba(255,255,255,0.2);' +
                'display: flex; align-items: center; justify-content: center;' +
                'font-size: 1.2rem; flex-shrink: 0;' +
            '}' +
            '.cw-header-info { flex: 1; }' +
            '.cw-header-name { font-weight: 700; font-size: 1rem; }' +
            '.cw-header-status { font-size: 0.75rem; opacity: 0.8; }' +

            /* Messages */
            '.cw-messages {' +
                'flex: 1; overflow-y: auto; padding: 16px;' +
                'display: flex; flex-direction: column; gap: 10px;' +
                'min-height: 200px; max-height: 320px;' +
                'background: #F9FAFB;' +
            '}' +
            '.cw-msg {' +
                'max-width: 85%; padding: 10px 14px;' +
                'border-radius: 14px; font-size: 0.9rem;' +
                'line-height: 1.6; word-wrap: break-word;' +
                'animation: cwFadeIn 0.3s ease;' +
            '}' +
            '.cw-msg-bot {' +
                'align-self: flex-start;' +
                'background: #fff; color: #3B1F7E;' +
                'border: 1px solid #E5E7EB;' +
                'border-radius: 14px 14px 4px 14px;' +
            '}' +
            '.cw-msg-user {' +
                'align-self: flex-end;' +
                'background: linear-gradient(135deg, #F97316, #FB923C);' +
                'color: #fff;' +
                'border-radius: 14px 14px 14px 4px;' +
            '}' +
            '@keyframes cwFadeIn {' +
                'from { opacity: 0; transform: translateY(8px); }' +
                'to { opacity: 1; transform: translateY(0); }' +
            '}' +

            /* Typing indicator */
            '.cw-typing {' +
                'align-self: flex-start;' +
                'background: #fff; border: 1px solid #E5E7EB;' +
                'padding: 12px 18px; border-radius: 14px 14px 4px 14px;' +
                'display: flex; gap: 4px; align-items: center;' +
            '}' +
            '.cw-typing-dot {' +
                'width: 7px; height: 7px; border-radius: 50%;' +
                'background: #8B5CF6; opacity: 0.4;' +
                'animation: cwBounce 1.4s ease-in-out infinite;' +
            '}' +
            '.cw-typing-dot:nth-child(2) { animation-delay: 0.2s; }' +
            '.cw-typing-dot:nth-child(3) { animation-delay: 0.4s; }' +
            '@keyframes cwBounce {' +
                '0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }' +
                '30% { transform: translateY(-6px); opacity: 1; }' +
            '}' +

            /* Input */
            '.cw-input-area {' +
                'padding: 12px 16px; border-top: 1px solid #E5E7EB;' +
                'display: flex; gap: 8px; align-items: flex-end;' +
                'background: #fff; flex-shrink: 0;' +
            '}' +
            '.cw-input {' +
                'flex: 1; border: 1px solid #E5E7EB; border-radius: 12px;' +
                'padding: 10px 14px; font-family: "Heebo", sans-serif;' +
                'font-size: 0.9rem; resize: none; outline: none;' +
                'direction: rtl; max-height: 80px; line-height: 1.5;' +
                'transition: border-color 0.3s ease;' +
            '}' +
            '.cw-input:focus { border-color: #8B5CF6; }' +
            '.cw-input::placeholder { color: #A0AEC0; }' +
            '.cw-send-btn {' +
                'width: 40px; height: 40px; border-radius: 50%;' +
                'background: linear-gradient(135deg, #F97316, #FB923C);' +
                'border: none; cursor: pointer;' +
                'display: flex; align-items: center; justify-content: center;' +
                'transition: opacity 0.3s ease, transform 0.3s ease;' +
                'flex-shrink: 0;' +
            '}' +
            '.cw-send-btn:hover { opacity: 0.9; transform: scale(1.05); }' +
            '.cw-send-btn:disabled { opacity: 0.5; cursor: default; transform: none; }' +
            '.cw-send-btn svg { width: 18px; height: 18px; fill: #fff; transform: rotate(180deg); }' +

            /* Lead form */
            '.cw-lead-form {' +
                'padding: 16px; background: #F5F3FF;' +
                'border-top: 1px solid #E5E7EB;' +
                'animation: cwFadeIn 0.3s ease;' +
            '}' +
            '.cw-lead-title {' +
                'font-size: 0.95rem; font-weight: 700;' +
                'color: #3B1F7E; margin-bottom: 12px;' +
            '}' +
            '.cw-lead-field {' +
                'width: 100%; border: 1px solid #E5E7EB; border-radius: 8px;' +
                'padding: 8px 12px; font-family: "Heebo", sans-serif;' +
                'font-size: 0.85rem; direction: rtl; outline: none;' +
                'margin-bottom: 8px; transition: border-color 0.3s ease;' +
            '}' +
            '.cw-lead-field:focus { border-color: #8B5CF6; }' +
            '.cw-lead-field::placeholder { color: #A0AEC0; }' +
            '.cw-lead-submit {' +
                'width: 100%; padding: 10px;' +
                'background: linear-gradient(135deg, #3B82F6, #8B5CF6);' +
                'color: #fff; border: none; border-radius: 8px;' +
                'font-family: "Heebo", sans-serif; font-size: 0.9rem;' +
                'font-weight: 600; cursor: pointer;' +
                'transition: opacity 0.3s ease;' +
            '}' +
            '.cw-lead-submit:hover { opacity: 0.9; }' +
            '.cw-lead-submit:disabled { opacity: 0.5; cursor: default; }' +
            '.cw-lead-success {' +
                'text-align: center; padding: 16px; color: #3B1F7E;' +
                'font-size: 0.9rem; line-height: 1.6;' +
            '}' +
            '.cw-lead-error {' +
                'color: #DC2626; font-size: 0.8rem; margin-bottom: 8px;' +
            '}' +
            '.cw-hp { position: absolute; left: -9999px; }' +
            '.cw-wa-btn {' +
                'display: flex; align-items: center; justify-content: center; gap: 8px;' +
                'width: 100%; padding: 12px; margin-top: 8px;' +
                'background: #25D366; color: #fff; border: none; border-radius: 10px;' +
                'font-family: "Heebo", sans-serif; font-size: 0.95rem;' +
                'font-weight: 600; cursor: pointer; text-decoration: none;' +
                'transition: opacity 0.3s ease;' +
            '}' +
            '.cw-wa-btn:hover { opacity: 0.9; }' +
            '.cw-wa-btn svg { width: 20px; height: 20px; fill: #fff; flex-shrink: 0; }' +

            /* Powered by */
            '.cw-powered {' +
                'text-align: center; padding: 6px;' +
                'font-size: 0.7rem; color: #A0AEC0;' +
                'background: #fff; border-top: 1px solid #F3F4F6;' +
            '}' +

            /* Responsive */
            '@media (max-width: 480px) {' +
                '#cw-window {' +
                    'left: 8px; right: 8px; bottom: 88px;' +
                    'width: auto; max-height: 70vh;' +
                '}' +
                '#cw-bubble { bottom: 16px; left: 16px; }' +
            '}' +

            /* Reduced motion */
            '@media (prefers-reduced-motion: reduce) {' +
                '#cw-bubble { animation: none; }' +
                '.cw-msg, .cw-lead-form { animation: none; }' +
                '#cw-window { transition: opacity 0.1s ease; }' +
            '}';

        document.head.appendChild(style);
    }

    // --- Build HTML ---

    function createWidget() {
        // Bubble
        var bubble = document.createElement('button');
        bubble.id = 'cw-bubble';
        bubble.setAttribute('aria-label', 'פתח צ\'אט');
        bubble.setAttribute('title', 'שוחח/י איתנו');
        bubble.innerHTML =
            '<svg class="cw-chat-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
                '<path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/>' +
                '<path d="M7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/>' +
            '</svg>' +
            '<svg class="cw-close-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
                '<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>' +
            '</svg>';

        // Window
        var win = document.createElement('div');
        win.id = 'cw-window';
        win.setAttribute('role', 'dialog');
        win.setAttribute('aria-label', 'צ\'אט עם חמ"ש');
        win.innerHTML =
            '<div class="cw-header">' +
                '<div class="cw-header-avatar">&#x1f4ac;</div>' +
                '<div class="cw-header-info">' +
                    '<div class="cw-header-name">חמ"ש</div>' +
                    '<div class="cw-header-status">בדרך כלל עונים תוך דקה</div>' +
                '</div>' +
            '</div>' +
            '<div class="cw-messages" id="cwMessages"></div>' +
            '<div id="cwLeadContainer"></div>' +
            '<div class="cw-input-area">' +
                '<textarea class="cw-input" id="cwInput" placeholder="כתבו הודעה..." rows="1" maxlength="' + CONFIG.maxMessageLength + '"></textarea>' +
                '<button class="cw-send-btn" id="cwSend" aria-label="שלח">' +
                    '<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>' +
                '</button>' +
            '</div>' +
            '<div class="cw-powered">חמ"ש - חיבורים מייצרים שינוי</div>';

        document.body.appendChild(bubble);
        document.body.appendChild(win);

        return { bubble: bubble, win: win };
    }

    // --- Core Logic ---

    function toggleChat() {
        state.isOpen = !state.isOpen;
        var bubble = document.getElementById('cw-bubble');
        var win = document.getElementById('cw-window');

        if (state.isOpen) {
            bubble.classList.add('cw-open');
            bubble.setAttribute('aria-label', 'סגור צ\'אט');
            win.classList.add('cw-visible');
            // Focus input
            setTimeout(function() {
                document.getElementById('cwInput').focus();
            }, 350);
            // Show welcome if first time
            if (state.history.length === 0) {
                addBotMessage(CONFIG.welcomeMessage);
            }
        } else {
            bubble.classList.remove('cw-open');
            bubble.setAttribute('aria-label', 'פתח צ\'אט');
            win.classList.remove('cw-visible');
        }
    }

    function addMessage(text, isUser) {
        var messagesEl = document.getElementById('cwMessages');
        var msg = document.createElement('div');
        msg.className = 'cw-msg ' + (isUser ? 'cw-msg-user' : 'cw-msg-bot');
        msg.textContent = text;
        messagesEl.appendChild(msg);
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function addBotMessage(text) {
        addMessage(text, false);
        state.history.push({ role: 'bot', text: text });
        saveState();
    }

    function showTyping() {
        state.isTyping = true;
        var messagesEl = document.getElementById('cwMessages');
        var typing = document.createElement('div');
        typing.className = 'cw-typing';
        typing.id = 'cwTyping';
        typing.innerHTML =
            '<div class="cw-typing-dot"></div>' +
            '<div class="cw-typing-dot"></div>' +
            '<div class="cw-typing-dot"></div>';
        messagesEl.appendChild(typing);
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function hideTyping() {
        state.isTyping = false;
        var typing = document.getElementById('cwTyping');
        if (typing) typing.remove();
    }

    function sendMessage() {
        var input = document.getElementById('cwInput');
        var text = input.value.trim();
        if (!text || state.isTyping) return;

        // Rate limit: 1 second between messages
        var now = Date.now();
        if (now - state.lastSent < 1000) return;
        state.lastSent = now;

        // Display user message
        addMessage(text, true);
        state.history.push({ role: 'user', text: text });
        saveState();
        input.value = '';
        autoResizeInput(input);

        // Disable input while waiting
        input.disabled = true;
        document.getElementById('cwSend').disabled = true;

        showTyping();

        if (CONFIG.apiEndpoint) {
            callAPI(text);
        } else {
            // Placeholder mode
            setTimeout(function() {
                hideTyping();
                var idx = Math.floor(Math.random() * CONFIG.placeholderResponses.length);
                addBotMessage(CONFIG.placeholderResponses[idx]);
                showLeadForm();
                input.disabled = false;
                document.getElementById('cwSend').disabled = false;
            }, 1200);
        }
    }

    function callAPI(message, attempt) {
        attempt = attempt || 1;
        var maxAttempts = 3;
        var input = document.getElementById('cwInput');
        var sendBtn = document.getElementById('cwSend');

        // Build history for API (last 10 exchanges)
        var apiHistory = state.history.slice(-20).map(function(h) {
            return { role: h.role === 'user' ? 'user' : 'assistant', content: h.text };
        });

        fetch(CONFIG.apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message,
                sessionId: state.sessionId,
                history: apiHistory
            })
        })
        .then(function(res) {
            if (!res.ok) throw new Error('API error: ' + res.status);
            return res.json();
        })
        .then(function(data) {
            hideTyping();
            var response = data.reply || data.response || CONFIG.errorMessage;

            // Check for lead form flag
            var showLead = false;
            if (response.indexOf('[SHOW_LEAD_FORM]') !== -1) {
                response = response.replace('[SHOW_LEAD_FORM]', '').trim();
                showLead = true;
            }

            addBotMessage(response);

            if (showLead || data.showLeadForm || data.show_lead_form) {
                showLeadForm();
            }

            input.disabled = false;
            sendBtn.disabled = false;
            input.focus();
        })
        .catch(function(err) {
            if (attempt < maxAttempts) {
                setTimeout(function() {
                    callAPI(message, attempt + 1);
                }, 1000 * attempt);
            } else {
                hideTyping();
                addBotMessage(CONFIG.errorMessage);
                showWhatsAppButton();
                input.disabled = false;
                sendBtn.disabled = false;
            }
        });
    }

    // --- WhatsApp Button (shown on errors) ---

    function showWhatsAppButton() {
        var container = document.getElementById('cwLeadContainer');
        container.innerHTML =
            '<a class="cw-wa-btn" href="https://wa.me/972509945351" target="_blank" rel="noopener">' +
                '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
                    '<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>' +
                    '<path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.352 0-4.556-.688-6.415-1.876l-.447-.296-3.27 1.097 1.097-3.27-.296-.447A9.953 9.953 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/>' +
                '</svg>' +
                '<span>דברו איתנו בוואטסאפ</span>' +
            '</a>';
        container.style.display = 'block';
    }

    // --- Lead Form ---

    function showLeadForm() {
        if (state.leadFormShown) return;
        state.leadFormShown = true;

        var container = document.getElementById('cwLeadContainer');
        container.innerHTML =
            '<div class="cw-lead-form" id="cwLeadForm">' +
                '<div class="cw-lead-title">השאירו פרטים ונחזור אליכם</div>' +
                '<div id="cwLeadError" class="cw-lead-error" style="display:none"></div>' +
                '<input class="cw-lead-field" id="cwLeadName" type="text" placeholder="שם" autocomplete="name">' +
                '<input class="cw-lead-field" id="cwLeadPhone" type="tel" placeholder="טלפון" autocomplete="tel" dir="ltr">' +
                '<input class="cw-lead-field" id="cwLeadEmail" type="email" placeholder="אימייל (אופציונלי)" autocomplete="email" dir="ltr">' +
                '<input class="cw-hp" type="text" id="cwHoneypot" tabindex="-1" autocomplete="off">' +
                '<button class="cw-lead-submit" id="cwLeadSubmit">שליחה</button>' +
            '</div>';

        document.getElementById('cwLeadSubmit').addEventListener('click', submitLead);

        // Enter key submits
        container.querySelectorAll('.cw-lead-field').forEach(function(field) {
            field.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') submitLead();
            });
        });
    }

    function submitLead() {
        var name = document.getElementById('cwLeadName').value.trim();
        var phone = document.getElementById('cwLeadPhone').value.trim();
        var email = document.getElementById('cwLeadEmail').value.trim();
        var honeypot = document.getElementById('cwHoneypot').value;
        var errorEl = document.getElementById('cwLeadError');

        // Bot detection
        if (honeypot) return;

        // Validation
        if (!name) {
            errorEl.textContent = 'נא למלא שם';
            errorEl.style.display = 'block';
            return;
        }
        if (!phone && !email) {
            errorEl.textContent = 'נא למלא טלפון או אימייל';
            errorEl.style.display = 'block';
            return;
        }
        if (phone && !/^(?:0|\+?972)[2-9]\d{7,8}$/.test(phone.replace(/[-\s()]/g, ''))) {
            errorEl.textContent = 'מספר טלפון לא תקין';
            errorEl.style.display = 'block';
            return;
        }
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errorEl.textContent = 'כתובת אימייל לא תקינה';
            errorEl.style.display = 'block';
            return;
        }

        errorEl.style.display = 'none';
        var submitBtn = document.getElementById('cwLeadSubmit');
        submitBtn.disabled = true;
        submitBtn.textContent = 'שולח...';

        var leadData = {
            name: name,
            phone: phone,
            email: email,
            sessionId: state.sessionId,
            page: window.location.pathname,
            timestamp: new Date().toISOString(),
            source: 'chat_widget'
        };

        if (CONFIG.leadEndpoint) {
            fetch(CONFIG.leadEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(leadData)
            })
            .then(function() { showLeadSuccess(); })
            .catch(function() { showLeadSuccess(); }); // Show success anyway, log error server-side
        } else {
            // No backend yet, show success
            setTimeout(function() { showLeadSuccess(); }, 600);
        }
    }

    function showLeadSuccess() {
        var container = document.getElementById('cwLeadContainer');
        container.innerHTML =
            '<div class="cw-lead-success">' +
                '<strong>תודה!</strong><br>' +
                'קיבלנו את הפרטים ונחזור אליכם בהקדם.<br>' +
                'לשיחה ישירה: <a href="tel:0509945351" style="color:#3B82F6">050-994-5351</a>' +
            '</div>';
    }

    // --- Input handling ---

    function autoResizeInput(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 80) + 'px';
    }

    function setupEvents(elements) {
        // Bubble click
        elements.bubble.addEventListener('click', toggleChat);

        // Send button
        document.getElementById('cwSend').addEventListener('click', sendMessage);

        // Input events
        var input = document.getElementById('cwInput');
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        input.addEventListener('input', function() {
            autoResizeInput(this);
        });

        // Keyboard: Escape to close
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && state.isOpen) {
                toggleChat();
            }
        });

        // Close when clicking outside
        document.addEventListener('click', function(e) {
            if (state.isOpen &&
                !elements.win.contains(e.target) &&
                !elements.bubble.contains(e.target)) {
                toggleChat();
            }
        });
    }

    // --- Restore history ---

    function restoreMessages() {
        if (state.history.length === 0) return;
        var messagesEl = document.getElementById('cwMessages');
        state.history.forEach(function(h) {
            var msg = document.createElement('div');
            msg.className = 'cw-msg ' + (h.role === 'user' ? 'cw-msg-user' : 'cw-msg-bot');
            msg.textContent = h.text;
            messagesEl.appendChild(msg);
        });
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    // --- Init ---

    function init() {
        loadState();
        injectStyles();
        var elements = createWidget();
        restoreMessages();
        setupEvents(elements);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
