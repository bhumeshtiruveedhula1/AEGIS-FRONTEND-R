/* ==========================================================================
   AEGIS Defender Console - Mock Data Fixtures
   ========================================================================== */

export const mockAssets = [
  {
    id: 'hospital-net',
    name: 'Hospital Medical Network',
    type: 'IT/OT Mesh',
    ipRange: '10.22.0.0/16',
    status: 'critical',
    telemetryRate: '4.8 kbps',
    alertsCount: 3
  },
  {
    id: 'domain-controllers',
    name: 'Active Directory Domain',
    type: 'IT Core',
    ipRange: '10.10.1.0/24',
    status: 'pending',
    telemetryRate: '11.4 kbps',
    alertsCount: 1
  },
  {
    id: 'ot-modbus-scada',
    name: 'OT Modbus SCADA',
    type: 'OT Industrial',
    ipRange: '192.168.42.0/24',
    status: 'nominal',
    telemetryRate: '1.2 kbps',
    alertsCount: 0
  }
];

export const mockAlerts = [
  {
    id: 'AEGIS-2026-8840',
    timestamp: '15:24:02',
    assetId: 'hospital-net',
    title: 'Anomalous Modbus Register Write',
    target: 'MODBUS-PLC-09 (192.168.42.12)',
    severity: 'critical',
    status: 'pending',
    tactic: 'Impact',
    technique: 'T0813 (Damage to Property)',
    details: 'Unusual registry command (write call to holding register 40021 with raw payload 0x03E7) issued from a lease on the local Medical Gateway DHCP scope. Target PLC controls core anesthesia ventilator flow rates.',
    shapFeatures: [
      { name: 'Modbus Payload Deviation', value: 0.88, direction: 'positive' },
      { name: 'Modbus Function Code 16 (Write)', value: 0.65, direction: 'positive' },
      { name: 'Unusual IP Source for OT Bus', value: 0.54, direction: 'positive' },
      { name: 'Source Device Classification: Medical GW', value: 0.22, direction: 'positive' },
      { name: 'Timestamp Within Core Work Hours', value: -0.12, direction: 'negative' },
      { name: 'Ethernet Layer CRC Alignment', value: -0.34, direction: 'negative' }
    ]
  },
  {
    id: 'AEGIS-2026-8839',
    timestamp: '15:22:45',
    assetId: 'domain-controllers',
    title: 'Kerberos Ticket Replication (DC-Sync)',
    target: 'DC-PRIMARY-01 (10.10.1.10)',
    severity: 'critical',
    status: 'pending',
    tactic: 'Lateral Movement',
    technique: 'T1021.002 (SMB/Admin Shares)',
    details: 'DS-GetNCChanges request initiated from non-domain controller source workstation (10.22.4.15). Attempted synchronization of security account manager hashes for Domain Admins.',
    shapFeatures: [
      { name: 'AD Replication Remote RPC Call', value: 0.95, direction: 'positive' },
      { name: 'Non-DC Source Machine (10.22.4.15)', value: 0.81, direction: 'positive' },
      { name: 'Target Object class: User: Admin', value: 0.44, direction: 'positive' },
      { name: 'SMBv3 Session Encrypted', value: -0.18, direction: 'negative' },
      { name: 'Local Security Audit Logging Enabled', value: -0.25, direction: 'negative' }
    ]
  },
  {
    id: 'AEGIS-2026-8837',
    timestamp: '15:20:11',
    assetId: 'hospital-net',
    title: 'WMI Shell Execution via PowerShell',
    target: 'MED-GATEWAY-SRV (10.22.1.2)',
    severity: 'high',
    status: 'mitigated',
    tactic: 'Execution',
    technique: 'T1059.001 (PowerShell)',
    details: 'Remote PowerShell session executed via WMI subscription. Spawns cmd.exe executing encoded Base64 command strings querying subnet gateway controllers.',
    shapFeatures: [
      { name: 'Process Parent: WmiPrvSE.exe', value: 0.79, direction: 'positive' },
      { name: 'Base64 Encoded PowerShell Command', value: 0.72, direction: 'positive' },
      { name: 'Interactive Console Hidden Flag', value: 0.58, direction: 'positive' },
      { name: 'Local Administrator Privilege Level', value: 0.35, direction: 'positive' },
      { name: 'Valid Certificate Signature', value: -0.28, direction: 'negative' }
    ]
  },
  {
    id: 'AEGIS-2026-8836',
    timestamp: '15:18:30',
    assetId: 'hospital-net',
    title: 'Reconnaissance Network Sweep',
    target: 'DMZ-ROUTER (10.22.0.1)',
    severity: 'medium',
    status: 'mitigated',
    tactic: 'Initial Access',
    technique: 'T1595 (Active Scanning)',
    details: 'Rapid TCP SYN sweep targeting Modbus TCP Port 502, DNP3 Port 20000, and HTTP Port 80 across the entire 10.22.4.0/24 subnet block.',
    shapFeatures: [
      { name: 'High Frequency TCP Port Sweep', value: 0.91, direction: 'positive' },
      { name: 'Unique Port Count Target: 4', value: 0.63, direction: 'positive' },
      { name: 'No Completed TCP Handshakes', value: 0.55, direction: 'positive' },
      { name: 'External Source Country Block', value: -0.05, direction: 'negative' }
    ]
  }
];

export const mockAuditLogs = [
  {
    timestamp: '15:24:02',
    event: 'ANOMALY DETECTED: High-weight Modbus function anomaly on asset hospital-net.',
    type: 'system'
  },
  {
    timestamp: '15:22:45',
    event: 'ATT&CK CHAIN ALERT: AD Replication link confirmed. Threat propagated to domain-controllers.',
    type: 'reasoner'
  },
  {
    timestamp: '15:21:00',
    event: 'ACTION EXECUTION APPROVED: Isolated port 5985/wman on host MED-GATEWAY-SRV.',
    type: 'analyst'
  },
  {
    timestamp: '15:20:11',
    event: 'ANOMALY DETECTED: Execution anomalous WMI command on host MED-GATEWAY-SRV.',
    type: 'system'
  },
  {
    timestamp: '15:18:50',
    event: 'ANOMALY DETECTED: Scanning activity mapped on subnets.',
    type: 'system'
  }
];

export const graphStructure = {
  nodes: [
    { id: 'Initial Access', technique: 'T1595', x: 80, y: 150, state: 'mitigated' },
    { id: 'Execution', technique: 'T1059', x: 200, y: 150, state: 'mitigated' },
    { id: 'Persistence', technique: 'T1546', x: 320, y: 80, state: 'nominal' },
    { id: 'Defense Evasion', technique: 'T1027', x: 320, y: 220, state: 'nominal' },
    { id: 'Lateral Movement', technique: 'T1021.002', x: 440, y: 80, state: 'critical' },
    { id: 'Impact', technique: 'T0813', x: 440, y: 220, state: 'critical' }
  ],
  links: [
    { source: 'Initial Access', target: 'Execution', state: 'mitigated' },
    { source: 'Execution', target: 'Persistence', state: 'nominal' },
    { source: 'Execution', target: 'Defense Evasion', state: 'nominal' },
    { source: 'Execution', target: 'Lateral Movement', state: 'critical' },
    { source: 'Lateral Movement', target: 'Impact', state: 'critical' }
  ]
};
