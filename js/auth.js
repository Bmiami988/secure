// js/auth.js
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    const savedToken = localStorage.getItem('accessToken');
    const savedUser = localStorage.getItem('currentUser');
    
    if (savedToken && savedUser) {
        window.accessToken = savedToken;
        window.currentUser = JSON.parse(savedUser);
        updateAuthUI();
        loadProfile();
    }
    
    // Register form
    $('#registerForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const username = $('#registerUsername').value.trim();
        const email = $('#registerEmail').value.trim();
        const password = $('#registerPassword').value;
        
        try {
            const data = await apiRequest('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify({ username, email, password })
            });
            
            showToast('Registration successful! Please login.', 'success');
            $('#registerModal').modal('hide');
            this.reset();
            $('#registerError').innerHTML = '';
            
        } catch (error) {
            $('#registerError').innerHTML = `<div class="status-error">${error.message}</div>`;
        }
    });
    
    // Login form
    $('#loginForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const username = $('#loginUsername').value;
        const password = $('#loginPassword').value;
        
        try {
            const formData = new URLSearchParams();
            formData.append('username', username);
            formData.append('password', password);
            
            const response = await fetch(`${API_BASE}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: formData
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.detail || 'Login failed');
            }
            
            window.accessToken = data.access_token;
            localStorage.setItem('accessToken', data.access_token);
            
            // Get user info
            const userData = await apiRequest('/api/auth/me', {
                headers: {
                    'Authorization': `Bearer ${data.access_token}`
                }
            });
            
            window.currentUser = userData;
            localStorage.setItem('currentUser', JSON.stringify(userData));
            
            updateAuthUI();
            loadProfile();
            $('#loginModal').modal('hide');
            this.reset();
            $('#loginError').innerHTML = '';
            showToast(`Welcome back, ${userData.username}!`, 'success');
            
        } catch (error) {
            $('#loginError').innerHTML = `<div class="status-error">${error.message}</div>`;
        }
    });
    
    // Logout
    $('#logoutBtn').addEventListener('click', logout);
    $('#profileLogoutBtn').addEventListener('click', logout);
    
    // Change password
    $('#changePasswordBtn').addEventListener('click', function() {
        if (!accessToken) {
            showToast('Please login first', 'error');
            return;
        }
        $('#changePasswordModal').modal('show');
    });
    
    $('#changePasswordForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const oldPassword = $('#currentPassword').value;
        const newPassword = $('#newPassword').value;
        
        try {
            await apiRequest('/api/user/change-password', {
                method: 'POST',
                body: JSON.stringify({ old_password: oldPassword, new_password: newPassword })
            });
            
            showToast('Password changed successfully!', 'success');
            $('#changePasswordModal').modal('hide');
            this.reset();
            $('#changePasswordError').innerHTML = '';
            
        } catch (error) {
            $('#changePasswordError').innerHTML = `<div class="status-error">${error.message}</div>`;
        }
    });
});

async function logout() {
    try {
        await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch (error) {
        // Ignore logout errors
    }
    
    window.accessToken = null;
    window.currentUser = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('currentUser');
    
    updateAuthUI();
    showToast('Logged out successfully', 'info');
    showSection('home');
}

async function loadProfile() {
    if (!accessToken) return;
    
    try {
        const user = await apiRequest('/api/auth/me');
        window.currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        $('#profileUsername').textContent = user.username || 'User';
        $('#profileEmail').textContent = user.email || '';
        updateAuthUI();
        
    } catch (error) {
        console.error('Failed to load profile:', error);
    }
}