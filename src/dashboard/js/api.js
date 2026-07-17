/* ==========================================================================
   AEGIS Defender Console — Backend API Client & Adapter
   ==========================================================================
   Fetches real data from the 7 registered dashboard endpoints.
   Normalises each response into the shape expected by dashboard.js.
   Falls back to fixtures.js if the backend is unreachable.

   Endpoints consumed (all read-only, no POST/PUT):
     GET /api/v1/dashboard/overview
     GET /api/v1/dashboard/incidents
     GET /api/v1/dashboard/metrics
     GET /api/v1/dashboard/chains
     GET /api/v1/dashboard/context/{context_id}
     GET /api/v1/dashboard/orchestrator
     GET /api/v1/dashboard/orchestrator/{orchestration_id}

   NOT wired (infra probes, not dashboard data):
     GET /health, GET /ready, GET /version
   ========================================================================== */

import {
  mockAssets,
  mockAlerts,
  mockAuditLogs,
  graphStructure as mockGraphStructure,
} from './fixtures.js';

// ---------------------------------------------------------------------------
// Config — Vite exposes VITE_* from .env via import.meta.env
// Falls back to localhost:8000 in production builds without .env
// ---------------------------------------------------------------------------
const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL)
  ? import.meta.env.VITE_API_URL
  : 'http://localhost:8000';

const DASHBOARD = `${API_BASE}/api/v1/dashboard`;

// Dev mode flag — set to true to force fixtures even when backend is reachable
export const USE_FIXTURES = false;

// ---------------------------------------------------------------------------
// Core fetch wrapper — returns null on any error (no throw)
// ---------------------------------------------------------------------------
async function apiFetch(path) {
  if (USE_FIXTURES) return null;
  try {
    const res = await fetch(`${DASHBOARD}${path}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      console.warn(`[AEGIS API] ${path} → HTTP ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn(`[AEGIS API] ${path} unreachable:`, err.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// 1. Overview  →  platform status banner (no direct DOM equivalent in
//    fixtures — injected into header status badge if element exists)
// ---------------------------------------------------------------------------
export async function fetchOverview() {
  const data = await apiFetch('/overview');
  if (!data) return null;

  // platform_status is now a proper dict from the backend
  const platformStatus = (typeof data.platform_status === 'object' && data.platform_status !== null)
    ? data.platform_status
    : {};

  return {
    generatedAt: data.generated_at,
    status: platformStatus?.status ?? 'unknown',
    components: platformStatus?.components ?? {},
    snapshotAvailable: data.snapshot_available,
    metrics: data.metrics,                  // all may be null (no snapshots yet)
    orchestrationToday: data.orchestration_today,
  };
}

// ---------------------------------------------------------------------------
// 2. Incidents  →  normalised into the mockAlerts shape dashboard.js expects
// ---------------------------------------------------------------------------
//  Backend returns:
//    { context_id, alert_id, entity_id, host, user, timestamp, severity,
//      anomaly_score, detection_confidence, status }
//
//  dashboard.js expects:
//    { id, assetId, title, tactic, severity, status, timestamp,
//      details, shapFeatures: [{name, value, direction}] }
//
//  Fields not in the backend (tactic, shapFeatures, details) are synthesised
//  from available data. assetId maps entity_id → asset list fallback.
// ---------------------------------------------------------------------------
export async function fetchIncidents() {
  const data = await apiFetch('/incidents?limit=50');
  if (!data || !data.incidents?.length) return null;     // null → caller uses fixtures

  return data.incidents.map((inc, idx) => ({
    id: inc.alert_id || inc.context_id || `INC-${idx}`,
    assetId: inc.entity_id || inc.host || 'unknown',
    title: `[${(inc.severity || 'unknown').toUpperCase()}] Anomaly detected on ${inc.host || inc.entity_id || 'entity'}`,
    tactic: null,                                        // backend has no MITRE tactic yet — null signals "no data"
    severity: (inc.severity || 'low').toLowerCase(),
    status: _mapStatus(inc.status),
    timestamp: _fmtTime(inc.timestamp),
    details: `Entity: ${inc.entity_id || '—'} | Host: ${inc.host || '—'} | Score: ${
      inc.anomaly_score != null ? inc.anomaly_score.toFixed(3) : 'N/A'
    } | Confidence: ${inc.detection_confidence != null ? (inc.detection_confidence * 100).toFixed(1) + '%' : 'N/A'}`,
    shapFeatures: [                                      // reconstructed from available floats — not ATT&CK reasoner output
      {
        name: 'anomaly_score',
        value: inc.anomaly_score ?? 0,
        direction: (inc.anomaly_score ?? 0) > 0.5 ? 'positive' : 'negative',
      },
      {
        name: 'detection_confidence',
        value: inc.detection_confidence ?? 0,
        direction: (inc.detection_confidence ?? 0) > 0.6 ? 'positive' : 'negative',
      },
    ],
  }));
}

// ---------------------------------------------------------------------------
// 3. Metrics  →  returned as-is for display; no fixture equivalent
// ---------------------------------------------------------------------------
export async function fetchMetrics() {
  const data = await apiFetch('/metrics');
  if (!data) return null;
  return data.snapshot;   // null when no MetricSnapshot persisted yet
}

// ---------------------------------------------------------------------------
// 4. Chains  →  map into graphStructure.nodes / links shape for the canvas
// ---------------------------------------------------------------------------
export async function fetchChains() {
  const data = await apiFetch('/chains?limit=20');
  if (!data || !data.chains?.length) return null;

  // Build a deduplicated node + link graph from attack chain data
  const nodesMap = new Map();
  const links = [];

  data.chains.forEach((entry, chainIdx) => {
    const chain = entry.chain;
    const steps = chain?.steps ?? chain?.techniques ?? [];

    steps.forEach((step, stepIdx) => {
      const id = step.technique_id || step.technique || `step-${chainIdx}-${stepIdx}`;
      if (!nodesMap.has(id)) {
        nodesMap.set(id, {
          id,
          technique: step.technique_id || id,
          state: step.status === 'active' ? 'critical' : 'nominal',
          x: 60 + (stepIdx % 5) * 110,
          y: 60 + Math.floor(stepIdx / 5) * 90,
        });
      }
      // Link consecutive steps
      if (stepIdx > 0) {
        const prevId = steps[stepIdx - 1].technique_id || steps[stepIdx - 1].technique || `step-${chainIdx}-${stepIdx - 1}`;
        links.push({ source: prevId, target: id, state: 'critical' });
      }
    });
  });

  const nodes = Array.from(nodesMap.values());
  return nodes.length ? { nodes, links } : null;
}

// ---------------------------------------------------------------------------
// 5. Orchestrator  →  audit log rows (closest fixture equivalent: mockAuditLogs)
// ---------------------------------------------------------------------------
export async function fetchOrchestrator() {
  const data = await apiFetch('/orchestrator?limit=30');
  if (!data || !data.records?.length) return null;

  return data.records.map((rec) => ({
    timestamp: _fmtTime(rec.created_at),
    event: `ORCHESTRATOR [${rec.orchestration_id?.slice(0, 8) || '—'}]: playbook=${
      rec.playbook?.name || 'N/A'
    } | approval=${rec.approval?.status || '—'} | blast_radius=${rec.blast_radius?.impact_level || '—'}`,
    type: _orchType(rec.approval?.status),
  }));
}

// ---------------------------------------------------------------------------
// 6. Single context — used when an incident row has a known context_id
// ---------------------------------------------------------------------------
export async function fetchContext(contextId) {
  return apiFetch(`/context/${contextId}`);
}

// ---------------------------------------------------------------------------
// 7. Single orchestration record — for drill-down (future use)
// ---------------------------------------------------------------------------
export async function fetchOrchestrationRecord(orchestrationId) {
  return apiFetch(`/orchestrator/${orchestrationId}`);
}

// ---------------------------------------------------------------------------
// Main data loader — called from dashboard.js instead of the fixtures import.
// Returns the full data bag dashboard.js needs. Falls back gracefully.
// ---------------------------------------------------------------------------
export async function loadDashboardData() {
  const [overview, incidents, metrics, chains, orchLogs] = await Promise.all([
    fetchOverview(),
    fetchIncidents(),
    fetchMetrics(),
    fetchChains(),
    fetchOrchestrator(),
  ]);

  const backendAvailable = overview !== null || incidents !== null;

  return {
    backendAvailable,
    // Asset list: backend has no /assets endpoint → always use fixtures
    assets: mockAssets,

    // Alerts: use real data if available, else fixtures
    alerts: incidents ?? mockAlerts,

    // Audit logs: merge backend orchestrator records + fixture logs
    auditLogs: orchLogs
      ? [...orchLogs, ...mockAuditLogs.slice(0, 5)]
      : mockAuditLogs,

    // Graph: use real chain data if available, else fixtures
    graphStructure: chains ?? mockGraphStructure,

    // New fields not in fixtures (null when no data)
    overview,
    metrics,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function _fmtTime(isoStr) {
  if (!isoStr) return '--:--:--';
  try {
    const d = new Date(isoStr);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  } catch {
    return isoStr;
  }
}

function _mapStatus(backendStatus) {
  if (!backendStatus) return 'pending';
  const s = String(backendStatus).toUpperCase();
  if (s === 'ACTIVE' || s === 'PENDING') return 'pending';
  if (s === 'RESOLVED' || s === 'MITIGATED') return 'mitigated';
  if (s === 'DISMISSED') return 'dismissed';
  if (s === 'ESCALATED') return 'escalated';
  return 'pending';
}

function _orchType(approvalStatus) {
  if (!approvalStatus) return 'reasoner';
  const s = String(approvalStatus).toUpperCase();
  if (s === 'APPROVED') return 'analyst';
  if (s === 'REJECTED') return 'analyst';
  return 'reasoner';
}
