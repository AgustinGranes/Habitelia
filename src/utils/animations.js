export function onLongPress(element, callback, duration = 800) {
  let timer;
  let isPressing = false;

  const startPress = (e) => {
    isPressing = true;
    element.style.transform = 'scale(0.95)';
    element.style.transition = `transform ${duration}ms ease-out`;
    timer = setTimeout(() => {
      if (isPressing) {
        if (navigator.vibrate) navigator.vibrate(50);
        callback(e);
      }
    }, duration);
  };

  const endPress = () => {
    isPressing = false;
    element.style.transform = '';
    element.style.transition = 'transform 0.2s ease';
    clearTimeout(timer);
  };

  element.addEventListener('mousedown', startPress);
  element.addEventListener('touchstart', startPress, { passive: true });
  element.addEventListener('mouseup', endPress);
  element.addEventListener('mouseleave', endPress);
  element.addEventListener('touchend', endPress);

  return () => {
    element.removeEventListener('mousedown', startPress);
    element.removeEventListener('touchstart', startPress);
    element.removeEventListener('mouseup', endPress);
    element.removeEventListener('mouseleave', endPress);
    element.removeEventListener('touchend', endPress);
  };
}

export function onSwipeLeft(element, callback, threshold = 80) {
  let startX = 0;
  let currentX = 0;

  const handleTouchStart = (e) => {
    startX = e.touches[0].clientX;
    element.style.transition = 'none';
  };

  const handleTouchMove = (e) => {
    if (!startX) return;
    currentX = e.touches[0].clientX;
    const diff = currentX - startX;
    
    if (diff < 0) {
      element.style.transform = `translateX(${diff}px)`;
    }
  };

  const handleTouchEnd = () => {
    if (!startX || !currentX) return;
    const diff = currentX - startX;
    
    element.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';
    if (diff < -threshold) {
      callback();
    } else {
      element.style.transform = 'translateX(0)';
    }
    
    startX = 0;
    currentX = 0;
  };

  element.addEventListener('touchstart', handleTouchStart, { passive: true });
  element.addEventListener('touchmove', handleTouchMove, { passive: true });
  element.addEventListener('touchend', handleTouchEnd);

  return () => {
    element.removeEventListener('touchstart', handleTouchStart);
    element.removeEventListener('touchmove', handleTouchMove);
    element.removeEventListener('touchend', handleTouchEnd);
  };
}

export function animateIn(element, animationClass = 'fade-in', duration = 300) {
  element.classList.add(animationClass);
  setTimeout(() => {
    element.classList.remove(animationClass);
  }, duration);
}

export function animateOut(element, animationClass = 'fade-out', duration = 300) {
  return new Promise(resolve => {
    element.classList.add(animationClass);
    setTimeout(() => {
      resolve();
    }, duration);
  });
}

export function staggerChildren(parent, animationClass = 'fade-in', delay = 100) {
  const children = Array.from(parent.children);
  children.forEach((child, index) => {
    child.style.animationDelay = `${index * delay}ms`;
    child.classList.add(animationClass);
  });
}

export function pageTransition(container, newHTML, direction = 'left') {
  container.classList.add(`slide-out-${direction}`);
  setTimeout(() => {
    container.innerHTML = newHTML;
    container.classList.remove(`slide-out-${direction}`);
    container.classList.add(`slide-in-${direction}`);
    setTimeout(() => {
      container.classList.remove(`slide-in-${direction}`);
    }, 300);
  }, 300);
}
