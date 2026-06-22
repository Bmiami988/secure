// js/app.js
const API_BASE = window.location.origin || 'https://secure-portal.fastapicloud.dev';
let currentUser = null;
let accessToken = null;

// Toast notifications
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    toastMessage.textContent = message;
    toast.className = `toast align-items-center border-0 text-white bg-${type === 'error' ? 'danger' : 'dark'}`;
    
    const bsToast = new bootstrap.Toast(toast, { delay: 4000 });
    bsToast.show();
}

// API helpers
async function apiRequest(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
    }
    
    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
    });
    
    const data = await response.json().catch(() => ({}));
    
    if (!response.ok) {
        throw new Error(data.detail || data.message || 'Request failed');
    }
    
    return data;
}

// DOM helpers
function $(selector) {
    return document.querySelector(selector);
}

function $$(selector) {
    return document.querySelectorAll(selector);
}

function showSection(sectionId) {
    $$('.section').forEach(s => s.style.display = 'none');
    const section = document.getElementById(sectionId);
    if (section) {
        section.style.display = 'block';
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Navigation
document.addEventListener('DOMContentLoaded', function() {
    // Show home section by default
    showSection('home');
    
    // Navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const href = this.getAttribute('href');
            if (href && href.startsWith('#')) {
                const sectionId = href.substring(1);
                if (sectionId === 'profile' && !accessToken) {
                    showToast('Please login first', 'error');
                    return;
                }
                showSection(sectionId);
                // Update active state
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                this.classList.add('active');
            }
        });
    });
    
    // Home buttons
    $('#homeEncryptBtn')?.addEventListener('click', () => {
        if (!accessToken) {
            showToast('Please login first', 'error');
            return;
        }
        showSection('encrypt');
    });
    
    $('#homeLearnBtn')?.addEventListener('click', () => {
        showToast('Secure Portal: AES-256 encryption for your data', 'info');
    });
    
    // Toggle password visibility
    $('#toggleEncryptKey')?.addEventListener('click', function() {
        const input = $('#encryptKey');
        if (input.type === 'password') {
            input.type = 'text';
            this.innerHTML = '<i class="fas fa-eye-slash"></i>';
        } else {
            input.type = 'password';
            this.innerHTML = '<i class="fas fa-eye"></i>';
        }
    });
    
    // Copy result
    $('#copyResult')?.addEventListener('click', async function() {
        const result = $('#resultOutput');
        if (result.value) {
            await navigator.clipboard.writeText(result.value);
            showToast('Copied to clipboard!', 'info');
        }
    });
    
    // Refresh buttons
    $('#refreshFiles')?.addEventListener('click', loadFiles);
    $('#refreshMessages')?.addEventListener('click', loadMessages);
});

// Update UI based on auth state
function updateAuthUI() {
    const navAuth = document.getElementById('nav-auth');
    const navUser = document.getElementById('nav-user');
    const userDisplay = document.getElementById('userDisplay');
    
    if (accessToken && currentUser) {
        navAuth.classList.add('d-none');
        navUser.classList.remove('d-none');
        userDisplay.textContent = currentUser.username || 'User';
    } else {
        navAuth.classList.remove('d-none');
        navUser.classList.add('d-none');
    }
}

// Export for other modules
window.API_BASE = API_BASE;
window.accessToken = accessToken;
window.currentUser = currentUser;
window.showToast = showToast;
window.apiRequest = apiRequest;
window.showSection = showSection;
window.updateAuthUI = updateAuthUI;