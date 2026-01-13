// Shared utility functions

async function checkAuth() {
    const response = await fetch('/api/auth-status');
    const data = await response.json();
    return data.authenticated;
}

async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    location.href = 'index.html';
}

function showError(message) {
    alert(message);
}

function showSuccess(message) {
    alert(message);
}
