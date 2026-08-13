import { iconSVG } from './icons.js';

export function showToast(message, type = 'success', duration = 3000) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.position = 'fixed';
        container.style.top = '16px';
        container.style.right = '16px';
        container.style.left = 'auto';
        container.style.bottom = 'auto';
        container.style.zIndex = '10000';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '8px';
        container.style.alignItems = 'flex-end';
        container.style.maxWidth = '290px';
        container.style.pointerEvents = 'none';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'monochrome-toast-box';
    toast.style.padding = '10px 14px';
    toast.style.borderRadius = '12px';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '10px';
    toast.style.width = 'max-content';
    toast.style.maxWidth = '280px';
    toast.style.background = 'rgba(18, 18, 18, 0.95)';
    toast.style.border = '1px solid var(--border-subtle)';
    toast.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.6)';
    toast.style.backdropFilter = 'blur(12px)';
    toast.style.pointerEvents = 'auto';
    toast.style.boxSizing = 'border-box';
    
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    toast.style.transition = 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)';

    toast.innerHTML = `
        <div style="width: 22px; height: 22px; border-radius: 50%; background: rgba(255, 255, 255, 0.12); color: #FFFFFF; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            ${iconSVG('info', 13)}
        </div>
        <span style="flex: 1; font-size: 12.5px; font-weight: 500; color: #FFFFFF; line-height: 1.35;">${message}</span>
    `;

    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        setTimeout(() => {
            toast.remove();
        }, 250);
    }, duration);
}
