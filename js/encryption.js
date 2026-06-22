// js/encryption.js
document.addEventListener('DOMContentLoaded', function() {
    // Encrypt form
    $('#encryptForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        await encryptMessage();
    });
    
    // Decrypt button
    $('#decryptBtn').addEventListener('click', decryptMessage);
});

async function encryptMessage() {
    if (!accessToken) {
        showToast('Please login first', 'error');
        return;
    }
    
    const key = $('#encryptKey').value;
    const message = $('#messageInput').value;
    const status = $('#encryptStatus');
    
    if (!key || !message) {
        showToast('Please enter both key and message', 'error');
        return;
    }
    
    try {
        status.innerHTML = '<div class="status-loading"><i class="fas fa-spinner fa-spin me-2"></i>Encrypting...</div>';
        
        const data = await apiRequest('/api/encryption/encrypt', {
            method: 'POST',
            body: JSON.stringify({
                data: message,
                password: key,
                key_derivation_iterations: 100000
            })
        });
        
        $('#resultOutput').value = data.encrypted_data;
        status.innerHTML = `<div class="status-success">
            <i class="fas fa-check-circle me-2"></i>Encrypted successfully! (ID: ${data.message_id})
        </div>`;
        
        showToast('Message encrypted successfully!', 'success');
        loadMessages();
        
    } catch (error) {
        status.innerHTML = `<div class="status-error"><i class="fas fa-exclamation-circle me-2"></i>${error.message}</div>`;
        showToast(error.message, 'error');
    }
}

async function decryptMessage() {
    if (!accessToken) {
        showToast('Please login first', 'error');
        return;
    }
    
    const key = $('#encryptKey').value;
    const encrypted = $('#messageInput').value;
    const status = $('#encryptStatus');
    
    if (!key || !encrypted) {
        showToast('Please enter key and encrypted text', 'error');
        return;
    }
    
    try {
        status.innerHTML = '<div class="status-loading"><i class="fas fa-spinner fa-spin me-2"></i>Decrypting...</div>';
        
        // We need salt and iv - for demo, we'll use the encrypted data as-is
        // In production, you'd store these with the encrypted data
        const data = await apiRequest('/api/encryption/decrypt', {
            method: 'POST',
            body: JSON.stringify({
                encrypted_data: encrypted,
                password: key,
                salt: '', // Should be stored with encrypted data
                iv: ''    // Should be stored with encrypted data
            })
        });
        
        $('#resultOutput').value = data.decrypted_data;
        status.innerHTML = '<div class="status-success"><i class="fas fa-check-circle me-2"></i>Decrypted successfully!</div>';
        showToast('Message decrypted successfully!', 'success');
        
    } catch (error) {
        status.innerHTML = `<div class="status-error"><i class="fas fa-exclamation-circle me-2"></i>${error.message}</div>`;
        showToast(error.message, 'error');
    }
}

async function loadMessages() {
    if (!accessToken) return;
    
    const container = $('#messageList');
    
    try {
        const messages = await apiRequest('/api/encryption/messages');
        
        if (messages.length === 0) {
            container.innerHTML = `
                <div class="text-center text-secondary py-5">
                    <i class="fas fa-inbox fa-3x mb-3 d-block"></i>
                    <p>No messages yet</p>
                    <small>Encrypt your first message</small>
                </div>
            `;
            return;
        }
        
        container.innerHTML = messages.map(msg => `
            <div class="message-item">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <div class="message-id">
                            <i class="fas fa-envelope text-primary me-2"></i>
                            Message #${msg.id}
                        </div>
                        <div class="message-date">
                            <i class="far fa-clock me-1"></i>
                            ${new Date(msg.created_at).toLocaleString()}
                        </div>
                    </div>
                    <button class="btn btn-sm btn-outline-secondary view-message" data-id="${msg.id}">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </div>
        `).join('');
        
        // Add view handlers
        container.querySelectorAll('.view-message').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                showToast(`Message #${id} - Check console for details`, 'info');
                console.log('Message details:', messages.find(m => m.id == id));
            });
        });
        
    } catch (error) {
        container.innerHTML = `<div class="text-center text-secondary py-3">Failed to load messages: ${error.message}</div>`;
    }
}