// js/app.js - Complete updated version with proper state management
const API_BASE = 'https://secure-portal.fastapicloud.dev';

console.log('🌐 API_BASE:', API_BASE);

// Auth state - stored globally
let authState = {
    accessToken: null,
    currentUser: null,
    isAuthenticated: false
};

// Toast notifications
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    toastMessage.textContent = message;
    toast.className = `toast align-items-center border-0 text-white bg-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'dark'}`;
    
    const bsToast = new bootstrap.Toast(toast, { delay: 4000 });
    bsToast.show();
}

// API helpers
async function apiRequest(endpoint, options = {}) {
    // Always get the latest token from authState
    const token = authState.accessToken || localStorage.getItem('accessToken');
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        authState.accessToken = token;
    }
    
    const url = `${API_BASE}${endpoint}`;
    console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);
    
    try {
        const response = await fetch(url, {
            ...options,
            headers
        });
        
        const contentType = response.headers.get('content-type');
        let data;
        
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = await response.text();
        }
        
        if (!response.ok) {
            if (response.status === 401) {
                // Token expired or invalid - clear session
                clearAuthState();
                throw new Error('Session expired. Please login again.');
            }
            const errorMessage = typeof data === 'object' ? data.detail || data.message || 'Request failed' : data || 'Request failed';
            throw new Error(errorMessage);
        }
        
        return data;
    } catch (error) {
        console.error('❌ API Error:', error);
        if (error.message === 'Failed to fetch') {
            throw new Error('Cannot connect to server. Please check if the backend is running.');
        }
        throw error;
    }
}

// Auth state management functions
function setAuthState(token, user) {
    authState.accessToken = token;
    authState.currentUser = user;
    authState.isAuthenticated = !!token && !!user;
    
    if (token) {
        localStorage.setItem('accessToken', token);
    } else {
        localStorage.removeItem('accessToken');
    }
    
    if (user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
    } else {
        localStorage.removeItem('currentUser');
    }
    
    // Update UI
    updateAuthUI();
    console.log('🔐 Auth state updated:', authState.isAuthenticated ? 'Authenticated' : 'Not authenticated');
}

function clearAuthState() {
    authState.accessToken = null;
    authState.currentUser = null;
    authState.isAuthenticated = false;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('currentUser');
    updateAuthUI();
}

function loadAuthState() {
    const token = localStorage.getItem('accessToken');
    const userJson = localStorage.getItem('currentUser');
    
    if (token && userJson) {
        try {
            const user = JSON.parse(userJson);
            authState.accessToken = token;
            authState.currentUser = user;
            authState.isAuthenticated = true;
            updateAuthUI();
            return true;
        } catch (e) {
            console.error('Error loading auth state:', e);
            clearAuthState();
            return false;
        }
    }
    return false;
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
    // Load saved auth state
    loadAuthState();
    
    // Show home section by default
    showSection('home');
    
    // Navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const href = this.getAttribute('href');
            if (href && href.startsWith('#')) {
                const sectionId = href.substring(1);
                if (sectionId === 'profile' || sectionId === 'encrypt' || sectionId === 'files' || sectionId === 'messages') {
                    if (!authState.isAuthenticated) {
                        showToast('Please login first', 'error');
                        // Show login modal
                        const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
                        loginModal.show();
                        return;
                    }
                }
                showSection(sectionId);
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                this.classList.add('active');
            }
        });
    });
    
    // Home buttons
    $('#homeEncryptBtn')?.addEventListener('click', () => {
        if (!authState.isAuthenticated) {
            showToast('Please login first', 'error');
            const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
            loginModal.show();
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
            try {
                await navigator.clipboard.writeText(result.value);
                showToast('Copied to clipboard!', 'success');
            } catch {
                result.select();
                document.execCommand('copy');
                showToast('Copied to clipboard!', 'success');
            }
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
    
    if (authState.isAuthenticated && authState.currentUser) {
        navAuth.classList.add('d-none');
        navUser.classList.remove('d-none');
        userDisplay.textContent = authState.currentUser.username || 'User';
        
        // Update profile section
        document.getElementById('profileUsername').textContent = authState.currentUser.username || 'User';
        document.getElementById('profileEmail').textContent = authState.currentUser.email || '';
    } else {
        navAuth.classList.remove('d-none');
        navUser.classList.add('d-none');
    }
}

// Load profile
async function loadProfile() {
    if (!authState.isAuthenticated) {
        console.log('Not authenticated, skipping profile load');
        return;
    }
    
    try {
        const user = await apiRequest('/api/auth/me');
        setAuthState(authState.accessToken, user);
        updateAuthUI();
        console.log('✅ Profile loaded successfully');
    } catch (error) {
        console.error('❌ Failed to load profile:', error);
        if (error.message.includes('Session expired')) {
            clearAuthState();
            showToast('Session expired. Please login again.', 'error');
        }
    }
}

// Export for other modules
window.API_BASE = API_BASE;
window.authState = authState;
window.setAuthState = setAuthState;
window.clearAuthState = clearAuthState;
window.loadAuthState = loadAuthState;
window.showToast = showToast;
window.apiRequest = apiRequest;
window.showSection = showSection;
window.updateAuthUI = updateAuthUI;
window.loadProfile = loadProfile;
