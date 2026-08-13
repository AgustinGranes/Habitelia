import { iconSVG } from './icons.js';

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

        if (window.innerWidth <= 480) {
            container.style.top = '16px';
            container.style.left = '16px';
            container.style.right = '16px';
            container.style.maxWidth = 'none';
            container.style.alignItems = 'center';
        }
    }

    const toast = document.createElement('div');
    toast.className = 'monochrome-toast-box';
    toast.style.padding = '14px 18px';
    toast.style.borderRadius = '12px';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '12px';
    toast.style.width = '100%';
    toast.style.background = 'rgba(23, 23, 23, 0.95)';
    toast.style.border = '1px solid rgba(255, 255, 255, 0.15)';
    toast.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.5)';
    toast.style.backdropFilter = 'blur(12px)';
    toast.style.pointerEvents = 'auto';
    
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-12px)';
    toast.style.transition = 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)';
    
    const iconName = type === 'error' ? 'alert' : (type === 'info' ? 'info' : 'check');

    toast.innerHTML = `
        <div style="width: 24px; height: 24px; border-radius: 50%; background: #FAFAFA; color: #0A0A0A; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            ${iconSVG(iconName, 14)}
        </div>
        <span style="flex: 1; font-size: 13.5px; font-weight: 500; color: #FAFAFA; line-height: 1.4;">${message}</span>
    `;

    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-12px)';
        setTimeout(() => {
            toast.remove();
        }, 250);
    }, duration);
}
