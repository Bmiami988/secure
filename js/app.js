// js/app.js - Complete updated version
const API_BASE = 'https://secure-portal.fastapicloud.dev';

console.log('🌐 API_BASE:', API_BASE);

let currentUser = null;
let accessToken = null;

// Toast notifications
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    toastMessage.textContent = message;
    toast.className = `toast align-items-center border-0 text-white bg-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'dark'}`;
    
    const bsToast = new bootstrap.Toast(toast, { delay: 4000 });
    bsToast.show();
}

// API helpers - ALWAYS get token from localStorage
async function apiRequest(endpoint, options = {}) {
    // Always get the latest token from localStorage
    const token = localStorage.getItem('accessToken');
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        window.accessToken = token;
    }
    
    const url = `${API_BASE}${endpoint}`;
    console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);
    console.log('📋 Headers:', headers);
    
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
    
    // Check if user is already logged in
    const savedToken = localStorage.getItem('accessToken');
    const savedUser = localStorage.getItem('currentUser');
    
    if (savedToken && savedUser) {
        window.accessToken = savedToken;
        window.currentUser = JSON.parse(savedUser);
        updateAuthUI();
        // Load profile after a small delay to ensure UI is ready
        setTimeout(() => loadProfile(), 100);
    }
    
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
    
    const token = localStorage.getItem('accessToken');
    const user = localStorage.getItem('currentUser');
    
    if (token && user) {
        window.accessToken = token;
        window.currentUser = JSON.parse(user);
        navAuth.classList.add('d-none');
        navUser.classList.remove('d-none');
        userDisplay.textContent = window.currentUser.username || 'User';
    } else {
        navAuth.classList.remove('d-none');
        navUser.classList.add('d-none');
        window.accessToken = null;
        window.currentUser = null;
    }
}

// Load profile with proper token handling
async function loadProfile() {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        console.log('No token found, skipping profile load');
        return;
    }
    
    try {
        console.log('🔄 Loading profile with token:', token.substring(0, 30) + '...');
        
        const response = await fetch(`${API_BASE}/api/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('📥 Profile response status:', response.status);
        
        if (!response.ok) {
            if (response.status === 401) {
                // Token expired or invalid
                console.log('Token invalid, clearing session');
                localStorage.removeItem('accessToken');
                localStorage.removeItem('currentUser');
                window.accessToken = null;
                window.currentUser = null;
                updateAuthUI();
                showToast('Session expired. Please login again.', 'error');
                return;
            }
            throw new Error(`Failed to load profile: ${response.status}`);
        }
        
        const userData = await response.json();
        console.log('👤 User data loaded:', userData);
        
        window.currentUser = userData;
        localStorage.setItem('currentUser', JSON.stringify(userData));
        
        document.getElementById('profileUsername').textContent = userData.username || 'User';
        document.getElementById('profileEmail').textContent = userData.email || '';
        updateAuthUI();
        console.log('✅ Profile loaded successfully');
        
    } catch (error) {
        console.error('❌ Failed to load profile:', error);
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
window.loadProfile = loadProfile;
