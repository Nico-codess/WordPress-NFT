document.addEventListener('DOMContentLoaded', () => {
    // Move fixed-position chat widgets to end of <body> for z-index and clickability
    const wrappers = document.querySelectorAll('.aichatbotbuilder-widget-wrapper');
    wrappers.forEach(wrapper => {
        if (wrapper.classList.contains('aichatbotbuilder-position-bottom-right') ||
            wrapper.classList.contains('aichatbotbuilder-position-bottom-left') ||
            wrapper.classList.contains('aichatbotbuilder-position-top-right') ||
            wrapper.classList.contains('aichatbotbuilder-position-top-left')) {
            document.body.appendChild(wrapper);
        }
        const launcher = wrapper.querySelector('.aichatbotbuilder-launcher');
        const chat = wrapper.querySelector('.aichatbotbuilder-chat-container');
        const closeBtn = wrapper.querySelector('.aichatbotbuilder-close');

        // Hide launcher when chat is open, show when closed (with animation)
        function updateLauncherVisibility() {
            if (!launcher || !chat) return;

            if (wrapper.classList.contains('open')) {
                // When opening - first show chat container, launcher is hidden by CSS
                chat.classList.remove('aichatbotbuilder-hidden');
                // Give the browser time to start the transition
                setTimeout(() => {
                    launcher.classList.add('aichatbotbuilder-hidden');
                }, 10);
            } else {
                // When closing - first hide chat container, then show launcher
                chat.classList.add('aichatbotbuilder-hidden');
                // Important: Wait for chat container to start hiding before showing launcher
                setTimeout(() => {
                    launcher.classList.remove('aichatbotbuilder-hidden');
                }, 200);
            }
        }

        // Initial state setup
        if (launcher && chat) {
            if (wrapper.classList.contains('open')) {
                launcher.classList.add('aichatbotbuilder-hidden');
                chat.classList.remove('aichatbotbuilder-hidden');
            } else {
                launcher.classList.remove('aichatbotbuilder-hidden');
                chat.classList.add('aichatbotbuilder-hidden');
            }
        }

        if (launcher) {
            // Ensure pointer events are enabled
            launcher.style.pointerEvents = 'auto';

            launcher.addEventListener('click', () => {
                wrapper.classList.add('open');
                updateLauncherVisibility();
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                wrapper.classList.remove('open');
                updateLauncherVisibility();
            });
        }
    });

    // Chat logic (messages, form, etc.)
    const containers = document.querySelectorAll('.aichatbotbuilder-chat-container');
    containers.forEach(container => {
        const chatId = container.getAttribute('data-chat-id') || '';
        const form = container.querySelector('.aichatbotbuilder-form');
        const messages = container.querySelector('.aichatbotbuilder-messages');
        const input = container.querySelector('.aichatbotbuilder-input');
        const sendBtn = container.querySelector('.aichatbotbuilder-send');
        const clearBtn = container.querySelector('.aichatbotbuilder-clear');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const text = input.value.trim();
            if (!text) return;

            appendMessage('user', text);
            input.value = '';
            toggleDisabled(true);
            // Show typing indicator
            const typingEl = appendTypingIndicator();

            // Build history array if memory is enabled
            const memoryEnabled = container.getAttribute('data-memory-enabled') === '1';
            const memoryLength = parseInt(container.getAttribute('data-memory-length')) || 0;
            let history = [];
            if (memoryEnabled) {
                const items = messages.querySelectorAll('.aichatbotbuilder-message:not(.aichatbotbuilder-greeting)');
                const all = Array.from(items).map(el => ({
                    role: el.classList.contains('aichatbotbuilder-message--user') ? 'user' : 'assistant',
                    content: el.textContent
                }));
                history = memoryLength > 0 ? all.slice(-memoryLength * 2) : all;
            }

            try {
                const response = await fetch(aichatbotbuilderChatSettings.ajax_url, {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                    },
                    body: new URLSearchParams({
                        action: 'aichatbotbuilder_send_message',
                        nonce: aichatbotbuilderChatSettings.nonce,
                        message: text,
                        chat_id: chatId,
                        history: JSON.stringify(history),
                    }),
                });
                const data = await response.json();

                // Remove typing indicator
                typingEl.remove();
                if (data.success) {
                    appendMessage('bot', data.data.reply);
                } else {
                    appendMessage('bot', `Error: ${data.data.message}`);
                }
            } catch (error) {
                // Remove typing indicator on error
                typingEl.remove();
                appendMessage('bot', 'Error sending request.');
            }

            toggleDisabled(false);
            scrollToBottom();
        });

        // Clear chat messages
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                messages.innerHTML = '';
                input.value = '';
                input.focus();
            });
        }

        /**
         * Append a message bubble.
         * @param {string} role 'user' or 'bot'
         * @param {string} text The message text
         */
        function appendMessage(role, text) {
            const msg = document.createElement('div');
            msg.classList.add('aichatbotbuilder-message', `aichatbotbuilder-message--${role}`);
            msg.textContent = text;
            messages.appendChild(msg);
        }

        /**
         * Enable or disable input and button.
         * @param {boolean} state
         */
        function toggleDisabled(state) {
            input.disabled = state;
            sendBtn.disabled = state;
            // Always show icon, never text
            sendBtn.innerHTML = '&#10148;';
            // Optionally, add a loading class for spinner if needed
            if (state) {
                sendBtn.classList.add('aichatbotbuilder-loading');
            } else {
                sendBtn.classList.remove('aichatbotbuilder-loading');
            }
        }

        /**
         * Scroll messages to bottom.
         */
        function scrollToBottom() {
            messages.scrollTop = messages.scrollHeight;
        }

        /**
         * Show a typing indicator with animated dots.
         * @return {Element} The typing indicator element.
         */
        function appendTypingIndicator() {
            const indicator = document.createElement('div');
            indicator.classList.add('aichatbotbuilder-typing');
            indicator.innerHTML = '<span></span><span></span><span></span>';
            messages.appendChild(indicator);
            scrollToBottom();
            return indicator;
        }
    });
});