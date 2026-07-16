/* ==========================================================================
   AEGIS Defender Console - Core Client Logic
   ========================================================================= */

import { mockAssets, mockAlerts, mockAuditLogs, graphStructure } from './fixtures.js';

// State Management
let selectedAssetId = null;
let selectedAlertId = null;
let activeAlerts = [...mockAlerts];
let auditLogs = [...mockAuditLogs];

// Canvas Animation state
let canvas, ctx;
let pulseOffset = 0;
let animationFrameId = null;
let pulseActiveEndTime = Date.now() + 3000; // Animate for 3 seconds on page load

document.addEventListener('DOMContentLoaded', () => {
  initLiveTelemetry();
  initThemeSupport();
  initAssetNav();
  initAlertFeed();
  initAuditLogs();
  initGraph();
  initResponseActions();
  setupCollapsiblePanels();
  
  // Select first alert by default to populate layout
  if (activeAlerts.length > 0) {
    selectAlert(activeAlerts[0].id);
  }
});

/* --------------------------------------------------------------------------
   Dark/Light Theme Support
   -------------------------------------------------------------------------- */
function initThemeSupport() {
  const toggleBtn = document.getElementById('theme-toggle');
  const toggleIcon = document.getElementById('theme-toggle-icon');
  
  if (!toggleBtn || !toggleIcon) return;

  const updateIcon = () => {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    toggleIcon.textContent = isLight ? '☾' : '☀';
    toggleBtn.title = isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode';
  };
  updateIcon();

  toggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('aegis-theme', nextTheme);
    
    updateIcon();
    redrawCircuitLinks();
  });
}

/* --------------------------------------------------------------------------
   Live Telemetry Timers & Clocks
   -------------------------------------------------------------------------- */
function initLiveTelemetry() {
  const clockEl = document.getElementById('live-clock');
  const timerEl = document.getElementById('session-timer');
  
  // Session hours/mins/secs
  let seconds = 9910; // 02:45:10
  setInterval(() => {
    seconds++;
    const hrs = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const mins = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    if (timerEl) timerEl.textContent = `${hrs}:${mins}:${secs}`;
  }, 1000);

  // Real-time clock
  function updateClock() {
    const now = new Date();
    const hrs = now.getHours().toString().padStart(2, '0');
    const mins = now.getMinutes().toString().padStart(2, '0');
    const secs = now.getSeconds().toString().padStart(2, '0');
    if (clockEl) clockEl.textContent = `${hrs}:${mins}:${secs}`;
  }
  updateClock();
  setInterval(updateClock, 1000);
}

/* --------------------------------------------------------------------------
   Collapsible Panels (Asset Nav & SHAP Drawer)
   -------------------------------------------------------------------------- */
function setupCollapsiblePanels() {
  const toggleAssetsBtn = document.getElementById('toggle-assets');
  const assetDrawer = document.getElementById('asset-drawer');
  const closeShapBtn = document.getElementById('close-shap');
  const shapDrawer = document.getElementById('shap-drawer');

  // Asset Nav Collapse
  if (toggleAssetsBtn && assetDrawer) {
    toggleAssetsBtn.addEventListener('click', () => {
      assetDrawer.classList.toggle('collapsed');
      if (assetDrawer.classList.contains('collapsed')) {
        toggleAssetsBtn.textContent = '▶';
      } else {
        toggleAssetsBtn.textContent = '◀';
      }
      // Re-trigger graph canvas resizing due to layout changes
      setTimeout(resizeCanvas, 310);
    });
  }

  // SHAP Drawer Close
  if (closeShapBtn && shapDrawer) {
    closeShapBtn.addEventListener('click', () => {
      shapDrawer.classList.add('hidden-drawer');
      // Deselect alert visual indicator
      const selectedRow = document.querySelector('.selected-row');
      if (selectedRow) selectedRow.classList.remove('selected-row');
      selectedAlertId = null;
      resetResponseGateButtons();
    });
  }
}

/* --------------------------------------------------------------------------
   Asset Navigation
   -------------------------------------------------------------------------- */
function initAssetNav() {
  const container = document.getElementById('asset-list-container');
  if (!container) return;

  container.innerHTML = '';
  
  // Add a "Show All Assets" row
  const allRow = document.createElement('div');
  allRow.className = `asset-item ${!selectedAssetId ? 'selected' : ''}`;
  allRow.innerHTML = `
    <div class="asset-collapsed-indicator font-mono">A</div>
    <div class="asset-meta">
      <span class="asset-name">All Active Assets</span>
      <span class="asset-type">Consolidated Monitor</span>
    </div>
    <span class="status-pill nominal-pill">NOMINAL</span>
  `;
  allRow.addEventListener('click', () => {
    document.querySelectorAll('.asset-item').forEach(el => el.classList.remove('selected'));
    allRow.classList.add('selected');
    selectedAssetId = null;
    filterAlertsByAsset();
  });
  container.appendChild(allRow);

  mockAssets.forEach(asset => {
    const item = document.createElement('div');
    item.className = `asset-item status-${asset.status} ${selectedAssetId === asset.id ? 'selected' : ''}`;
    item.setAttribute('data-id', asset.id);

    let statusPillClass = 'nominal-pill';
    let statusText = 'NOMINAL';
    if (asset.status === 'critical') {
      statusPillClass = 'critical-pill';
      statusText = 'CRITICAL';
    } else if (asset.status === 'pending') {
      statusPillClass = 'pending-pill';
      statusText = 'PENDING';
    }

    const initials = asset.name.charAt(0);

    item.innerHTML = `
      <div class="asset-collapsed-indicator font-mono">${initials}</div>
      <div class="asset-meta">
        <span class="asset-name">${asset.name}</span>
        <span class="asset-type">${asset.type} · ${asset.alertsCount} active</span>
      </div>
      <span class="status-pill ${statusPillClass}">${statusText}</span>
    `;

    item.addEventListener('click', () => {
      document.querySelectorAll('.asset-item').forEach(el => el.classList.remove('selected'));
      item.classList.add('selected');
      selectedAssetId = asset.id;
      filterAlertsByAsset();
    });

    container.appendChild(item);
  });
}

function filterAlertsByAsset() {
  const tbody = document.getElementById('alert-feed-tbody');
  if (!tbody) return;

  const rows = tbody.querySelectorAll('tr');
  rows.forEach(row => {
    const assetId = row.getAttribute('data-asset');
    if (!selectedAssetId || assetId === selectedAssetId) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

/* --------------------------------------------------------------------------
   Alert Timeline / Telemetry Feed
   -------------------------------------------------------------------------- */
function initAlertFeed() {
  const tbody = document.getElementById('alert-feed-tbody');
  const counter = document.getElementById('alert-counter');
  if (!tbody) return;

  tbody.innerHTML = '';

  activeAlerts.forEach(alert => {
    const tr = document.createElement('tr');
    tr.setAttribute('data-id', alert.id);
    tr.setAttribute('data-asset', alert.assetId);
    if (selectedAlertId === alert.id) tr.className = 'selected-row';

    let severityClass = alert.severity;
    let statusPillClass = 'pending-pill';
    let statusText = 'PENDING';
    if (alert.status === 'mitigated') {
      statusPillClass = 'nominal-pill';
      statusText = 'MITIGATED';
    } else if (alert.status === 'dismissed') {
      statusPillClass = 'nominal-pill';
      statusText = 'DISMISSED';
    } else if (alert.status === 'escalated') {
      statusPillClass = 'critical-pill';
      statusText = 'ESCALATED';
    }

    tr.innerHTML = `
      <td class="font-mono">${alert.timestamp}</td>
      <td class="font-mono">${alert.id}</td>
      <td>${mockAssets.find(a => a.id === alert.assetId)?.name || alert.assetId}</td>
      <td>${alert.title}</td>
      <td class="font-mono">${alert.tactic}</td>
      <td><span class="alert-severity-badge ${severityClass}">${alert.severity.toUpperCase()}</span></td>
      <td><span class="status-pill ${statusPillClass}" id="status-cell-${alert.id}">${statusText}</span></td>
    `;

    tr.addEventListener('click', () => {
      selectAlert(alert.id);
    });

    tbody.appendChild(containerFilterMatch(tr));
  });

  updateAlertCounter();
}

function containerFilterMatch(row) {
  const assetId = row.getAttribute('data-asset');
  if (!selectedAssetId || assetId === selectedAssetId) {
    row.style.display = '';
  } else {
    row.style.display = 'none';
  }
  return row;
}

function updateAlertCounter() {
  const counter = document.getElementById('alert-counter');
  if (!counter) return;

  const pendingCount = activeAlerts.filter(a => a.status === 'pending').length;
  counter.textContent = `${pendingCount} ACTIVE GATES`;
  if (pendingCount === 0) {
    counter.className = 'active-count font-mono text-nominal';
    counter.style.backgroundColor = 'rgba(45, 212, 191, 0.08)';
    counter.style.borderColor = 'rgba(45, 212, 191, 0.2)';
    counter.style.color = 'var(--signal-nominal)';
  } else {
    counter.className = 'active-count font-mono text-pending';
    counter.style.backgroundColor = 'rgba(255, 176, 32, 0.08)';
    counter.style.borderColor = 'rgba(255, 176, 32, 0.2)';
    counter.style.color = 'var(--signal-pending)';
  }
}

function selectAlert(alertId) {
  selectedAlertId = alertId;

  // Trigger 3 second pulse trace animation on graph reasoner
  pulseActiveEndTime = Date.now() + 3000;

  // Visual highlights
  const tbody = document.getElementById('alert-feed-tbody');
  if (tbody) {
    tbody.querySelectorAll('tr').forEach(r => {
      if (r.getAttribute('data-id') === alertId) {
        r.classList.add('selected-row');
      } else {
        r.classList.remove('selected-row');
      }
    });
  }

  // Populate SHAP Panel
  const alert = activeAlerts.find(a => a.id === alertId);
  const shapDrawer = document.getElementById('shap-drawer');
  const emptyState = document.getElementById('shap-content-placeholder');
  const content = document.getElementById('shap-content');

  if (alert && shapDrawer && emptyState && content) {
    shapDrawer.classList.remove('hidden-drawer');
    emptyState.classList.add('hidden');
    content.classList.remove('hidden');

    document.getElementById('shap-alert-id').textContent = alert.id;
    document.getElementById('shap-alert-title').textContent = alert.title;
    document.getElementById('shap-alert-descr').textContent = alert.details;
    document.getElementById('shap-score').textContent = `${Math.round(alert.shapFeatures[0].value * 100)}%`;
    document.getElementById('shap-mitre').textContent = alert.technique.split(' ')[0];

    // Status styling for score
    const scoreEl = document.getElementById('shap-score');
    if (alert.status === 'mitigated') {
      scoreEl.className = 'val text-nominal';
      scoreEl.textContent = 'RESOLVED';
    } else {
      scoreEl.className = 'val text-critical';
    }

    // Draw SHAP chart
    const chartContainer = document.getElementById('shap-chart-container');
    chartContainer.innerHTML = '';

    alert.shapFeatures.forEach(feat => {
      const row = document.createElement('div');
      row.className = 'shap-bar-row';
      
      const valStr = feat.direction === 'positive' ? `+${feat.value.toFixed(2)}` : `${feat.value.toFixed(2)}`;
      const fillWidth = Math.abs(feat.value) * 100;
      const directionClass = feat.direction;

      row.innerHTML = `
        <div class="shap-bar-label font-mono">
          <span class="shap-bar-name" title="${feat.name}">${feat.name}</span>
          <span class="shap-bar-val ${directionClass === 'positive' ? 'text-critical' : 'text-nominal'}">${valStr}</span>
        </div>
        <div class="shap-bar-bg">
          <div class="shap-bar-fill ${directionClass}" style="width: ${fillWidth}%"></div>
        </div>
      `;
      chartContainer.appendChild(row);
    });

    // Update Action Button availability based on alert status
    resetResponseGateButtons();
    
    // Highlight relevant node in MITRE graph
    highlightGraphNodeForTactic(alert.tactic);
  }
}

function highlightGraphNodeForTactic(tactic) {
  const nodes = document.querySelectorAll('.graph-node');
  nodes.forEach(node => {
    const nodeTactic = node.getAttribute('data-tactic');
    if (nodeTactic === tactic) {
      node.classList.add('active');
    } else {
      node.classList.remove('active');
    }
  });
}

/* --------------------------------------------------------------------------
   Audit Logs Feed
   -------------------------------------------------------------------------- */
function initAuditLogs() {
  const ticker = document.getElementById('audit-log-ticker');
  if (!ticker) return;

  ticker.innerHTML = '';
  
  auditLogs.forEach(log => {
    const item = document.createElement('div');
    
    // Parse actor/component and message from log event
    let actor = 'SYSTEM';
    let message = log.event;
    if (log.event.includes(':')) {
      const parts = log.event.split(':');
      actor = parts[0].trim();
      message = parts.slice(1).join(':').trim();
    } else {
      if (log.type === 'analyst') actor = 'OPERATOR';
      else if (log.type === 'reasoner') actor = 'REASONER';
    }

    item.className = `audit-log-row ${log.type}`;
    item.innerHTML = `
      <span class="log-col-time">${log.timestamp}</span>
      <span class="log-col-actor">${actor}</span>
      <span class="log-col-msg">${message}</span>
    `;
    ticker.appendChild(item);
  });

  // Scroll to bottom
  ticker.scrollTop = ticker.scrollHeight;
}

function addAuditLog(eventText, type = 'analyst') {
  const now = new Date();
  const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
  
  auditLogs.push({ timestamp, event: eventText, type });
  initAuditLogs();
}

/* --------------------------------------------------------------------------
   Human Gated Actions Handlers
   -------------------------------------------------------------------------- */
function initResponseActions() {
  const btnApprove = document.getElementById('btn-approve');
  const btnDeny = document.getElementById('btn-deny');
  const btnEscalate = document.getElementById('btn-escalate');

  if (btnApprove) {
    btnApprove.addEventListener('click', () => {
      executeAction('approved', 'Mitigation approved by operator. Threat containerized and network isolated.');
    });
  }

  if (btnDeny) {
    btnDeny.addEventListener('click', () => {
      executeAction('dismissed', 'Threat anomaly dismissed as false positive. Policy gates reset.');
    });
  }

  if (btnEscalate) {
    btnEscalate.addEventListener('click', () => {
      executeAction('escalated', 'Threat escalation trigger. Notification packet routed to CSIRT security team.');
    });
  }
}

function executeAction(actionType, logText) {
  if (!selectedAlertId) return;

  const alertIndex = activeAlerts.findIndex(a => a.id === selectedAlertId);
  if (alertIndex === -1) return;

  const alert = activeAlerts[alertIndex];
  
  // Set alert status
  alert.status = actionType === 'approved' ? 'mitigated' : actionType;
  
  // Visual button feedback
  const gateStatusText = document.getElementById('gate-status-text');
  const btnApprove = document.getElementById('btn-approve');
  const btnDeny = document.getElementById('btn-deny');
  const btnEscalate = document.getElementById('btn-escalate');

  if (actionType === 'approved') {
    btnApprove.classList.add('confirmed');
    btnApprove.innerHTML = `<span class="btn-num">01</span> MITIGATION_APPROVED`;
    gateStatusText.className = 'text-nominal';
    gateStatusText.textContent = 'INTERVENTION SUCCESSFUL: NETWORK ISOLATED';
    
    // Also resolve assets and links state
    updateGraphNodeState(alert.tactic, 'mitigated');
  } else if (actionType === 'dismissed') {
    btnDeny.classList.add('confirmed');
    btnDeny.innerHTML = `<span class="btn-num">02</span> ALERT_DISMISSED`;
    gateStatusText.className = 'text-muted';
    gateStatusText.textContent = 'INCIDENT DISMISSED';
    
    updateGraphNodeState(alert.tactic, 'nominal');
  } else {
    btnEscalate.classList.add('confirmed');
    btnEscalate.innerHTML = `<span class="btn-num">03</span> ESCALATED`;
    gateStatusText.className = 'text-critical';
    gateStatusText.textContent = 'CSIRT ALERT PACKETS SENT';
  }

  // Add event log
  addAuditLog(`ACTION GATE [${alert.id}]: ${logText}`, 'analyst');

  // Disable other buttons
  btnApprove.disabled = true;
  btnDeny.disabled = true;
  btnEscalate.disabled = true;

  // Refresh feed & SHAP drawer displays
  initAlertFeed();
  initAssetNav();
  
  // Redraw canvas to update line colors based on new node state
  redrawCircuitLinks();
}

function updateGraphNodeState(tactic, newState) {
  const node = graphStructure.nodes.find(n => n.id === tactic);
  if (node) {
    node.state = newState;
    
    // Find overlay HTML element and update classes
    const overlayNode = document.querySelector(`.graph-node[data-tactic="${tactic}"]`);
    if (overlayNode) {
      overlayNode.className = `graph-node state-${newState}`;
    }
  }

  // Update associated links
  graphStructure.links.forEach(link => {
    if (link.source === tactic || link.target === tactic) {
      // If either end is critical, the link is critical. If one is nominal, link is nominal.
      const srcNode = graphStructure.nodes.find(n => n.id === link.source);
      const tgtNode = graphStructure.nodes.find(n => n.id === link.target);
      if (srcNode.state === 'critical' || tgtNode.state === 'critical') {
        link.state = 'critical';
      } else if (srcNode.state === 'mitigated' || tgtNode.state === 'mitigated') {
        link.state = 'mitigated';
      } else {
        link.state = 'nominal';
      }
    }
  });
}

function resetResponseGateButtons() {
  const btnApprove = document.getElementById('btn-approve');
  const btnDeny = document.getElementById('btn-deny');
  const btnEscalate = document.getElementById('btn-escalate');
  const gateStatusText = document.getElementById('gate-status-text');

  if (!btnApprove || !btnDeny || !btnEscalate) return;

  const alert = activeAlerts.find(a => a.id === selectedAlertId);
  
  if (!alert) {
    btnApprove.disabled = true;
    btnDeny.disabled = true;
    btnEscalate.disabled = true;
    gateStatusText.className = 'text-muted';
    gateStatusText.textContent = 'NO ACTIVE ALERT SELECTED';
    return;
  }

  // Reset text
  btnApprove.innerHTML = `<span class="btn-num">01</span> APPROVE_INTERVENTION`;
  btnDeny.innerHTML = `<span class="btn-num">02</span> DENY_AND_DISMISS`;
  btnEscalate.innerHTML = `<span class="btn-num">03</span> ESCALATE_TO_CSIRT`;

  btnApprove.className = 'action-btn action-btn-approve font-mono';
  btnDeny.className = 'action-btn action-btn-deny font-mono';
  btnEscalate.className = 'action-btn action-btn-escalate font-mono';

  if (alert.status === 'pending') {
    btnApprove.disabled = false;
    btnDeny.disabled = false;
    btnEscalate.disabled = false;
    gateStatusText.className = 'text-pending';
    gateStatusText.textContent = 'AWAITING AUTHORIZATION...';
  } else {
    btnApprove.disabled = true;
    btnDeny.disabled = true;
    btnEscalate.disabled = true;
    
    if (alert.status === 'mitigated') {
      btnApprove.classList.add('confirmed');
      btnApprove.innerHTML = `<span class="btn-num">01</span> MITIGATION_APPROVED`;
      gateStatusText.className = 'text-nominal';
      gateStatusText.textContent = 'INTERVENTION SUCCESSFUL: NETWORK ISOLATED';
    } else if (alert.status === 'dismissed') {
      btnDeny.classList.add('confirmed');
      btnDeny.innerHTML = `<span class="btn-num">02</span> ALERT_DISMISSED`;
      gateStatusText.className = 'text-muted';
      gateStatusText.textContent = 'INCIDENT DISMISSED';
    } else {
      btnEscalate.classList.add('confirmed');
      btnEscalate.innerHTML = `<span class="btn-num">03</span> ESCALATED`;
      gateStatusText.className = 'text-critical';
      gateStatusText.textContent = 'CSIRT ALERT PACKETS SENT';
    }
  }
}

/* --------------------------------------------------------------------------
   MITRE Graph Canvas Board & Links Drawing
   -------------------------------------------------------------------------- */
function initGraph() {
  canvas = document.getElementById('attack-chain-canvas');
  if (!canvas) return;

  ctx = canvas.getContext('2d');
  
  // Set up resize listeners
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Draw overlay nodes
  renderGraphNodesOverlay();

  // Start connection drawing animation loop
  animateCircuitLines();
}

function resizeCanvas() {
  if (!canvas) return;
  const parent = canvas.parentElement;
  
  // DPI Scaling for sharp canvas text/lines
  const dpi = window.devicePixelRatio || 1;
  canvas.width = parent.clientWidth * dpi;
  canvas.height = parent.clientHeight * dpi;
  canvas.style.width = parent.clientWidth + 'px';
  canvas.style.height = parent.clientHeight + 'px';
  ctx.scale(dpi, dpi);

  redrawCircuitLinks();
}

function renderGraphNodesOverlay() {
  const overlay = document.getElementById('graph-nodes-overlay');
  if (!overlay) return;

  overlay.innerHTML = '';

  graphStructure.nodes.forEach(node => {
    const el = document.createElement('div');
    el.className = `graph-node state-${node.state}`;
    el.setAttribute('data-tactic', node.id);
    
    // Absolute position coords mapped to percentage spacing (scales responsively)
    el.style.left = `${(node.x / 520) * 100}%`;
    el.style.top = `${(node.y / 300) * 100}%`;

    el.innerHTML = `
      <span class="graph-node-title">${node.id}</span>
      <span class="graph-node-id font-mono">${node.technique}</span>
    `;

    el.addEventListener('click', () => {
      // Find matching alert for this tactic, if it exists, and select it
      const matchedAlert = activeAlerts.find(a => a.tactic === node.id);
      if (matchedAlert) {
        selectAlert(matchedAlert.id);
      } else {
        // Just highlight the node visually
        highlightGraphNodeForTactic(node.id);
        
        // Hide SHAP drawer
        const shapDrawer = document.getElementById('shap-drawer');
        if (shapDrawer) shapDrawer.classList.add('hidden-drawer');
      }
    });

    overlay.appendChild(el);
  });
}

function redrawCircuitLinks() {
  if (!canvas || !ctx) return;

  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  
  ctx.clearRect(0, 0, w, h);

  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  const gridColor = isLight ? '#E5E8EC' : '#0d1014';
  const normalLineColor = isLight ? '#D1D5DB' : '#1b1f26';
  const mitigatedLineColor = isLight ? '#A1A8B5' : 'rgba(107, 114, 128, 0.4)';

  // 1. Draw circuit board background grids (subtle tech style)
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  const gridSize = 25;
  for (let x = 0; x < w; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // 2. Draw links between nodes
  graphStructure.links.forEach(link => {
    const srcNode = graphStructure.nodes.find(n => n.id === link.source);
    const tgtNode = graphStructure.nodes.find(n => n.id === link.target);
    
    if (!srcNode || !tgtNode) return;

    // Map conceptual coordinates (520x300) to actual canvas dimensions
    const x1 = (srcNode.x / 520) * w;
    const y1 = (srcNode.y / 300) * h;
    const x2 = (tgtNode.x / 520) * w;
    const y2 = (tgtNode.y / 300) * h;

    // Draw connection trace lines
    ctx.beginPath();
    
    // Create circuit-style right angle corner routing or smooth curves
    ctx.moveTo(x1, y1);
    const midX = x1 + (x2 - x1) * 0.5;
    ctx.bezierCurveTo(midX, y1, midX, y2, x2, y2);

    if (link.state === 'critical') {
      ctx.strokeStyle = '#FF5D5D';
      ctx.lineWidth = 2.5;
      // Add neon glow shadow layer to canvas line
      ctx.shadowColor = 'rgba(255, 93, 93, 0.4)';
      ctx.shadowBlur = 4;
    } else if (link.state === 'mitigated') {
      ctx.strokeStyle = mitigatedLineColor;
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 0;
    } else {
      ctx.strokeStyle = normalLineColor; // Nominal path flush with board
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 0;
    }
    
    ctx.stroke();
    ctx.shadowBlur = 0; // reset
  });
}

function animateCircuitLines() {
  pulseOffset += 0.45;
  if (pulseOffset > 100) pulseOffset = 0;

  redrawCircuitLinks();

  // Draw animated pulse signals traversing critical paths (only if active pulse is triggered)
  if (canvas && ctx && Date.now() < pulseActiveEndTime) {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    graphStructure.links.forEach(link => {
      if (link.state !== 'critical') return;

      const srcNode = graphStructure.nodes.find(n => n.id === link.source);
      const tgtNode = graphStructure.nodes.find(n => n.id === link.target);
      
      if (!srcNode || !tgtNode) return;

      const x1 = (srcNode.x / 520) * w;
      const y1 = (srcNode.y / 300) * h;
      const x2 = (tgtNode.x / 520) * w;
      const y2 = (tgtNode.y / 300) * h;

      // Draw moving pulse dot
      const midX = x1 + (x2 - x1) * 0.5;
      
      // Approximate bezier calculation for animation point
      const t = (pulseOffset / 100);
      
      // De Casteljau's algorithm for cubic bezier (x1, y1) -> (midX, y1) -> (midX, y2) -> (x2, y2)
      const cx1 = midX;
      const cy1 = y1;
      const cx2 = midX;
      const cy2 = y2;

      const mt = 1 - t;
      
      // Calculate coordinates along the bezier path
      const px = mt * mt * mt * x1 + 3 * mt * mt * t * cx1 + 3 * mt * t * t * cx2 + t * t * t * x2;
      const py = mt * mt * mt * y1 + 3 * mt * mt * t * cy1 + 3 * mt * t * t * cy2 + t * t * t * y2;

      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#FF5D5D';
      ctx.shadowColor = '#FF5D5D';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  }

  animationFrameId = requestAnimationFrame(animateCircuitLines);
}
