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
    
    const errorKeywords = [
      'failed', 'fail', 'error', 'invalid', 'denied', 'not found', 
      'already exists', 'exists', 'exist', 'cannot', 'can not', "can't", 
      'could not', 'conflict', 'required', 'wrong', 'expired', 'rejected', 
      'unable', 'forbidden', 'duplicate', 'unauthorized', 'incorrect', 
      'missing', 'exceeded', 'reject', 'mismatch', 'disabled', 'limit'
    ];

    const warningKeywords = [
      'warning', 'caution', 'please fill', 'please select', 'please check',
      'attention', 'incomplete'
    ];

    let type = 'success';
    if (errorKeywords.some(kw => lower.includes(kw))) {
      type = 'error';
    } else if (warningKeywords.some(kw => lower.includes(kw))) {
      type = 'warning';
    }

    // Determine concise title
    let title = 'Successful';
    if (type === 'error') {
      if (lower.includes('exist') || lower.includes('duplicate')) {
        title = 'Duplicate Entry';
      } else if (lower.includes('upload')) {
        title = 'Upload Failed';
      } else if (lower.includes('submit')) {
        title = 'Submission Failed';
      } else if (lower.includes('created') || lower.includes('create')) {
        title = 'Creation Failed';
      } else if (lower.includes('updated') || lower.includes('update') || lower.includes('save')) {
        title = 'Update Failed';
      } else if (lower.includes('delete') || lower.includes('remove')) {
        title = 'Failed to Remove';
      } else if (lower.includes('password') || lower.includes('login') || lower.includes('auth')) {
        title = 'Authentication Error';
      } else {
        title = 'Action Failed';
      }
    } else if (type === 'warning') {
      title = 'Warning';
    } else {
      if (lower.includes('upload')) {
        title = 'Uploaded';
      } else if (lower.includes('submit')) {
        title = 'Submitted';
      } else if (lower.includes('created') || lower.includes('create')) {
        title = 'Created';
      } else if (lower.includes('updated') || lower.includes('update') || lower.includes('saved')) {
        title = 'Updated';
      } else if (lower.includes('delete') || lower.includes('removed')) {
        title = 'Removed';
      } else if (lower.includes('approved') || lower.includes('reviewed')) {
        title = 'Approved';
      }
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

    let icon = 'check_circle';
    if (type === 'error') {
      icon = 'error';
    } else if (type === 'warning') {
      icon = 'warning';
    } else if (type === 'info') {
      icon = 'info';
    }

    const toast = document.createElement('div');
    toast.className = `projecthub-toast toast-${type}`;
    toast.style.transform = 'translateY(-12px)';
    toast.style.opacity = '0';

    toast.innerHTML = `
      <div class="projecthub-toast-icon-wrap">
        <span class="material-symbols-outlined" style="font-size: 20px; line-height: 1; user-select: none;">${icon}</span>
      </div>
      <div class="projecthub-toast-content">
        <h4 class="projecthub-toast-title">${title}</h4>
        <p class="projecthub-toast-message">${text}</p>
      </div>
      <button type="button" aria-label="Dismiss notification" class="projecthub-toast-close" onclick="this.closest('.projecthub-toast').remove()">
        <span class="material-symbols-outlined" style="font-size: 18px; line-height: 1; user-select: none;">close</span>
      </button>
    `;

    container.appendChild(toast);

    // Trigger enter animation
    requestAnimationFrame(() => {
      toast.style.transform = 'translateY(0)';
      toast.style.opacity = '1';
    });

    // Auto dismiss
    const dismissTimer = setTimeout(() => {
      if (!toast.parentElement) return;
      toast.style.transform = 'translateY(-10px)';
      toast.style.opacity = '0';
      setTimeout(() => {
        if (toast.parentElement) toast.remove();
      }, 300);
    }, 4200);
  };

  // Completely override window.alert so no "localhost:5000 says" modal ever shows
  window.alert = function(msg) {
    window.showToast(msg);
  };
})();
