// js/auth.js - Complete updated version with shared state
document.addEventListener('DOMContentLoaded', function() {
    // Load saved auth state
    loadAuthState();
    
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
            console.log('📤 Sending registration to:', `${API_BASE}/api/auth/register`);
            
            try {
                const response = await fetch(`${API_BASE}/api/auth/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestData)
                });
                
                console.log('📥 Registration response status:', response.status);
                
                let data;
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    data = await response.json();
                } else {
                    data = await response.text();
                }
                
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
                    
                    // Auto-fill login form
                    document.getElementById('loginUsername').value = username;
                    document.getElementById('loginPassword').value = password;
                    
                    // Show login modal
                    const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
                    loginModal.show();
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
                
                if (!response.ok) {
                    if (response.status === 401) {
                        document.getElementById('loginError').innerHTML = 
                            `<div class="status-error">❌ Invalid username or password. Please register first.</div>`;
                        showToast('Invalid credentials. Please register or try again.', 'error');
                        return;
                    }
                    const errorMessage = typeof data === 'object' ? data.detail || data.message || 'Login failed' : data;
                    throw new Error(errorMessage);
                }
                
                // ✅ SAVE TOKEN using shared state
                const token = data.access_token;
                console.log('🔑 Token received:', token.substring(0, 30) + '...');
                
                // Get user info
                console.log('🔄 Getting user info...');
                const userResponse = await fetch(`${API_BASE}/api/auth/me`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!userResponse.ok) {
                    throw new Error('Failed to get user information');
                }
                
                const userData = await userResponse.json();
                console.log('👤 User data:', userData);
                
                // ✅ Set auth state using shared function
                setAuthState(token, userData);
                
                // ✅ Update UI
                updateAuthUI();
                document.getElementById('loginError').innerHTML = '';
                showToast(`Welcome back, ${userData.username}!`, 'success');
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
                if (modal) modal.hide();
                loginForm.reset();
                
                // Load files and messages if authenticated
                if (authState.isAuthenticated) {
                    loadFiles();
                    loadMessages();
                }
                
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
        if (!authState.isAuthenticated) {
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
    
    clearAuthState();
    showToast('Logged out successfully', 'info');
    showSection('home');
}
