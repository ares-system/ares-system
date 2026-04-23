export interface Target {
  id: string;
  name: string;
  type: 'wallet' | 'contract' | 'repo' | 'domain' | 'endpoint' | 'identity';
  status: 'protected' | 'monitoring' | 'vulnerable' | 'unverified';
  riskScore: number;
  coverage: number;
  lastSeen: string;
  owner?: string;
}

export interface Detection {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  status: 'open' | 'triaged' | 'resolved' | 'dismissed';
  confidence: number;
  timestamp: string;
  targetId: string;
  assignee?: string;
  description: string;
  indicators: string[];
}

export interface Investigation {
  id: string;
  title: string;
  priority: 'p0' | 'p1' | 'p2' | 'p3';
  status: 'active' | 'pending' | 'closed';
  owner: string;
  detections: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Agent {
  id: string;
  name: string;
  type: string;
  status: 'idle' | 'running' | 'error';
  lastRun: string;
  successRate: number;
  currentTask?: string;
  model: string;
}

export const mockTargets: Target[] = [
  { id: 't-1', name: 'Mainnet Treasury', type: 'wallet', status: 'protected', riskScore: 12, coverage: 98, lastSeen: '12m ago', owner: 'Finance' },
  { id: 't-2', name: 'DEX Aggregator Proxy', type: 'contract', status: 'vulnerable', riskScore: 78, coverage: 45, lastSeen: '2m ago', owner: 'Core Dev' },
  { id: 't-3', name: 'ares-monorepo', type: 'repo', status: 'protected', riskScore: 5, coverage: 100, lastSeen: '1h ago', owner: 'Security' },
  { id: 't-4', name: 'api.ares.network', type: 'endpoint', status: 'monitoring', riskScore: 24, coverage: 82, lastSeen: '5m ago', owner: 'SRE' },
];

export const mockDetections: Detection[] = [
  { 
    id: 'det-1', 
    title: 'Suspicious PDA Ownership Transfer', 
    severity: 'critical', 
    status: 'open', 
    confidence: 0.94, 
    timestamp: '2026-04-23T14:10:00Z', 
    targetId: 't-2',
    description: 'Autonomous scan detected a transaction attempting to re-initialize an already initialized Program Derived Address.',
    indicators: ['cpi_call_hijack', 'unauthorized_pda_seed']
  },
  { 
    id: 'det-2', 
    title: 'Unencrypted API Key in .env', 
    severity: 'high', 
    status: 'triaged', 
    confidence: 1.0, 
    timestamp: '2026-04-23T13:45:00Z', 
    targetId: 't-3',
    assignee: 'Alice',
    description: 'Secret hygiene scanner found a plaintext MAINNET_KEY in the environment file.',
    indicators: ['hardcoded_secret']
  }
];

export const mockAgents: Agent[] = [
  { id: 'a-1', name: 'ARES Orchestrator', type: 'coordinator', status: 'running', lastRun: 'Just now', successRate: 99.4, currentTask: 'Synthesizing repo report', model: 'Gemini 2.5 Flash' },
  { id: 'a-2', name: 'Solana Auditor', type: 'vulnerability_scanner', status: 'idle', lastRun: '15m ago', successRate: 98.2, model: 'GPT-4o' },
  { id: 'a-3', name: 'DeFi Triage', type: 'protocol_analyst', status: 'idle', lastRun: '1h ago', successRate: 96.7, model: 'Claude 3.5 Sonnet' }
];
