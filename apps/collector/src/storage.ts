import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { AIAnalysisResult, BySentinelEvent } from "@bysentinel/core";
import type { GitSettings, SourceContext } from "./gitops.js";
import type { SandboxSettings, SimulationRun } from "./sandbox.js";
import type { AISettings } from "./settings.js";
import type { UserRecord } from "./users.js";

export interface IncidentRecord {
  id: string;
  fingerprint: string;
  project: string;
  environment: string;
  firstSeenAt: string;
  lastSeenAt: string;
  occurrences: number;
  latestEvent: BySentinelEvent;
  events: BySentinelEvent[];
  analysis?: StoredAnalysis;
  /** Source files fetched from the repository at the incident's commit SHA. */
  sourceContext?: SourceContext;
  /** Latest sandbox (ministack) reproduction run. */
  simulation?: SimulationRun;
}

export interface StoredAnalysis {
  status: "ok" | "fallback" | "error";
  provider?: string;
  model?: string;
  raw?: string;
  errors?: string[];
  usage?: { promptTokens?: number; completionTokens?: number };
  result: AIAnalysisResult;
  createdAt: string;
}

interface DatabaseShape {
  incidents: IncidentRecord[];
  users?: UserRecord[];
  settings?: {
    ai?: AISettings;
    git?: GitSettings;
    sandbox?: SandboxSettings;
  };
}

export class FileStore {
  private readonly filePath: string;

  constructor(dataDir: string) {
    this.filePath = join(dataDir, "bysentinel.json");
  }

  async init(defaultAISettings?: AISettings): Promise<void> {
    await mkdir(this.filePath.split("/").slice(0, -1).join("/"), { recursive: true });
    try {
      await readFile(this.filePath, "utf8");
    } catch {
      await this.write({ incidents: [], settings: defaultAISettings ? { ai: defaultAISettings } : undefined });
    }
  }

  async getAISettings(defaults: AISettings): Promise<AISettings> {
    const db = await this.read();
    if (db.settings?.ai) return db.settings.ai;
    db.settings = { ai: defaults };
    await this.write(db);
    return defaults;
  }

  async saveAISettings(settings: AISettings): Promise<AISettings> {
    const db = await this.read();
    db.settings = { ...(db.settings ?? {}), ai: settings };
    await this.write(db);
    return settings;
  }

  async listIncidents(): Promise<IncidentRecord[]> {
    const db = await this.read();
    return db.incidents.sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
  }

  async getIncident(id: string): Promise<IncidentRecord | undefined> {
    const db = await this.read();
    return db.incidents.find((incident) => incident.id === id);
  }

  async upsertEvent(event: BySentinelEvent, incidentFingerprint: string): Promise<IncidentRecord> {
    const db = await this.read();
    const now = event.timestamp;
    const existing = db.incidents.find(
      (incident) =>
        incident.project === event.project &&
        incident.environment === event.environment &&
        incident.fingerprint === incidentFingerprint,
    );

    if (existing) {
      existing.lastSeenAt = now;
      existing.occurrences += 1;
      existing.latestEvent = event;
      existing.events = [...existing.events, event].slice(-20);
      await this.write(db);
      return existing;
    }

    const incident: IncidentRecord = {
      id: event.id,
      fingerprint: incidentFingerprint,
      project: event.project,
      environment: event.environment,
      firstSeenAt: now,
      lastSeenAt: now,
      occurrences: 1,
      latestEvent: event,
      events: [event],
    };

    db.incidents.push(incident);
    await this.write(db);
    return incident;
  }

  async saveAnalysis(id: string, analysis: StoredAnalysis): Promise<IncidentRecord | undefined> {
    const db = await this.read();
    const incident = db.incidents.find((item) => item.id === id);
    if (!incident) return undefined;
    incident.analysis = analysis;
    await this.write(db);
    return incident;
  }

  async saveSourceContext(id: string, context: SourceContext): Promise<IncidentRecord | undefined> {
    const db = await this.read();
    const incident = db.incidents.find((item) => item.id === id);
    if (!incident) return undefined;
    incident.sourceContext = context;
    await this.write(db);
    return incident;
  }

  async saveSimulation(id: string, run: SimulationRun): Promise<IncidentRecord | undefined> {
    const db = await this.read();
    const incident = db.incidents.find((item) => item.id === id);
    if (!incident) return undefined;
    incident.simulation = run;
    await this.write(db);
    return incident;
  }

  async getGitSettings(defaults: GitSettings): Promise<GitSettings> {
    const db = await this.read();
    return db.settings?.git ?? defaults;
  }

  async saveGitSettings(settings: GitSettings): Promise<GitSettings> {
    const db = await this.read();
    db.settings = { ...(db.settings ?? {}), git: settings };
    await this.write(db);
    return settings;
  }

  async getSandboxSettings(defaults: SandboxSettings): Promise<SandboxSettings> {
    const db = await this.read();
    return db.settings?.sandbox ?? defaults;
  }

  async saveSandboxSettings(settings: SandboxSettings): Promise<SandboxSettings> {
    const db = await this.read();
    db.settings = { ...(db.settings ?? {}), sandbox: settings };
    await this.write(db);
    return settings;
  }

  async listUsers(): Promise<UserRecord[]> {
    const db = await this.read();
    return db.users ?? [];
  }

  async addUser(user: UserRecord): Promise<UserRecord> {
    const db = await this.read();
    db.users = [...(db.users ?? []), user];
    await this.write(db);
    return user;
  }

  async removeUser(id: string): Promise<boolean> {
    const db = await this.read();
    const before = db.users?.length ?? 0;
    db.users = (db.users ?? []).filter((user) => user.id !== id);
    if (db.users.length === before) return false;
    await this.write(db);
    return true;
  }

  private async read(): Promise<DatabaseShape> {
    const raw = await readFile(this.filePath, "utf8");
    return JSON.parse(raw) as DatabaseShape;
  }

  private async write(db: DatabaseShape): Promise<void> {
    await writeFile(this.filePath, JSON.stringify(db, null, 2));
  }
}
