// Modern Toast Notification Utility to replace native browser alert dialogs
(function() {
  // Universal HTML escape helper to prevent XSS and ReferenceErrors across all dashboards
  window.escapeHtml = function(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  // Modern SVG Progress Status Line Graph Generator
  window.renderProgressLineGraph = function(percent, options = {}) {
    const p = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
    const width = options.width || '100%';
    const height = options.height || 38;
    const strokeColor = options.color || '#818cf8';
    const showLabel = options.showLabel !== false;
    const graphId = 'lineGraph_' + Math.random().toString(36).substring(2, 9);

    const minY = 32;
    const maxY = 6;
    const rangeY = minY - maxY;

    const activeX = 6 + (p / 100) * 88;
    const activeY = minY - (p / 100) * rangeY;

    const pt0 = [6, minY];
    const pt1 = [28, minY - (Math.min(25, p) / 100) * rangeY * (p >= 25 ? 1 : p / 25)];
    const pt2 = [50, minY - (Math.min(50, p) / 100) * rangeY * (p >= 50 ? 1 : p / 50)];
    const pt3 = [72, minY - (Math.min(75, p) / 100) * rangeY * (p >= 75 ? 1 : p / 75)];
    const pt4 = [94, minY - (p / 100) * rangeY];

    const linePath = `M ${pt0[0]},${pt0[1]} Q 17,${(pt0[1] + pt1[1]) / 2} ${pt1[0]},${pt1[1]} T ${pt2[0]},${pt2[1]} T ${pt3[0]},${pt3[1]} T ${pt4[0]},${pt4[1]}`;
    const areaPath = `${linePath} L ${pt4[0]},34 L ${pt0[0]},34 Z`;

    let stageText = 'Planning';
    if (p >= 100) stageText = 'Completed';
    else if (p >= 75) stageText = 'Final Defense';
    else if (p >= 50) stageText = 'Development';
    else if (p >= 25) stageText = 'Architecture';

    return `
      <div class="progress-line-graph-widget flex flex-col gap-1 w-full select-none" style="max-width: ${typeof width === 'number' ? width + 'px' : width};" title="Progress Status: ${p}% (${stageText})">
        ${showLabel ? `
          <div class="flex items-center justify-between text-[11px] font-mono leading-none">
            <span class="flex items-center gap-1.5 text-outline">
              <span class="inline-block w-2 h-2 rounded-full" style="background-color: ${strokeColor};"></span>
              <span class="font-medium text-on-surface">Status Trend</span>
            </span>
            <span class="font-bold text-[10px] px-1.5 py-0.5 rounded bg-surface-container-high/80" style="color: ${strokeColor};">${stageText}</span>
          </div>
        ` : ''}
        <div class="relative w-full h-[${height}px] bg-surface-container/50 rounded-xl p-1.5 border border-outline-variant/20 overflow-hidden shadow-inner">
          <svg viewBox="0 0 100 36" class="w-full h-full overflow-visible" preserveAspectRatio="none">
            <defs>
              <linearGradient id="${graphId}" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="${strokeColor}" stop-opacity="0.32" />
                <stop offset="100%" stop-color="${strokeColor}" stop-opacity="0.0" />
              </linearGradient>
            </defs>
            <line x1="6" y1="32" x2="94" y2="32" stroke="currentColor" stroke-opacity="0.12" stroke-dasharray="2,2" />
            <line x1="6" y1="19" x2="94" y2="19" stroke="currentColor" stroke-opacity="0.07" stroke-dasharray="2,2" />
            <line x1="6" y1="6" x2="94" y2="6" stroke="currentColor" stroke-opacity="0.07" stroke-dasharray="2,2" />
            
            <path d="${areaPath}" fill="url(#${graphId})" />
            
            ${p < 100 ? `<line x1="${activeX}" y1="${activeY}" x2="94" y2="6" stroke="${strokeColor}" stroke-opacity="0.3" stroke-dasharray="2,2" stroke-width="1.2" />` : ''}
            
            <path d="${linePath}" fill="none" stroke="${strokeColor}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
            
            <circle cx="6" cy="${pt0[1]}" r="2" fill="${strokeColor}" opacity="0.7" />
            <circle cx="28" cy="${pt1[1]}" r="2" fill="${strokeColor}" opacity="${p >= 25 ? '0.9' : '0.4'}" />
            <circle cx="50" cy="${pt2[1]}" r="2" fill="${strokeColor}" opacity="${p >= 50 ? '0.9' : '0.4'}" />
            <circle cx="72" cy="${pt3[1]}" r="2" fill="${strokeColor}" opacity="${p >= 75 ? '0.9' : '0.4'}" />
            <circle cx="94" cy="${pt4[1]}" r="2" fill="${strokeColor}" opacity="${p >= 100 ? '0.9' : '0.4'}" />
            
            <circle cx="${activeX}" cy="${activeY}" r="3.4" fill="${strokeColor}" />
            <circle cx="${activeX}" cy="${activeY}" r="6" fill="none" stroke="${strokeColor}" stroke-opacity="0.6" class="animate-ping" style="transform-origin: ${activeX}px ${activeY}px;" />
          </svg>
        </div>
      </div>
    `;
  };

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
