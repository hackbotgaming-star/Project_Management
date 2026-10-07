// Modern Toast Notification Utility to replace native browser alert dialogs
(function() {
  function ensureToastContainer() {
    let container = document.getElementById('projecthub-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'projecthub-toast-container';
      container.className = 'fixed top-5 right-5 z-[99999] flex flex-col gap-2.5 max-w-md w-full pointer-events-none px-4 sm:px-0';
      document.body.appendChild(container);
    }
    return container;
  }

  // Prettify common alert messages to concise status text
  function formatAlertMessage(msg) {
    if (!msg) return { title: 'Successful', text: '', type: 'success' };
    
    let str = String(msg).trim();
    let lower = str.toLowerCase();
    
    // Check type
    let type = 'success';
    if (lower.includes('failed') || lower.includes('error') || lower.includes('invalid') || lower.includes('denied') || lower.includes('not found')) {
      type = 'error';
    } else if (lower.includes('warning') || lower.includes('caution') || lower.includes('please fill')) {
      type = 'warning';
    }

    // Determine concise title
    let title = 'Successful';
    if (lower.includes('upload')) {
      title = type === 'success' ? 'Uploaded' : 'Upload Failed';
    } else if (lower.includes('submit')) {
      title = type === 'success' ? 'Submitted' : 'Submission Failed';
    } else if (lower.includes('created') || lower.includes('create')) {
      title = type === 'success' ? 'Created' : 'Creation Failed';
    } else if (lower.includes('updated') || lower.includes('update') || lower.includes('saved')) {
      title = type === 'success' ? 'Updated' : 'Update Failed';
    } else if (lower.includes('delete') || lower.includes('removed')) {
      title = type === 'success' ? 'Removed' : 'Failed to Remove';
    } else if (lower.includes('approved') || lower.includes('reviewed')) {
      title = type === 'success' ? 'Approved' : 'Action Failed';
    } else if (type === 'error') {
      title = 'Error';
    }

    return { title, text: str, type };
  }

  let lastToastKey = '';
  let lastToastTime = 0;

  window.showToast = function(message, customType, customTitle) {
    const container = ensureToastContainer();
    const parsed = formatAlertMessage(message);
    const type = customType || parsed.type;
    const title = customTitle || parsed.title;
    const text = (customTitle ? message : parsed.text) || '';

    // Prevent immediate duplicate toasts (debouncing within 500ms)
    const key = `${type}:${title}:${text}`;
    const now = Date.now();
    if (key === lastToastKey && (now - lastToastTime) < 500) {
      return;
    }
    lastToastKey = key;
    lastToastTime = now;

    const toast = document.createElement('div');
    const isLight = document.documentElement.classList.contains('light');

    let icon = 'check_circle';
    let borderClass = isLight 
      ? 'border-emerald-500/40 bg-white/95 text-emerald-700 shadow-emerald-950/10' 
      : 'border-emerald-500/30 bg-[#0e1615]/95 text-emerald-400';
    let titleClass = isLight ? 'text-emerald-700 font-bold' : 'text-emerald-400 font-semibold';
    let iconColor = isLight ? 'text-emerald-600' : 'text-emerald-400';
    let textClass = isLight ? 'text-slate-700 font-medium' : 'text-slate-300 font-medium';

    if (type === 'error') {
      icon = 'error';
      borderClass = isLight 
        ? 'border-rose-500/40 bg-white/95 text-rose-700 shadow-rose-950/10' 
        : 'border-rose-500/30 bg-[#1a0e12]/95 text-rose-400';
      titleClass = isLight ? 'text-rose-700 font-bold' : 'text-rose-400 font-semibold';
      iconColor = isLight ? 'text-rose-600' : 'text-rose-400';
    } else if (type === 'warning') {
      icon = 'warning';
      borderClass = isLight 
        ? 'border-amber-500/40 bg-white/95 text-amber-800 shadow-amber-950/10' 
        : 'border-amber-500/30 bg-[#19150a]/95 text-amber-400';
      titleClass = isLight ? 'text-amber-800 font-bold' : 'text-amber-400 font-semibold';
      iconColor = isLight ? 'text-amber-600' : 'text-amber-400';
    } else if (type === 'info') {
      icon = 'info';
      borderClass = isLight 
        ? 'border-indigo-500/40 bg-white/95 text-indigo-700 shadow-indigo-950/10' 
        : 'border-blue-500/30 bg-[#0d141e]/95 text-blue-400';
      titleClass = isLight ? 'text-indigo-700 font-bold' : 'text-blue-400 font-semibold';
      iconColor = isLight ? 'text-indigo-600' : 'text-blue-400';
    }

    toast.className += ` ${borderClass}`;

    toast.innerHTML = `
      <span class="material-symbols-outlined ${iconColor} text-2xl shrink-0 mt-0.5">${icon}</span>
      <div class="flex-1 min-w-0 pr-2">
        <h4 class="${titleClass} text-xs tracking-wider uppercase">${title}</h4>
        <p class="${textClass} text-xs mt-0.5 break-words leading-relaxed">${text}</p>
      </div>
      <button class="shrink-0 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors p-1" onclick="this.parentElement.remove()">
        <span class="material-symbols-outlined text-base">close</span>
      </button>
    `;

    container.appendChild(toast);

    // Trigger enter animation
    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-[-10px]', 'opacity-0');
      toast.classList.add('translate-y-0', 'opacity-100');
    });

    // Auto dismiss
    setTimeout(() => {
      toast.classList.remove('translate-y-0', 'opacity-100');
      toast.classList.add('translate-y-[-10px]', 'opacity-0');
      setTimeout(() => {
        if (toast.parentElement) toast.remove();
      }, 300);
    }, 3800);
  };

  // Completely override window.alert so no "localhost:5000 says" modal ever shows
  window.alert = function(msg) {
    window.showToast(msg);
  };
})();
