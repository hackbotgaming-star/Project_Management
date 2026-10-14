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

  // Global registry for interactive functional progress graphs
  // Global registry for interactive functional progress graphs
  window._progressGraphs = window._progressGraphs || {};

  function _hashString(str) {
    if (!str) return 42;
    let hash = 0;
    const s = String(str);
    for (let i = 0; i < s.length; i++) {
      hash = (hash << 5) - hash + s.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  // Generates unique, deterministic milestone stages and trajectory points tailored to a specific project
  function _generateProjectGraphData(project, percent, options = {}) {
    const proj = project || options.project || {};
    const title = proj.title || options.title || 'Project Workspace';
    const code = proj.code || options.code || '';
    const projId = proj._id || proj.id || code || title || 'default';
    const seed = _hashString(String(projId));
    const p = Math.max(0, Math.min(100, Math.round(Number(percent !== undefined ? percent : (proj.progressPercentage || 0))) || 0));
    const activeIdx = Math.min(10, Math.max(0, Math.round((p / 100) * 10)));
    const tasks = options.tasks || proj.tasks || [];
    const milestones = options.milestones || proj.milestones || [];

    // Derive custom stage names tailored specifically to this project's title and domain
    const lowerTitle = title.toLowerCase();
    let domainNoun = 'System Module';
    let techFocus = 'Architecture & Data Layer';
    let coreAction = 'Core Algorithms & Features';
    let testAction = 'System & Integration Testing';

    if (lowerTitle.includes('slam') || lowerTitle.includes('quadrotor') || lowerTitle.includes('drone') || lowerTitle.includes('robot')) {
      domainNoun = 'Robotics & Navigation';
      techFocus = 'Sensor Fusion & Flight Controller';
      coreAction = 'SLAM Algorithm & Autonomy';
      testAction = 'Hardware Flight Trials & Benchmark';
    } else if (lowerTitle.includes('database') || lowerTitle.includes('cloud') || lowerTitle.includes('distributed')) {
      domainNoun = 'Distributed Engine';
      techFocus = 'Consensus & Storage Topology';
      coreAction = 'Distributed Replication & Sharding';
      testAction = 'Fault Tolerance & High-Load Stress';
    } else if (lowerTitle.includes('ai') || lowerTitle.includes('learning') || lowerTitle.includes('model') || lowerTitle.includes('neural') || lowerTitle.includes('vision') || lowerTitle.includes('nlp')) {
      domainNoun = 'AI / ML Pipeline';
      techFocus = 'Data Preprocessing & Model Architecture';
      coreAction = 'Neural Network Training & Weights';
      testAction = 'Validation Loss & Inference Benchmarks';
    } else if (lowerTitle.includes('health') || lowerTitle.includes('med') || lowerTitle.includes('bio')) {
      domainNoun = 'Biomedical Platform';
      techFocus = 'Clinical Data Pipeline & Compliance';
      coreAction = 'Predictive Diagnostic Engine';
      testAction = 'Accuracy Verification & Validation';
    } else if (lowerTitle.includes('security') || lowerTitle.includes('crypto') || lowerTitle.includes('chain')) {
      domainNoun = 'Cryptographic Ledger';
      techFocus = 'Zero-Knowledge & Smart Contracts';
      coreAction = 'Consensus Node & Ledger Transactions';
      testAction = 'Vulnerability Audit & Stress Tests';
    }

    const shortProjName = title.split(':')[0].trim();
    const stages = [
      { index: 0, shortName: 'Kickoff', name: `Kickoff & Team Setup: ${code || shortProjName}`, desc: 'Project charter formed, advisor assigned, and repository initialized.' },
      { index: 1, shortName: 'Literature', name: `Domain Survey: ${shortProjName}`, desc: 'Formal requirement specifications and state-of-the-art literature review.' },
      { index: 2, shortName: 'Architecture', name: techFocus, desc: 'Design blueprints, system component diagrams, and technological stack validation.' },
      { index: 3, shortName: 'Data Schema', name: `${domainNoun} Schema`, desc: 'Data modeling, entity relations, collections, and mock test fixtures.' },
      { index: 4, shortName: 'Core Engine', name: coreAction, desc: 'Core computational logic, backend APIs, and controller implementation.' },
      { index: 5, shortName: 'Mid-Review', name: 'Mid-Term Advisor Review', desc: 'Formative evaluation assessment and progress audit by faculty advisor.' },
      { index: 6, shortName: 'UI / UX', name: 'Dashboard & User Interface', desc: 'Interactive monitoring components, responsive views, and user feedback.' },
      { index: 7, shortName: 'Verification', name: testAction, desc: 'Unit tests, system verification, role permissions, and edge cases.' },
      { index: 8, shortName: 'Revisions', name: 'Advisor Audit & Code Refinement', desc: 'Addressing formative reviewer feedback and code performance optimizations.' },
      { index: 9, shortName: 'Pre-Defense', name: 'Pre-Defense Simulation & Package', desc: 'Documentation finalization, dry-run evaluation, and artifact bundling.' },
      { index: 10, shortName: 'Capstone', name: `Final Defense: ${code || shortProjName}`, desc: 'Final graduation jury evaluation, project sign-off, and repository archiving.' }
    ];

    // Weave real database milestones directly into checkpoints
    if (Array.isArray(milestones) && milestones.length > 0) {
      milestones.forEach((m, idx) => {
        const targetStep = Math.min(10, Math.max(1, Math.round(((idx + 1) / (milestones.length + 1)) * 10)));
        if (stages[targetStep]) {
          stages[targetStep].name = m.title || stages[targetStep].name;
          if (m.description) stages[targetStep].desc = m.description;
          stages[targetStep].shortName = m.title ? m.title.substring(0, 12) : stages[targetStep].shortName;
          stages[targetStep].realMilestone = m;
        }
      });
    }

    // Generate unique, deterministic trajectory values (0 to 1000) for THIS SPECIFIC PROJECT
    const values = [];
    const targetScore = p * 10; // e.g. 45% = 450 pts out of 1000

    for (let i = 0; i <= 10; i++) {
      if (p === 0) {
        values.push(i === 0 ? 0 : Math.min(1000, Math.round(i * 35)));
      } else if (i <= activeIdx) {
        if (activeIdx === 0) {
          values.push(targetScore);
        } else {
          const fraction = i / activeIdx;
          const variance = Math.sin((i + (seed % 7)) * 1.5) * 25;
          const val = Math.round(fraction * targetScore + variance);
          const clamped = Math.max(40, Math.min(1000, i === activeIdx ? targetScore : val));
          values.push(clamped);
        }
      } else {
        const remainingSteps = 10 - activeIdx;
        const currentStep = i - activeIdx;
        const projectedFraction = currentStep / remainingSteps;
        const remainingScore = 1000 - targetScore;
        const variance = Math.cos((i + (seed % 5)) * 1.2) * 20;
        const projectedVal = Math.round(targetScore + projectedFraction * remainingScore + variance);
        values.push(Math.max(targetScore, Math.min(1000, projectedVal)));
      }
    }

    return {
      title,
      code,
      p,
      activeIdx,
      stages,
      values,
      seed
    };
  }

  window._progressGraphHover = function(graphId, index) {
    const data = window._progressGraphs[graphId];
    if (!data) return;
    const stage = data.stages[index] || { shortName: `Milestone ${index}`, name: `Milestone ${index}`, desc: '' };
    const val = data.values[index];
    const coord = data.coords[index];
    
    // Update tooltip position & content
    const tt = document.getElementById(`tt-${graphId}`);
    const chX = document.getElementById(`ch-x-${graphId}`);
    const chY = document.getElementById(`ch-y-${graphId}`);
    
    if (tt && coord) {
      tt.setAttribute('transform', `translate(${coord.x}, ${coord.y - 12})`);
      tt.setAttribute('opacity', '1');
      const titleEl = document.getElementById(`tt-title-${graphId}`);
      const valEl = document.getElementById(`tt-val-${graphId}`);
      const statEl = document.getElementById(`tt-stat-${graphId}`);
      if (titleEl) titleEl.textContent = `Stage ${index}: ${stage.shortName}`;
      if (valEl) valEl.textContent = `Score: ${val}/1000 (${Math.round(val/10)}%)`;
      if (statEl) {
        statEl.textContent = index < data.activeIdx ? 'Completed' : (index === data.activeIdx ? 'Current Stage' : 'Projected');
      }
    }
    
    if (chX && coord) {
      chX.setAttribute('x1', coord.x);
      chX.setAttribute('x2', coord.x);
      chX.setAttribute('y1', coord.y);
      chX.setAttribute('opacity', '0.6');
    }
    if (chY && coord) {
      chY.setAttribute('x1', data.leftM);
      chY.setAttribute('x2', coord.x);
      chY.setAttribute('y1', coord.y);
      chY.setAttribute('y2', coord.y);
      chY.setAttribute('opacity', '0.6');
    }
    
    // Update interactive inspector strip
    window._progressGraphUpdateInspector(graphId, index);
  };

  window._progressGraphLeave = function(graphId) {
    const data = window._progressGraphs[graphId];
    if (!data) return;
    const tt = document.getElementById(`tt-${graphId}`);
    const chX = document.getElementById(`ch-x-${graphId}`);
    const chY = document.getElementById(`ch-y-${graphId}`);
    if (tt) tt.setAttribute('opacity', '0');
    if (chX) chX.setAttribute('opacity', '0');
    if (chY) chY.setAttribute('opacity', '0');
    
    // Return to selected or active milestone
    const targetIdx = data.selectedIdx !== undefined ? data.selectedIdx : data.activeIdx;
    window._progressGraphUpdateInspector(graphId, targetIdx);
  };

  window._progressGraphClick = function(graphId, index) {
    const data = window._progressGraphs[graphId];
    if (!data) return;
    data.selectedIdx = index;
    window._progressGraphHover(graphId, index);
  };

  window._progressGraphStep = function(graphId, delta) {
    const data = window._progressGraphs[graphId];
    if (!data) return;
    const current = data.selectedIdx !== undefined ? data.selectedIdx : data.activeIdx;
    const next = Math.max(0, Math.min(10, current + delta));
    data.selectedIdx = next;
    window._progressGraphHover(graphId, next);
  };

  window._progressGraphUpdateInspector = function(graphId, index) {
    const data = window._progressGraphs[graphId];
    if (!data) return;
    const strip = document.getElementById(`inspector-${graphId}`);
    if (!strip) return;
    const stage = data.stages[index] || { shortName: `Stage ${index}`, name: `Milestone ${index}`, desc: '' };
    const val = data.values[index];
    const isDone = index < data.activeIdx;
    const isActive = index === data.activeIdx;
    const statusLabel = isDone ? 'COMPLETED' : (isActive ? 'CURRENT ACTIVE' : 'PROJECTED');
    const statusBg = isDone ? 'bg-primary/15 text-primary border-primary/30' : (isActive ? 'bg-[#ff5436]/15 text-[#ff5436] border-[#ff5436]/40' : 'bg-surface-container-high text-outline border-outline-variant/30');

    strip.innerHTML = `
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-surface-container-low border border-outline-variant/30">
        <div class="flex items-center gap-2.5">
          <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: ${data.strokeColor};"></span>
          <div>
            <div class="flex items-center gap-2">
              <span class="font-bold text-xs text-on-surface">Stage ${index}: ${stage.name}</span>
              <span class="text-[10px] font-mono px-2 py-0.5 rounded-full border ${statusBg}">${statusLabel}</span>
            </div>
            <p class="text-[11px] text-outline mt-0.5 line-clamp-1">${stage.desc}</p>
          </div>
        </div>
        <div class="flex items-center gap-3 self-end sm:self-auto shrink-0 font-mono text-xs">
          <div class="text-right">
            <span class="font-bold text-sm" style="color: ${data.strokeColor};">${val}</span>
            <span class="text-outline text-[11px]"> / 1000 pts (${Math.round(val/10)}%)</span>
          </div>
          <div class="flex items-center gap-1 border-l border-outline-variant/30 pl-2">
            <button onclick="window._progressGraphStep('${graphId}', -1)" class="w-6 h-6 rounded flex items-center justify-center bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-on-surface text-xs" title="Previous Stage">&larr;</button>
            <button onclick="window._progressGraphStep('${graphId}', 1)" class="w-6 h-6 rounded flex items-center justify-center bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-on-surface text-xs" title="Next Stage">&rarr;</button>
          </div>
        </div>
      </div>
    `;
  };

  window._progressGraphSetMode = function(graphId, mode) {
    const data = window._progressGraphs[graphId];
    if (!data) return;
    data.mode = mode;
    
    // Recalculate values based on chosen mode
    const baseRaw = [200, 290, 290, 500, 470, 600, 780, 900, 660, 700, 510];
    if (mode === 'baseline') {
      data.values = [...baseRaw];
    } else if (mode === 'velocity') {
      data.values = data.stages.map((_, i) => Math.min(1000, Math.round(((i + 1) / 11) * (data.p * 10))));
    } else {
      // Restore dynamic trajectory calculated specifically for this project
      data.values = [...data.originalProjectValues];
    }

    // Recompute SVG coordinates
    data.coords = data.values.map((val, i) => ({
      x: Math.round((data.leftM + i * data.xStep) * 10) / 10,
      y: Math.round((data.bottomM - (val / 1000) * data.yRange) * 10) / 10
    }));

    // Update polyline
    const poly = document.getElementById(`poly-${graphId}`);
    if (poly) {
      poly.setAttribute('points', data.coords.map(c => `${c.x},${c.y}`).join(' '));
    }

    // Update nodes
    data.coords.forEach((c, i) => {
      const cOuter = document.getElementById(`circle-outer-${graphId}-${i}`);
      const cInner = document.getElementById(`circle-inner-${graphId}-${i}`);
      const cHit = document.getElementById(`circle-hit-${graphId}-${i}`);
      if (cOuter) { cOuter.setAttribute('cx', c.x); cOuter.setAttribute('cy', c.y); }
      if (cInner) { cInner.setAttribute('cx', c.x); cInner.setAttribute('cy', c.y); }
      if (cHit) { cHit.setAttribute('cx', c.x); cHit.setAttribute('cy', c.y); }
    });

    // Update mode buttons style
    ['trajectory', 'baseline', 'velocity'].forEach(m => {
      const btn = document.getElementById(`btn-mode-${graphId}-${m}`);
      if (btn) {
        if (m === mode) {
          btn.className = 'px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary text-on-primary shadow-sm transition-all';
        } else {
          btn.className = 'px-2.5 py-1 rounded-lg text-xs text-outline hover:text-on-surface hover:bg-surface-container transition-all';
        }
      }
    });

    window._progressGraphUpdateInspector(graphId, data.selectedIdx !== undefined ? data.selectedIdx : data.activeIdx);
  };

  // Cartesian Progress Status Line Graph Generator dynamically adapting to specific project
  window.renderProgressLineGraph = function(percent, options = {}) {
    const projData = _generateProjectGraphData(options.project, percent, options);
    const p = projData.p;
    const isCompact = options.compact === true || (options.height && options.height <= 110);
    const strokeColor = options.color || '#ff5436'; // Vibrant Coral-Red matching reference image
    const axisColor = options.axisColor || '#94a3b8';
    const showHeader = options.showLabel !== false;
    const graphId = 'cg_' + Math.random().toString(36).substring(2, 9);

    const values = [...projData.values];
    const activeIdx = projData.activeIdx;
    const stages = projData.stages;

    let stageText = 'Planning';
    if (p >= 100) stageText = 'Completed';
    else if (p >= 75) stageText = 'Defense Phase';
    else if (p >= 50) stageText = 'Development';
    else if (p >= 25) stageText = 'Architecture';

    // Compact Mode (for table rows, compact cards)
    if (isCompact) {
      const leftM = 30, rightM = 200, bottomM = 78, topM = 14;
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
                <span>Trajectory</span>
              </span>
              <span class="font-bold text-[10px]" style="color: ${strokeColor};">${p}% &bull; ${stageText}</span>
            </div>
          ` : ''}
          <div class="w-full bg-surface-container/30 rounded-xl p-1.5 border border-outline-variant/20 overflow-hidden">
            <svg viewBox="0 0 220 100" class="w-full h-auto overflow-visible" preserveAspectRatio="xMidYMid meet">
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

    // Full Cartesian Mode (matching the uploaded image with rich interactive features)
    const leftM = 50, rightM = 500, bottomM = 220, topM = 30;
    const xStep = (rightM - leftM) / 10; // 45px
    const yRange = bottomM - topM; // 190px

    const coords = values.map((val, i) => ({
      x: Math.round((leftM + i * xStep) * 10) / 10,
      y: Math.round((bottomM - (val / 1000) * yRange) * 10) / 10
    }));
    const pointsStr = coords.map(c => `${c.x},${c.y}`).join(' ');

    // Register instance in global registry for interactions
    window._progressGraphs[graphId] = {
      p,
      strokeColor,
      axisColor,
      values: [...values],
      originalProjectValues: [...values],
      activeIdx,
      selectedIdx: activeIdx,
      mode: 'trajectory',
      leftM,
      rightM,
      bottomM,
      topM,
      xStep,
      yRange,
      coords,
      stages: stages,
      projectTitle: projData.title,
      projectCode: projData.code
    };

    // Defer initial inspector rendering
    setTimeout(() => {
      window._progressGraphUpdateInspector(graphId, activeIdx);
    }, 10);

    return `
      <div id="graph-wrap-${graphId}" class="progress-line-graph-widget flex flex-col gap-3 w-full select-none" style="max-width: ${typeof options.width === 'number' ? options.width + 'px' : (options.width || '100%')};">
        ${showHeader ? `
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${strokeColor};"></span>
              <span class="font-bold text-on-surface truncate max-w-sm sm:max-w-md" title="${escapeHtml(projData.title)}">
                ${projData.code ? `<span class="font-mono text-outline font-semibold">${escapeHtml(projData.code)} &bull; </span>` : ''}
                ${escapeHtml(projData.title)}
              </span>
              <span class="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-surface-container-high border border-outline-variant/30 font-mono" style="color: ${strokeColor};">
                ${p}% &bull; ${stageText}
              </span>
            </div>
            <!-- Interactive View Modes -->
            <div class="flex items-center gap-1 bg-surface-container/60 p-1 rounded-xl border border-outline-variant/20 self-start sm:self-auto font-mono text-[11px]">
              <button id="btn-mode-${graphId}-trajectory" onclick="window._progressGraphSetMode('${graphId}', 'trajectory')" class="px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary text-on-primary shadow-sm transition-all">
                Trajectory
              </button>
              <button id="btn-mode-${graphId}-baseline" onclick="window._progressGraphSetMode('${graphId}', 'baseline')" class="px-2.5 py-1 rounded-lg text-xs text-outline hover:text-on-surface hover:bg-surface-container transition-all">
                Reference
              </button>
              <button id="btn-mode-${graphId}-velocity" onclick="window._progressGraphSetMode('${graphId}', 'velocity')" class="px-2.5 py-1 rounded-lg text-xs text-outline hover:text-on-surface hover:bg-surface-container transition-all">
                Velocity
              </button>
            </div>
          </div>
        ` : ''}

        <div class="w-full bg-surface-container/25 rounded-2xl p-4 sm:p-5 border border-outline-variant/20 overflow-hidden shadow-sm relative">
          <svg viewBox="0 0 535 265" class="w-full h-auto overflow-visible" preserveAspectRatio="xMidYMid meet">
            <!-- Subtle Horizontal Grid Lines for Cartesian Tracking -->
            <line x1="${leftM}" y1="${topM}" x2="${rightM}" y2="${topM}" stroke="${axisColor}" stroke-opacity="0.12" stroke-dasharray="3,3" />
            <line x1="${leftM}" y1="${bottomM - yRange * 0.8}" x2="${rightM}" y2="${bottomM - yRange * 0.8}" stroke="${axisColor}" stroke-opacity="0.12" stroke-dasharray="3,3" />
            <line x1="${leftM}" y1="${bottomM - yRange * 0.6}" x2="${rightM}" y2="${bottomM - yRange * 0.6}" stroke="${axisColor}" stroke-opacity="0.12" stroke-dasharray="3,3" />
            <line x1="${leftM}" y1="${bottomM - yRange * 0.4}" x2="${rightM}" y2="${bottomM - yRange * 0.4}" stroke="${axisColor}" stroke-opacity="0.12" stroke-dasharray="3,3" />
            <line x1="${leftM}" y1="${bottomM - yRange * 0.2}" x2="${rightM}" y2="${bottomM - yRange * 0.2}" stroke="${axisColor}" stroke-opacity="0.12" stroke-dasharray="3,3" />

            <!-- Y-Axis vertical line -->
            <line x1="${leftM}" y1="${topM}" x2="${leftM}" y2="${bottomM}" stroke="${axisColor}" stroke-opacity="0.4" stroke-width="1.8" />
            <!-- X-Axis horizontal line -->
            <line x1="${leftM}" y1="${bottomM}" x2="${rightM + 12}" y2="${bottomM}" stroke="${axisColor}" stroke-opacity="0.4" stroke-width="1.8" />

            <!-- Y-Axis Ticks & Labels: 1000, 800, 600, 400, 200, 0 -->
            <line x1="${leftM - 6}" y1="${topM}" x2="${leftM}" y2="${topM}" stroke="${axisColor}" stroke-opacity="0.5" stroke-width="1.6" />
            <text x="${leftM - 10}" y="${topM + 3.5}" text-anchor="end" font-size="11" fill="currentColor" opacity="0.75" font-family="monospace">1000</text>

            <line x1="${leftM - 6}" y1="${bottomM - yRange * 0.8}" x2="${leftM}" y2="${bottomM - yRange * 0.8}" stroke="${axisColor}" stroke-opacity="0.5" stroke-width="1.6" />
            <text x="${leftM - 10}" y="${bottomM - yRange * 0.8 + 3.5}" text-anchor="end" font-size="11" fill="currentColor" opacity="0.75" font-family="monospace">800</text>

            <line x1="${leftM - 6}" y1="${bottomM - yRange * 0.6}" x2="${leftM}" y2="${bottomM - yRange * 0.6}" stroke="${axisColor}" stroke-opacity="0.5" stroke-width="1.6" />
            <text x="${leftM - 10}" y="${bottomM - yRange * 0.6 + 3.5}" text-anchor="end" font-size="11" fill="currentColor" opacity="0.75" font-family="monospace">600</text>

            <line x1="${leftM - 6}" y1="${bottomM - yRange * 0.4}" x2="${leftM}" y2="${bottomM - yRange * 0.4}" stroke="${axisColor}" stroke-opacity="0.5" stroke-width="1.6" />
            <text x="${leftM - 10}" y="${bottomM - yRange * 0.4 + 3.5}" text-anchor="end" font-size="11" fill="currentColor" opacity="0.75" font-family="monospace">400</text>

            <line x1="${leftM - 6}" y1="${bottomM - yRange * 0.2}" x2="${leftM}" y2="${bottomM - yRange * 0.2}" stroke="${axisColor}" stroke-opacity="0.5" stroke-width="1.6" />
            <text x="${leftM - 10}" y="${bottomM - yRange * 0.2 + 3.5}" text-anchor="end" font-size="11" fill="currentColor" opacity="0.75" font-family="monospace">200</text>

            <line x1="${leftM - 6}" y1="${bottomM}" x2="${leftM}" y2="${bottomM}" stroke="${axisColor}" stroke-opacity="0.5" stroke-width="1.6" />
            <text x="${leftM - 10}" y="${bottomM + 3.5}" text-anchor="end" font-size="11" fill="currentColor" opacity="0.75" font-family="monospace">0</text>

            <!-- X-Axis Ticks & Labels: 0, 2, 4, 6, 8, 10 -->
            ${[0, 2, 4, 6, 8, 10].map(val => `
              <line x1="${leftM + xStep * val}" y1="${bottomM}" x2="${leftM + xStep * val}" y2="${bottomM + 6}" stroke="${axisColor}" stroke-opacity="0.5" stroke-width="1.6" />
              <text x="${leftM + xStep * val}" y="${bottomM + 22}" text-anchor="middle" font-size="11" fill="currentColor" opacity="0.75" font-family="monospace">${val}</text>
            `).join('')}

            <!-- Subtle In-Between Ticks: 1, 3, 5, 7, 9 -->
            ${[1, 3, 5, 7, 9].map(val => `
              <line x1="${leftM + xStep * val}" y1="${bottomM}" x2="${leftM + xStep * val}" y2="${bottomM + 3.5}" stroke="${axisColor}" stroke-opacity="0.3" stroke-width="1.2" />
            `).join('')}

            <!-- Dynamic Crosshairs -->
            <line id="ch-x-${graphId}" x1="0" y1="0" x2="0" y2="${bottomM}" stroke="${strokeColor}" stroke-width="1.4" stroke-dasharray="3,3" opacity="0" pointer-events="none" />
            <line id="ch-y-${graphId}" x1="${leftM}" y1="0" x2="0" y2="0" stroke="${strokeColor}" stroke-width="1.4" stroke-dasharray="3,3" opacity="0" pointer-events="none" />

            <!-- Coral Red Polyline matching reference image -->
            <polyline id="poly-${graphId}" points="${pointsStr}" fill="none" stroke="${strokeColor}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />

            <!-- Interactive Milestone Nodes -->
            ${coords.map((c, i) => `
              <g class="graph-node-group cursor-pointer" data-idx="${i}"
                 onmouseenter="window._progressGraphHover('${graphId}', ${i})"
                 onmouseleave="window._progressGraphLeave('${graphId}')"
                 onclick="window._progressGraphClick('${graphId}', ${i})">
                <!-- Large Transparent Hit Area for Easy Clicking & Hovering -->
                <circle id="circle-hit-${graphId}-${i}" cx="${c.x}" cy="${c.y}" r="16" fill="transparent" />
                
                <!-- Red Circle Marker -->
                <circle id="circle-outer-${graphId}-${i}" cx="${c.x}" cy="${c.y}" r="${i === activeIdx ? '6.5' : '5'}" fill="${strokeColor}" />
                <!-- Inner White Center Dot -->
                <circle id="circle-inner-${graphId}-${i}" cx="${c.x}" cy="${c.y}" r="${i === activeIdx ? '2.8' : '2'}" fill="#ffffff" />
                
                ${i === activeIdx ? `
                  <circle cx="${c.x}" cy="${c.y}" r="11" fill="none" stroke="${strokeColor}" stroke-opacity="0.6" class="animate-ping" style="transform-origin: ${c.x}px ${c.y}px;" />
                ` : ''}
              </g>
            `).join('')}

            <!-- Floating SVG Interactive Tooltip -->
            <g id="tt-${graphId}" opacity="0" pointer-events="none" class="transition-opacity duration-150">
              <rect x="-75" y="-52" width="150" height="46" rx="8" fill="#18181b" stroke="${strokeColor}" stroke-width="1.4" />
              <polygon points="-6,-6 6,-6 0,0" fill="#18181b" />
              <text id="tt-title-${graphId}" x="0" y="-34" text-anchor="middle" font-size="10" font-weight="bold" fill="#ffffff" font-family="sans-serif">Stage</text>
              <text id="tt-val-${graphId}" x="0" y="-21" text-anchor="middle" font-size="9.5" font-family="monospace" font-weight="bold" fill="${strokeColor}">Score: 0</text>
              <text id="tt-stat-${graphId}" x="0" y="-10" text-anchor="middle" font-size="8.5" fill="#a1a1aa" font-family="sans-serif">Status</text>
            </g>
          </svg>
        </div>

        <!-- Interactive Milestone Inspector Drawer -->
        <div id="inspector-${graphId}"></div>
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
