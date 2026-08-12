export function showToast(message, type = 'success', duration = 3000) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.position = 'fixed';
        container.style.top = '24px';
        container.style.right = '24px';
        container.style.zIndex = '10000';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '10px';
        container.style.alignItems = 'flex-end';
        container.style.width = 'calc(100% - 32px)';
        container.style.maxWidth = '380px';
        container.style.pointerEvents = 'none';
        document.body.appendChild(container);

        // Adjust for mobile screens
        if (window.innerWidth <= 480) {
            container.style.top = '16px';
            container.style.left = '16px';
            container.style.right = '16px';
            container.style.maxWidth = 'none';
            container.style.alignItems = 'center';
        }
    }

    const toast = document.createElement('div');
    toast.className = 'toast-green-box';
    toast.style.padding = '14px 20px';
    toast.style.borderRadius = '14px';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '12px';
    toast.style.width = '100%';
    toast.style.background = 'rgba(20, 50, 24, 0.95)';
    toast.style.border = '1px solid #4CAF50';
    toast.style.boxShadow = '0 8px 24px rgba(76, 175, 80, 0.35)';
    toast.style.backdropFilter = 'blur(12px)';
    toast.style.pointerEvents = 'auto';
    
    // Animation handling
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px)';
    toast.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
    
    toast.innerHTML = `
        <div style="width: 26px; height: 26px; border-radius: 50%; background: #4CAF50; color: #0D0D11; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px; flex-shrink: 0;">✓</div>
        <span style="flex: 1; font-size: 14px; font-weight: 600; color: #FFFFFF; line-height: 1.4;">${message}</span>
    `;

    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-15px)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, duration);
}
