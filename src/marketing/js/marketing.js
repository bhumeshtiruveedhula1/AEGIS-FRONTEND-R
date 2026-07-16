/* ==========================================================================
   AEGIS Marketing Site - JavaScript Logic
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initHeroBackground();
  initHeroSimulation();
  initSystemAccordion();
  initDigitalTwinMock();
  initContactForm();
  initNavHeartbeat();
  initScrollReveal();
});

/* --------------------------------------------------------------------------
   0. Hero Background Image Lazy Load
   -------------------------------------------------------------------------- */
function initHeroBackground() {
  const video = document.getElementById('hero-video');
  const bgContainer = document.querySelector('.video-container');
  if (!video || !bgContainer) return;

  // Fallback if user prefers reduced motion
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    video.style.display = 'none';
    bgContainer.style.backgroundImage = "url('/src/marketing/assets/hero_background.png')";
    bgContainer.style.backgroundSize = "cover";
    bgContainer.style.backgroundPosition = "center";
    bgContainer.style.backgroundRepeat = "no-repeat";
    bgContainer.style.opacity = '0.3';
    return;
  }

  // Fade-in video smoothly once ready to play
  video.addEventListener('canplay', () => {
    video.classList.add('loaded');
  });

  // Revert to static grid image if video load fails
  video.addEventListener('error', () => {
    video.style.display = 'none';
    bgContainer.style.backgroundImage = "url('/src/marketing/assets/hero_background.png')";
    bgContainer.style.backgroundSize = "cover";
    bgContainer.style.backgroundPosition = "center";
    bgContainer.style.backgroundRepeat = "no-repeat";
    bgContainer.style.opacity = '0.3';
  });
}

/* --------------------------------------------------------------------------
   1. Nav Heartbeat
   -------------------------------------------------------------------------- */
function initNavHeartbeat() {
  const statusDot = document.querySelector('.status-dot');
  const statusText = document.querySelector('.status-text');
  
  if (!statusDot) return;
  
  // Subtle state shifts for the heartbeat to show active background telemetry
  let pulse = true;
  setInterval(() => {
    statusDot.style.opacity = pulse ? '0.4' : '1.0';
    pulse = !pulse;
  }, 1000);
}

/* --------------------------------------------------------------------------
   2. Hero Simulation Loop
   -------------------------------------------------------------------------- */
function initHeroSimulation() {
  const svg = document.getElementById('hero-schematic');
  const logEl = document.getElementById('schematic-log');
  const statusText = document.querySelector('.simulation-status');
  
  if (!svg || !logEl) return;

  // Node elements
  const nodeIngress = document.getElementById('node-lan-ingress');
  const nodeModbusGw = document.getElementById('node-modbus-gateway');
  const nodeVpn = document.getElementById('node-vpn-ingress');
  const nodeDetector = document.getElementById('node-isolation-forest');
  const nodeReasoner = document.getElementById('node-mitre-reasoner');
  const nodeIsolateDc = document.getElementById('node-isolate-domain');
  const nodeTripBreaker = document.getElementById('node-shut-breaker');

  // Animated overlay path paths
  const activePath1 = document.getElementById('active-path-1');
  const activePath2 = document.getElementById('active-path-2');

  const nodes = [nodeIngress, nodeModbusGw, nodeVpn, nodeDetector, nodeReasoner, nodeIsolateDc, nodeTripBreaker];

  function resetAll() {
    nodes.forEach(n => {
      n.classList.remove('state-nominal', 'state-critical', 'state-pending');
    });
    activePath1.setAttribute('stroke', 'transparent');
    activePath1.classList.remove('animating');
    activePath2.setAttribute('stroke', 'transparent');
    activePath2.classList.remove('animating');
    statusText.textContent = 'STANDBY';
    statusText.style.color = 'var(--text-muted)';
  }

  let step = 0;
  const simulationSteps = [
    {
      // Step 0: Standby nominal
      action: () => {
        resetAll();
        nodes.forEach(n => n.classList.add('state-nominal'));
        logEl.textContent = 'SYS.STATUS // TELEMETRY_STREAM_NOMINAL // ENFORCING_POLICY_GATES';
      },
      duration: 3500
    },
    {
      // Step 1: Anomalous Modbus Poll (Intrusion Origin)
      action: () => {
        resetAll();
        // Keep others nominal, alert Modbus Gateway
        nodes.forEach(n => n.classList.add('state-nominal'));
        
        nodeModbusGw.classList.remove('state-nominal');
        nodeModbusGw.classList.add('state-critical');
        
        logEl.textContent = 'ALERT_RAW // MODBUS_GATEWAY // UNEXPECTED_REG_WRITE (ADDR_40021_VALUE_999)';
        statusText.textContent = 'DETECTION';
        statusText.style.color = 'var(--signal-critical)';
      },
      duration: 3000
    },
    {
      // Step 2: Isolation Forest & SHAP flag anomaly -> Graph Reasoner link established
      action: () => {
        nodeDetector.classList.remove('state-nominal');
        nodeDetector.classList.add('state-critical');
        
        // Trigger red glow on path from Modbus to Detector
        // (path trace: M 60,175 C 130,175 130,70 200,70 -> active-path-1)
        activePath1.setAttribute('stroke', '#FF5D5D');
        activePath1.classList.add('animating');
        
        logEl.textContent = 'ISOLATION_FOREST // ANOMALY_INDEX: 0.94 // SHAP: DEST_REG_VAR [POS: +0.67]';
        statusText.textContent = 'REASONING';
      },
      duration: 3500
    },
    {
      // Step 3: Graph Reasoner identifies lateral movement attempt to Domain Controller
      action: () => {
        nodeReasoner.classList.remove('state-nominal');
        nodeReasoner.classList.add('state-critical');
        
        // Glow reasoning connections
        // (path trace: M 200,70 C 310,70 310,230 420,230 -> active-path-2)
        activePath2.setAttribute('stroke', '#FF5D5D');
        activePath2.classList.add('animating');
        
        logEl.textContent = 'GRAPH_REASONER // ATT&CK_STAGE: LATERAL_MOVEMENT // PATH: T1021.002 [CONFIDENCE: 92%]';
      },
      duration: 3500
    },
    {
      // Step 4: Gated Response Action Pending Analyst Approval
      action: () => {
        // Shift terminals to pending
        nodeIsolateDc.classList.remove('state-nominal');
        nodeIsolateDc.classList.add('state-pending');
        nodeTripBreaker.classList.remove('state-nominal');
        nodeTripBreaker.classList.add('state-pending');
        
        // Shift paths to pending (amber)
        activePath1.setAttribute('stroke', '#FFB020');
        activePath2.setAttribute('stroke', '#FFB020');
        
        logEl.textContent = 'POLICY_GATE // RESPONSE_REQUIRED: TRIP_MODBUS_GW & ISOLATE_DC [AWAITING_ANALYST]';
        statusText.textContent = 'PENDING_GATE';
        statusText.style.color = 'var(--signal-pending)';
      },
      duration: 4000
    },
    {
      // Step 5: Incident mitigation (nominal teal)
      action: () => {
        resetAll();
        nodes.forEach(n => n.classList.add('state-nominal'));
        logEl.textContent = 'SYS.RESOLVED // ACTION_EXECUTED: THREAT_CONTAINED // NETWORKS_RE_BASILINED';
        statusText.textContent = 'CONTAINED';
        statusText.style.color = '#2DD4BF';
      },
      duration: 3500
    }
  ];

  function runLoop() {
    const currentStep = simulationSteps[step];
    currentStep.action();
    
    step = (step + 1) % simulationSteps.length;
    setTimeout(runLoop, currentStep.duration);
  }

  // Start the simulation loop
  runLoop();
}

/* --------------------------------------------------------------------------
   3. System Internals Accordion
   -------------------------------------------------------------------------- */
function initSystemAccordion() {
  const items = document.querySelectorAll('.layer-item');
  if (items.length === 0) return;

  // Auto-expand first item
  items[0].classList.add('expanded');

  items.forEach(item => {
    const summary = item.querySelector('.layer-summary');
    summary.addEventListener('click', () => {
      const isExpanded = item.classList.contains('expanded');
      
      // Close all other items
      items.forEach(i => i.classList.remove('expanded'));
      
      // Toggle current item
      if (!isExpanded) {
        item.classList.add('expanded');
      }
    });
  });
}

/* --------------------------------------------------------------------------
   4. Digital Twin Telemetry Diagram
   -------------------------------------------------------------------------- */
function initDigitalTwinMock() {
  const buttons = document.querySelectorAll('.twin-btn');
  const panelTitle = document.querySelector('#twin-info-panel .diagram-heading');
  const telemetryText = document.querySelector('#twin-info-panel .diagram-telemetry-text');
  const telemetryGroup = document.getElementById('telemetry-group');
  
  if (!buttons.length || !panelTitle || !telemetryGroup) return;

  const twinConfig = {
    hospital: {
      title: 'HOSPITAL_DIGITAL_TWIN // HL7_FEED // MEDICAL_GW',
      rate: '4.8 kbps',
      jitter: '0.12ms',
      telemetry: [
        { type: 'hl7_patient_vitals', active: true, offset: 0 },
        { type: 'gw_auth_stream', active: true, offset: 50 },
        { type: 'icu_telemetry_pkg', active: false, offset: 100 }
      ],
      nodes: [
        { cx: 80, cy: 55, label: 'GW_INGRESS' },
        { cx: 200, cy: 110, label: 'HL7_BROKER' },
        { cx: 320, cy: 165, label: 'EMR_DATABASE' }
      ]
    },
    domain: {
      title: 'DOMAIN_CONTROLLER_TWIN // AD_REPLICATION // KERBEROS',
      rate: '11.4 kbps',
      jitter: '0.04ms',
      telemetry: [
        { type: 'krb_as_req', active: true, offset: 0 },
        { type: 'ldap_query_sync', active: true, offset: 40 },
        { type: 'gpo_push_pkg', active: true, offset: 80 }
      ],
      nodes: [
        { cx: 80, cy: 110, label: 'SUBNET_AD' },
        { cx: 200, cy: 55, label: 'KDC_SERVICE' },
        { cx: 320, cy: 110, label: 'SYSVOL_REPL' }
      ]
    },
    modbus: {
      title: 'OT_MODBUS_SCADA // PLCS_FEED // INDUSTRIAL_BUS',
      rate: '1.2 kbps',
      jitter: '0.85ms',
      telemetry: [
        { type: 'modbus_coil_poll', active: true, offset: 0 },
        { type: 'holding_reg_write', active: true, offset: 60 },
        { type: 'hmi_heartbeat', active: false, offset: 120 }
      ],
      nodes: [
        { cx: 80, cy: 165, label: 'PLC_IP_42' },
        { cx: 200, cy: 165, label: 'MODBUS_TCP' },
        { cx: 320, cy: 55, label: 'HMI_PANEL' }
      ]
    }
  };

  let animationFrameId = null;

  function renderTwin(twinKey) {
    const config = twinConfig[twinKey];
    panelTitle.textContent = config.title;
    telemetryText.innerHTML = `
      STATUS: <span class="highlight-text">INTEGRATED</span><br>
      FLOW_RATE: ${config.rate} // JITTER: ${config.jitter} // SIMULATOR: ON
    `;

    // Clear previous drawing
    telemetryGroup.innerHTML = '';
    
    // Stop any existing animation loop
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }

    // Draw nodes
    config.nodes.forEach((node) => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('transform', `translate(${node.cx}, ${node.cy})`);
      
      const outer = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      outer.setAttribute('r', '6');
      outer.setAttribute('fill', '#111');
      outer.setAttribute('stroke', '#333');
      outer.setAttribute('stroke-width', '1');
      
      const inner = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      inner.setAttribute('r', '3');
      inner.setAttribute('fill', 'var(--signal-accent)');
      
      const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      txt.setAttribute('y', '15');
      txt.setAttribute('text-anchor', 'middle');
      txt.setAttribute('fill', '#8A8F98');
      txt.setAttribute('font-size', '6px');
      txt.textContent = node.label;
      
      g.appendChild(outer);
      g.appendChild(inner);
      g.appendChild(txt);
      telemetryGroup.appendChild(g);
    });

    // Create paths connecting the nodes
    // Node 0 -> Node 1 -> Node 2
    const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const d1 = `M ${config.nodes[0].cx},${config.nodes[0].cy} L ${config.nodes[1].cx},${config.nodes[1].cy}`;
    path1.setAttribute('d', d1);
    path1.setAttribute('stroke', '#1E1E1E');
    path1.setAttribute('stroke-width', '1.5');
    path1.setAttribute('fill', 'none');
    
    const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const d2 = `M ${config.nodes[1].cx},${config.nodes[1].cy} L ${config.nodes[2].cx},${config.nodes[2].cy}`;
    path2.setAttribute('d', d2);
    path2.setAttribute('stroke', '#1E1E1E');
    path2.setAttribute('stroke-width', '1.5');
    path2.setAttribute('fill', 'none');

    // Prepend paths so they are below node circles
    telemetryGroup.insertBefore(path2, telemetryGroup.firstChild);
    telemetryGroup.insertBefore(path1, telemetryGroup.firstChild);

    // Create packet elements flowing along the paths
    const packets = [];
    config.telemetry.forEach((t, index) => {
      const pct = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      pct.setAttribute('r', '2');
      pct.setAttribute('fill', 'var(--signal-accent)');
      pct.setAttribute('opacity', '0.8');
      telemetryGroup.appendChild(pct);
      packets.push({
        element: pct,
        progress: (index * 0.3) % 1.0, // spread packets out
        speed: 0.005 + Math.random() * 0.003,
        path: index % 2 === 0 ? { start: config.nodes[0], end: config.nodes[1] } : { start: config.nodes[1], end: config.nodes[2] }
      });
    });

    // Simple animation loop for packets
    function animate() {
      packets.forEach((p) => {
        p.progress += p.speed;
        if (p.progress >= 1.0) {
          p.progress = 0;
        }
        
        // Linearly interpolate positions
        const x = p.path.start.cx + (p.path.end.cx - p.path.start.cx) * p.progress;
        const y = p.path.start.cy + (p.path.end.cy - p.path.start.cy) * p.progress;
        
        p.element.setAttribute('cx', x);
        p.element.setAttribute('cy', y);
      });
      
      animationFrameId = requestAnimationFrame(animate);
    }
    animate();
  }

  // Bind buttons
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const twinKey = btn.getAttribute('data-twin');
      renderTwin(twinKey);
    });
  });

  // Initial draw
  renderTwin('hospital');
}

/* --------------------------------------------------------------------------
   5. Form Handler
   -------------------------------------------------------------------------- */
function initContactForm() {
  const form = document.getElementById('marketing-contact-form');
  const statusMsg = document.getElementById('form-status-msg');
  if (!form || !statusMsg) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const name = document.getElementById('contact-name').value;
    const email = document.getElementById('contact-email').value;

    statusMsg.style.color = 'var(--signal-accent)';
    statusMsg.textContent = 'TRANSMITTING REQUEST...';

    setTimeout(() => {
      statusMsg.style.color = '#2DD4BF';
      statusMsg.textContent = `INTEGRATION_REQUEST_TRANSMITTED: Awaiting response at [${email}]`;
      form.reset();
      
      // Clear message after delay
      setTimeout(() => {
        statusMsg.textContent = '';
      }, 5000);
    }, 1200);
  });
}

/* --------------------------------------------------------------------------
   6. Scroll Reveal Engine
   -------------------------------------------------------------------------- */
function initScrollReveal() {
  const revealEls = document.querySelectorAll('.reveal-on-scroll');
  if (revealEls.length === 0) return;

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        obs.unobserve(entry.target); // Trigger reveal once
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px'
  });

  revealEls.forEach(el => observer.observe(el));
}
