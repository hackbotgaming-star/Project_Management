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

    // Prevent immediate duplicate toasts (debouncing within 600ms)
    const key = `${type}:${title}:${text}`;
    const now = Date.now();
    if (key === lastToastKey && (now - lastToastTime) < 600) {
      return;
    }
    lastToastKey = key;
    lastToastTime = now;

    const toast = document.createElement('div');
    const isLight = document.documentElement.classList.contains('light');

    let icon = 'check_circle';
    let iconBg = isLight ? 'bg-emerald-100 text-emerald-600' : 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30';
    let cardClasses = isLight 
      ? 'bg-white/95 text-slate-800 border-emerald-500/40 shadow-xl shadow-slate-200/50' 
      : 'bg-[#111622]/95 text-slate-100 border-emerald-500/40 shadow-2xl shadow-black/60';
    let titleClass = isLight ? 'text-emerald-700' : 'text-emerald-400';
    let textClass = isLight ? 'text-slate-600' : 'text-slate-300';

    if (type === 'error') {
      icon = 'error';
      iconBg = isLight ? 'bg-rose-100 text-rose-600' : 'bg-rose-950/80 text-rose-400 border border-rose-500/30';
      cardClasses = isLight 
        ? 'bg-white/95 text-slate-800 border-rose-500/40 shadow-xl shadow-slate-200/50' 
        : 'bg-[#1a1118]/95 text-slate-100 border-rose-500/40 shadow-2xl shadow-black/60';
      titleClass = isLight ? 'text-rose-700' : 'text-rose-400';
      textClass = isLight ? 'text-slate-600' : 'text-slate-300';
    } else if (type === 'warning') {
      icon = 'warning';
      iconBg = isLight ? 'bg-amber-100 text-amber-600' : 'bg-amber-950/80 text-amber-400 border border-amber-500/30';
      cardClasses = isLight 
        ? 'bg-white/95 text-slate-800 border-amber-500/40 shadow-xl shadow-slate-200/50' 
        : 'bg-[#1c1810]/95 text-slate-100 border-amber-500/40 shadow-2xl shadow-black/60';
      titleClass = isLight ? 'text-amber-700' : 'text-amber-400';
      textClass = isLight ? 'text-slate-600' : 'text-slate-300';
    } else if (type === 'info') {
      icon = 'info';
      iconBg = isLight ? 'bg-indigo-100 text-indigo-600' : 'bg-indigo-950/80 text-indigo-400 border border-indigo-500/30';
      cardClasses = isLight 
        ? 'bg-white/95 text-slate-800 border-indigo-500/40 shadow-xl shadow-slate-200/50' 
        : 'bg-[#101426]/95 text-slate-100 border-indigo-500/40 shadow-2xl shadow-black/60';
      titleClass = isLight ? 'text-indigo-700' : 'text-indigo-400';
      textClass = isLight ? 'text-slate-600' : 'text-slate-300';
    }

    toast.className = `projecthub-toast pointer-events-auto flex items-start gap-3.5 p-3.5 sm:p-4 rounded-xl border backdrop-blur-xl transition-all duration-300 ease-out transform -translate-y-3 opacity-0 w-full ${cardClasses}`;
    toast.style.backdropFilter = 'blur(16px)';
    toast.style.webkitBackdropFilter = 'blur(16px)';

    toast.innerHTML = `
      <div class="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${iconBg}">
        <span class="material-symbols-outlined text-[20px] select-none">${icon}</span>
      </div>
      <div class="flex-1 min-w-0 pt-0.5">
        <h4 class="${titleClass} font-bold text-xs uppercase tracking-wider leading-none mb-1">${title}</h4>
        <p class="${textClass} text-xs leading-relaxed break-words font-medium">${text}</p>
      </div>
      <button type="button" aria-label="Dismiss notification" class="shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10" onclick="this.closest('.projecthub-toast').remove()">
        <span class="material-symbols-outlined text-base block select-none">close</span>
      </button>
    `;

    container.appendChild(toast);

    // Trigger enter animation
    requestAnimationFrame(() => {
      toast.classList.remove('-translate-y-3', 'opacity-0');
      toast.classList.add('translate-y-0', 'opacity-100');
    });

    // Auto dismiss
    const dismissTimer = setTimeout(() => {
      if (!toast.parentElement) return;
      toast.classList.remove('translate-y-0', 'opacity-100');
      toast.classList.add('-translate-y-2', 'opacity-0');
      setTimeout(() => {
        if (toast.parentElement) toast.remove();
      }, 300);
    }, 4000);
  };

  // Completely override window.alert so no "localhost:5000 says" modal ever shows
  window.alert = function(msg) {
    window.showToast(msg);
  };
})();
