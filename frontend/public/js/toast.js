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

  // Cartesian Progress Status Line Graph Generator matching user reference
  window.renderProgressLineGraph = function(percent, options = {}) {
    const p = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
    const isCompact = options.compact === true || (options.height && options.height <= 110);
    const strokeColor = options.color || '#ff5436'; // Vibrant Coral-Red matching reference image
    const axisColor = options.axisColor || '#94a3b8';
    const showHeader = options.showLabel !== false;

    // Base values from user's chart: [200, 290, 290, 500, 470, 600, 780, 900, 660, 700, 510]
    const baseRaw = [200, 290, 290, 500, 470, 600, 780, 900, 660, 700, 510];
    const scale = p > 0 ? (p / 70) : 0.2;
    const values = baseRaw.map(v => Math.min(1000, Math.max(30, Math.round(v * scale))));
    const activeIdx = Math.min(10, Math.max(0, Math.round(p / 10)));

    let stageText = 'Planning';
    if (p >= 100) stageText = 'Completed';
    else if (p >= 75) stageText = 'Defense Phase';
    else if (p >= 50) stageText = 'Development';
    else if (p >= 25) stageText = 'Architecture';

    if (isCompact) {
      const leftM = 30, rightM = 190, bottomM = 78, topM = 14;
      const xStep = (rightM - leftM) / 10;
      const yRange = bottomM - topM;

      const coords = values.map((val, i) => ({
        x: Math.round((leftM + i * xStep) * 10) / 10,
        y: Math.round((bottomM - (val / 1000) * yRange) * 10) / 10
      }));
      const pointsStr = coords.map(c => `${c.x},${c.y}`).join(' ');

      return `
        <div class="progress-line-graph-widget flex flex-col gap-1 w-full select-none" style="max-width: ${typeof options.width === 'number' ? options.width + 'px' : (options.width || '100%')};" title="Progress Status: ${p}% (${stageText})">
          ${showHeader ? `
            <div class="flex items-center justify-between text-[10px] font-mono leading-none mb-0.5">
              <span class="text-outline flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full" style="background-color: ${strokeColor};"></span>
                <span>Status</span>
              </span>
              <span class="font-bold text-[10px]" style="color: ${strokeColor};">${p}% &bull; ${stageText}</span>
            </div>
          ` : ''}
          <div class="w-full bg-surface-container/30 rounded-xl p-1.5 border border-outline-variant/20 overflow-hidden">
            <svg viewBox="0 0 210 100" class="w-full h-auto overflow-visible" preserveAspectRatio="xMidYMid meet">
              <!-- Y-Axis line -->
              <line x1="${leftM}" y1="${topM}" x2="${leftM}" y2="${bottomM}" stroke="${axisColor}" stroke-opacity="0.35" stroke-width="1.2" />
              <!-- X-Axis line -->
              <line x1="${leftM}" y1="${bottomM}" x2="${rightM}" y2="${bottomM}" stroke="${axisColor}" stroke-opacity="0.35" stroke-width="1.2" />

              <!-- Y-Axis Ticks & Labels: 1000, 500, 0 -->
              <line x1="${leftM - 4}" y1="${topM}" x2="${leftM}" y2="${topM}" stroke="${axisColor}" stroke-opacity="0.35" stroke-width="1.2" />
              <text x="${leftM - 6}" y="${topM + 3}" text-anchor="end" font-size="8" fill="currentColor" opacity="0.6" font-family="sans-serif">1000</text>

              <line x1="${leftM - 4}" y1="${(topM + bottomM)/2}" x2="${leftM}" y2="${(topM + bottomM)/2}" stroke="${axisColor}" stroke-opacity="0.35" stroke-width="1.2" />
              <text x="${leftM - 6}" y="${(topM + bottomM)/2 + 3}" text-anchor="end" font-size="8" fill="currentColor" opacity="0.6" font-family="sans-serif">500</text>

              <line x1="${leftM - 4}" y1="${bottomM}" x2="${leftM}" y2="${bottomM}" stroke="${axisColor}" stroke-opacity="0.35" stroke-width="1.2" />
              <text x="${leftM - 6}" y="${bottomM + 3}" text-anchor="end" font-size="8" fill="currentColor" opacity="0.6" font-family="sans-serif">0</text>

              <!-- X-Axis Ticks & Labels: 0, 5, 10 -->
              <line x1="${leftM}" y1="${bottomM}" x2="${leftM}" y2="${bottomM + 4}" stroke="${axisColor}" stroke-opacity="0.35" stroke-width="1.2" />
              <text x="${leftM}" y="${bottomM + 14}" text-anchor="middle" font-size="8" fill="currentColor" opacity="0.6" font-family="sans-serif">0</text>

              <line x1="${(leftM + rightM)/2}" y1="${bottomM}" x2="${(leftM + rightM)/2}" y2="${bottomM + 4}" stroke="${axisColor}" stroke-opacity="0.35" stroke-width="1.2" />
              <text x="${(leftM + rightM)/2}" y="${bottomM + 14}" text-anchor="middle" font-size="8" fill="currentColor" opacity="0.6" font-family="sans-serif">5</text>

              <line x1="${rightM}" y1="${bottomM}" x2="${rightM}" y2="${bottomM + 4}" stroke="${axisColor}" stroke-opacity="0.35" stroke-width="1.2" />
              <text x="${rightM}" y="${bottomM + 14}" text-anchor="middle" font-size="8" fill="currentColor" opacity="0.6" font-family="sans-serif">10</text>

              <!-- Polyline in coral red matching reference -->
              <polyline points="${pointsStr}" fill="none" stroke="${strokeColor}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />

              <!-- Data Node Circles with white center -->
              ${coords.map((c, i) => `
                <circle cx="${c.x}" cy="${c.y}" r="${i === activeIdx ? '3.8' : '3'}" fill="${strokeColor}" />
                <circle cx="${c.x}" cy="${c.y}" r="${i === activeIdx ? '1.5' : '1.2'}" fill="#ffffff" />
                ${i === activeIdx ? `<circle cx="${c.x}" cy="${c.y}" r="6.5" fill="none" stroke="${strokeColor}" stroke-opacity="0.4" class="animate-ping" style="transform-origin: ${c.x}px ${c.y}px;" />` : ''}
              `).join('')}
            </svg>
          </div>
        </div>
      `;
    }

    // Full Cartesian Mode (matching the uploaded image exactly)
    const leftM = 45, rightM = 305, bottomM = 185, topM = 25;
    const xStep = (rightM - leftM) / 10; // 26px
    const yRange = bottomM - topM; // 160px

    const coords = values.map((val, i) => ({
      x: Math.round((leftM + i * xStep) * 10) / 10,
      y: Math.round((bottomM - (val / 1000) * yRange) * 10) / 10
    }));
    const pointsStr = coords.map(c => `${c.x},${c.y}`).join(' ');

    return `
      <div class="progress-line-graph-widget flex flex-col gap-2 w-full select-none" style="max-width: ${typeof options.width === 'number' ? options.width + 'px' : (options.width || '100%')};" title="Progress Status: ${p}% (${stageText})">
        ${showHeader ? `
          <div class="flex items-center justify-between text-xs font-mono">
            <span class="text-outline flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full" style="background-color: ${strokeColor};"></span>
              <span class="font-medium text-on-surface">Project Status Trajectory</span>
            </span>
            <div class="flex items-center gap-2">
              <span class="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-surface-container-high border border-outline-variant/30" style="color: ${strokeColor};">
                ${p}% &bull; ${stageText}
              </span>
            </div>
          </div>
        ` : ''}
        <div class="w-full bg-surface-container/30 rounded-2xl p-4 border border-outline-variant/20 overflow-hidden shadow-sm">
          <svg viewBox="0 0 330 220" class="w-full h-auto overflow-visible" preserveAspectRatio="xMidYMid meet">
            <!-- Y-Axis vertical line -->
            <line x1="${leftM}" y1="${topM}" x2="${leftM}" y2="${bottomM}" stroke="${axisColor}" stroke-opacity="0.35" stroke-width="1.5" />
            <!-- X-Axis horizontal line -->
            <line x1="${leftM}" y1="${bottomM}" x2="${rightM + 10}" y2="${bottomM}" stroke="${axisColor}" stroke-opacity="0.35" stroke-width="1.5" />

            <!-- Y-Axis Ticks & Labels: 1000, 800, 600, 400, 200, 0 -->
            <line x1="${leftM - 5}" y1="${topM}" x2="${leftM}" y2="${topM}" stroke="${axisColor}" stroke-opacity="0.35" stroke-width="1.5" />
            <text x="${leftM - 8}" y="${topM + 3.5}" text-anchor="end" font-size="10" fill="currentColor" opacity="0.65" font-family="sans-serif">1000</text>

            <line x1="${leftM - 5}" y1="${bottomM - yRange * 0.8}" x2="${leftM}" y2="${bottomM - yRange * 0.8}" stroke="${axisColor}" stroke-opacity="0.35" stroke-width="1.5" />
            <text x="${leftM - 8}" y="${bottomM - yRange * 0.8 + 3.5}" text-anchor="end" font-size="10" fill="currentColor" opacity="0.65" font-family="sans-serif">800</text>

            <line x1="${leftM - 5}" y1="${bottomM - yRange * 0.6}" x2="${leftM}" y2="${bottomM - yRange * 0.6}" stroke="${axisColor}" stroke-opacity="0.35" stroke-width="1.5" />
            <text x="${leftM - 8}" y="${bottomM - yRange * 0.6 + 3.5}" text-anchor="end" font-size="10" fill="currentColor" opacity="0.65" font-family="sans-serif">600</text>

            <line x1="${leftM - 5}" y1="${bottomM - yRange * 0.4}" x2="${leftM}" y2="${bottomM - yRange * 0.4}" stroke="${axisColor}" stroke-opacity="0.35" stroke-width="1.5" />
            <text x="${leftM - 8}" y="${bottomM - yRange * 0.4 + 3.5}" text-anchor="end" font-size="10" fill="currentColor" opacity="0.65" font-family="sans-serif">400</text>

            <line x1="${leftM - 5}" y1="${bottomM - yRange * 0.2}" x2="${leftM}" y2="${bottomM - yRange * 0.2}" stroke="${axisColor}" stroke-opacity="0.35" stroke-width="1.5" />
            <text x="${leftM - 8}" y="${bottomM - yRange * 0.2 + 3.5}" text-anchor="end" font-size="10" fill="currentColor" opacity="0.65" font-family="sans-serif">200</text>

            <line x1="${leftM - 5}" y1="${bottomM}" x2="${leftM}" y2="${bottomM}" stroke="${axisColor}" stroke-opacity="0.35" stroke-width="1.5" />
            <text x="${leftM - 8}" y="${bottomM + 3.5}" text-anchor="end" font-size="10" fill="currentColor" opacity="0.65" font-family="sans-serif">0</text>

            <!-- X-Axis Ticks & Labels: 0, 2, 4, 6, 8, 10 -->
            <line x1="${leftM}" y1="${bottomM}" x2="${leftM}" y2="${bottomM + 5}" stroke="${axisColor}" stroke-opacity="0.35" stroke-width="1.5" />
            <text x="${leftM}" y="${bottomM + 18}" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.65" font-family="sans-serif">0</text>

            <line x1="${leftM + xStep * 2}" y1="${bottomM}" x2="${leftM + xStep * 2}" y2="${bottomM + 5}" stroke="${axisColor}" stroke-opacity="0.35" stroke-width="1.5" />
            <text x="${leftM + xStep * 2}" y="${bottomM + 18}" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.65" font-family="sans-serif">2</text>

            <line x1="${leftM + xStep * 4}" y1="${bottomM}" x2="${leftM + xStep * 4}" y2="${bottomM + 5}" stroke="${axisColor}" stroke-opacity="0.35" stroke-width="1.5" />
            <text x="${leftM + xStep * 4}" y="${bottomM + 18}" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.65" font-family="sans-serif">4</text>

            <line x1="${leftM + xStep * 6}" y1="${bottomM}" x2="${leftM + xStep * 6}" y2="${bottomM + 5}" stroke="${axisColor}" stroke-opacity="0.35" stroke-width="1.5" />
            <text x="${leftM + xStep * 6}" y="${bottomM + 18}" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.65" font-family="sans-serif">6</text>

            <line x1="${leftM + xStep * 8}" y1="${bottomM}" x2="${leftM + xStep * 8}" y2="${bottomM + 5}" stroke="${axisColor}" stroke-opacity="0.35" stroke-width="1.5" />
            <text x="${leftM + xStep * 8}" y="${bottomM + 18}" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.65" font-family="sans-serif">8</text>

            <line x1="${leftM + xStep * 10}" y1="${bottomM}" x2="${leftM + xStep * 10}" y2="${bottomM + 5}" stroke="${axisColor}" stroke-opacity="0.35" stroke-width="1.5" />
            <text x="${leftM + xStep * 10}" y="${bottomM + 18}" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.65" font-family="sans-serif">10</text>

            <!-- Coral Red Polyline matching reference image -->
            <polyline points="${pointsStr}" fill="none" stroke="${strokeColor}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />

            <!-- Red Circle Markers with White Center Dot -->
            ${coords.map((c, i) => `
              <circle cx="${c.x}" cy="${c.y}" r="${i === activeIdx ? '5' : '4'}" fill="${strokeColor}" />
              <circle cx="${c.x}" cy="${c.y}" r="${i === activeIdx ? '2' : '1.5'}" fill="#ffffff" />
              ${i === activeIdx ? `<circle cx="${c.x}" cy="${c.y}" r="8" fill="none" stroke="${strokeColor}" stroke-opacity="0.5" class="animate-ping" style="transform-origin: ${c.x}px ${c.y}px;" />` : ''}
            `).join('')}
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
