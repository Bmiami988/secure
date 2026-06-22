// js/files.js
document.addEventListener('DOMContentLoaded', function() {
    // Upload form
    $('#uploadForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        await uploadFile();
    });
});

async function uploadFile() {
    if (!accessToken) {
        showToast('Please login first', 'error');
        return;
    }
    
    const fileInput = $('#fileInput');
    const key = $('#fileKey').value;
    const expiry = $('#fileExpiry').value || 7;
    const status = $('#uploadStatus');
    
    if (!fileInput.files.length) {
        showToast('Please select a file', 'error');
        return;
    }
    
    if (!key) {
        showToast('Please enter encryption key', 'error');
        return;
    }
    
    const file = fileInput.files[0];
    
    try {
        status.innerHTML = '<div class="status-loading"><i class="fas fa-spinner fa-spin me-2"></i>Uploading and encrypting...</div>';
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('password', key);
        formData.append('days_to_expire', expiry);
        
        const response = await fetch(`${API_BASE}/api/files/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || 'Upload failed');
        }
        
        status.innerHTML = `<div class="status-success">
            <i class="fas fa-check-circle me-2"></i>
            Uploaded: ${data.original_filename} (${formatFileSize(data.size)})
            <br><small>Expires: ${new Date(data.expires_at).toLocaleString()}</small>
        </div>`;
        
        showToast('File uploaded and encrypted!', 'success');
        fileInput.value = '';
        $('#fileKey').value = '';
        loadFiles();
        
    } catch (error) {
        status.innerHTML = `<div class="status-error"><i class="fas fa-exclamation-circle me-2"></i>${error.message}</div>`;
        showToast(error.message, 'error');
    }
}

async function loadFiles() {
    if (!accessToken) return;
    
    const container = $('#fileList');
    
    try {
        const files = await apiRequest('/api/files/list');
        
        if (files.length === 0) {
            container.innerHTML = `
                <div class="text-center text-secondary py-5">
                    <i class="fas fa-cloud-upload-alt fa-3x mb-3 d-block"></i>
                    <p>No files uploaded yet</p>
                    <small>Upload your first encrypted file</small>
                </div>
            `;
            return;
        }
        
        container.innerHTML = files.map(file => `
            <div class="file-item">
                <div class="d-flex align-items-center">
                    <i class="fas fa-file file-icon"></i>
                    <div class="file-info">
                        <div class="file-name">${file.original_filename}</div>
                        <div class="file-meta">
                            ${formatFileSize(file.size)} • 
                            <i class="far fa-clock me-1"></i>
                            ${new Date(file.created_at).toLocaleString()}
                            ${file.expires_at ? ` • Expires: ${new Date(file.expires_at).toLocaleString()}` : ''}
                        </div>
                    </div>
                </div>
                <div class="d-flex gap-2">
                    <button class="btn btn-sm btn-primary download-file" data-id="${file.file_id}">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-file" data-id="${file.file_id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
        
        // Download handlers
        container.querySelectorAll('.download-file').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                downloadFile(id);
            });
        });
        
        // Delete handlers
        container.querySelectorAll('.delete-file').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                if (confirm('Delete this file?')) {
                    deleteFile(id);
                }
            });
        });
        
    } catch (error) {
        container.innerHTML = `<div class="text-center text-secondary py-3">Failed to load files: ${error.message}</div>`;
    }
}

async function downloadFile(fileId) {
    if (!accessToken) return;
    
    const password = prompt('Enter the encryption key for this file:');
    if (!password) return;
    
    try {
        showToast('Downloading and decrypting...', 'info');
        
        const response = await fetch(`${API_BASE}/api/files/download/${fileId}?password=${encodeURIComponent(password)}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Download failed');
        }
        
        // Get filename from Content-Disposition header
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'downloaded_file';
        if (contentDisposition) {
            const match = contentDisposition.match(/filename="(.+)"/);
            if (match) filename = match[1];
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showToast('File downloaded successfully!', 'success');
        loadFiles();
        
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function deleteFile(fileId) {
    if (!accessToken) return;
    
    try {
        await apiRequest(`/api/files/${fileId}`, {
            method: 'DELETE'
        });
        
        showToast('File deleted successfully', 'success');
        loadFiles();
        
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
}