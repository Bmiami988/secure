// js/auth.js - Complete updated version
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    const savedToken = localStorage.getItem('accessToken');
    const savedUser = localStorage.getItem('currentUser');
    
    if (savedToken && savedUser) {
        window.accessToken = savedToken;
        window.currentUser = JSON.parse(savedUser);
        updateAuthUI();
        setTimeout(() => loadProfile(), 100);
    }
    
    // Register form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('📝 Register form submitted');
            
            const username = document.getElementById('registerUsername').value.trim();
            const email = document.getElementById('registerEmail').value.trim();
            const password = document.getElementById('registerPassword').value;
            
            if (!username || !email || !password) {
                document.getElementById('registerError').innerHTML = 
                    '<div class="status-error">All fields are required</div>';
                return;
            }
            
            if (password.length < 8) {
                document.getElementById('registerError').innerHTML = 
                    '<div class="status-error">Password must be at least 8 characters</div>';
                return;
            }
            
            const requestData = { username, email, password };
            console.log('📤 Sending to:', `${API_BASE}/api/auth/register`);
            
            try {
                const response = await fetch(`${API_BASE}/api/auth/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestData)
                });
                
                console.log('📥 Response status:', response.status);
                
                let data;
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    data = await response.json();
                } else {
                    data = await response.text();
                }
                
                console.log('📥 Response data:', data);
                
                if (!response.ok) {
                    const errorMessage = typeof data === 'object' ? data.detail || data.message || 'Registration failed' : data;
                    throw new Error(errorMessage);
                }
                
                document.getElementById('registerError').innerHTML = 
                    '<div class="status-success">✅ Registration successful! Please login.</div>';
                showToast('Registration successful! Please login.', 'success');
                
                setTimeout(() => {
                    const modal = bootstrap.Modal.getInstance(document.getElementById('registerModal'));
                    if (modal) modal.hide();
                    registerForm.reset();
                    document.getElementById('registerError').innerHTML = '';
                }, 2000);
                
            } catch (error) {
                console.error('❌ Registration error:', error);
                document.getElementById('registerError').innerHTML = 
                    `<div class="status-error">❌ ${error.message}</div>`;
                showToast(error.message, 'error');
            }
        });
    }
    
    // Login form - FIXED
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('🔐 Login form submitted');
            
            const username = document.getElementById('loginUsername').value.trim();
            const password = document.getElementById('loginPassword').value;
            
            if (!username || !password) {
                document.getElementById('loginError').innerHTML = 
                    '<div class="status-error">All fields are required</div>';
                return;
            }
            
            try {
                const formData = new URLSearchParams();
                formData.append('username', username);
                formData.append('password', password);
                
                console.log('📤 Sending login to:', `${API_BASE}/api/auth/login`);
                
                const response = await fetch(`${API_BASE}/api/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: formData
                });
                
                console.log('📥 Login response status:', response.status);
                
                let data;
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    data = await response.json();
                } else {
                    data = await response.text();
                }
                
                console.log('📥 Login response data:', data);
                
                if (!response.ok) {
                    const errorMessage = typeof data === 'object' ? data.detail || data.message || 'Login failed' : data;
                    throw new Error(errorMessage);
                }
                
                // ✅ SAVE TOKEN
                const token = data.access_token;
                console.log('🔑 Token received:', token.substring(0, 30) + '...');
                
                // Save to localStorage
                localStorage.setItem('accessToken', token);
                window.accessToken = token;
                
                // ✅ Get user info with the token
                console.log('🔄 Getting user info...');
                const userResponse = await fetch(`${API_BASE}/api/auth/me`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                console.log('📥 User info response status:', userResponse.status);
                
                if (!userResponse.ok) {
                    // Token saved but user info failed
                    console.error('Failed to get user info, but token was saved');
                    localStorage.removeItem('accessToken');
                    window.accessToken = null;
                    throw new Error('Failed to get user information. Please try again.');
                }
                
                const userData = await userResponse.json();
                console.log('👤 User data:', userData);
                
                window.currentUser = userData;
                localStorage.setItem('currentUser', JSON.stringify(userData));
                
                // ✅ Update UI
                updateAuthUI();
                document.getElementById('profileUsername').textContent = userData.username || 'User';
                document.getElementById('profileEmail').textContent = userData.email || '';
                document.getElementById('loginError').innerHTML = '';
                showToast(`Welcome back, ${userData.username}!`, 'success');
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
                if (modal) modal.hide();
                loginForm.reset();
                
                console.log('✅ Login complete!');
                
            } catch (error) {
                console.error('❌ Login error:', error);
                document.getElementById('loginError').innerHTML = 
                    `<div class="status-error">❌ ${error.message}</div>`;
                showToast(error.message, 'error');
            }
        });
    }
    
    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('profileLogoutBtn')?.addEventListener('click', logout);
    
    // Change password
    document.getElementById('changePasswordBtn')?.addEventListener('click', function() {
        if (!window.accessToken) {
            showToast('Please login first', 'error');
            return;
        }
        document.getElementById('changePasswordModal').modal('show');
    });
    
    document.getElementById('changePasswordForm')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        const oldPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        
        try {
            await apiRequest('/api/user/change-password', {
                method: 'POST',
                body: JSON.stringify({ old_password: oldPassword, new_password: newPassword })
            });
            
            showToast('Password changed successfully!', 'success');
            document.getElementById('changePasswordModal').modal('hide');
            this.reset();
            document.getElementById('changePasswordError').innerHTML = '';
            
        } catch (error) {
            document.getElementById('changePasswordError').innerHTML = 
                `<div class="status-error">${error.message}</div>`;
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
    if (!window.accessToken) return;
    
    try {
        const user = await apiRequest('/api/auth/me');
        window.currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        document.getElementById('profileUsername').textContent = user.username || 'User';
        document.getElementById('profileEmail').textContent = user.email || '';
        updateAuthUI();
        
    } catch (error) {
        console.error('Failed to load profile:', error);
    }
}
