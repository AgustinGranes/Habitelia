export function showToast(message, type = 'info', duration = 3000) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.position = 'fixed';
        container.style.bottom = '30px';
        container.style.left = '50%';
        container.style.transform = 'translateX(-50%)';
        container.style.zIndex = '9999';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '10px';
        container.style.alignItems = 'center';
        container.style.width = '90%';
        container.style.maxWidth = '400px';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type} glass-card`;
    toast.style.padding = '14px 20px';
    toast.style.borderRadius = '12px';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '12px';
    toast.style.width = '100%';
    toast.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)';
    
    // Animation handling via inline styles to ensure it works without external css dependencies if needed
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';

    if (type === 'success') toast.style.borderLeft = '4px solid #4CAF50';
    if (type === 'error') toast.style.borderLeft = '4px solid #F44336';
    if (type === 'info') toast.style.borderLeft = '4px solid #2196F3';

    toast.innerHTML = `
        <span style="font-size: 20px;">${icon}</span>
        <span style="flex:1; font-size:15px; font-weight: 500; color: #fff;">${message}</span>
    `;

    container.appendChild(toast);

    // Trigger reflow and animate in
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, duration);
}
