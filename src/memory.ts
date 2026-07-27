import * as fs from "fs";
import * as path from "path";

export interface MemoryEntry {
  key: string;
  value: unknown;
  timestamp: string;
  agent?: string;
  tags?: string[];
}

export interface MemoryConfig {
  dataDir: string;
  maxPerAgentEntries?: number;
  maxSharedEntries?: number;
  maxGlobalEntries?: number;
}

export class PipelineMemory {
  private config: Required<MemoryConfig>;
  private agentMemory: Map<string, Map<string, MemoryEntry>> = new Map();
  private sharedMemory: Map<string, MemoryEntry> = new Map();
  private globalMemory: Map<string, MemoryEntry> = new Map();

  constructor(config: MemoryConfig) {
    this.config = {
      maxPerAgentEntries: 100,
      maxSharedEntries: 500,
      maxGlobalEntries: 1000,
      ...config,
    };
    this.loadFromDisk();
  }

  private getAgentFile(agent: string): string {
    return path.join(this.config.dataDir, "memory", `${agent}.json`);
  }

  private getSharedFile(): string {
    return path.join(this.config.dataDir, "memory", "shared.json");
  }

  private getGlobalFile(): string {
    return path.join(this.config.dataDir, "memory", "global.json");
  }

  private loadFromDisk(): void {
    try {
      const memDir = path.join(this.config.dataDir, "memory");
      if (!fs.existsSync(memDir)) return;

      const sharedFile = this.getSharedFile();
      if (fs.existsSync(sharedFile)) {
        const data = JSON.parse(fs.readFileSync(sharedFile, "utf-8"));
        for (const [k, v] of Object.entries(data)) {
          this.sharedMemory.set(k, v as MemoryEntry);
        }
      }

      const globalFile = this.getGlobalFile();
      if (fs.existsSync(globalFile)) {
        const data = JSON.parse(fs.readFileSync(globalFile, "utf-8"));
        for (const [k, v] of Object.entries(data)) {
          this.globalMemory.set(k, v as MemoryEntry);
        }
      }
    } catch {
      // Start fresh if corrupt
    }
  }

  private saveAgent(agent: string): void {
    const mem = this.agentMemory.get(agent);
    if (!mem) return;
    const file = this.getAgentFile(agent);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(Object.fromEntries(mem), null, 2));
  }

  private saveShared(): void {
    const file = this.getSharedFile();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(Object.fromEntries(this.sharedMemory), null, 2));
  }

  private saveGlobal(): void {
    const file = this.getGlobalFile();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(Object.fromEntries(this.globalMemory), null, 2));
  }

  private evict(map: Map<string, MemoryEntry>, maxSize: number): void {
    if (map.size <= maxSize) return;
    const sorted = Array.from(map.entries()).sort(
      (a, b) => new Date(a[1].timestamp).getTime() - new Date(b[1].timestamp).getTime()
    );
    const toRemove = sorted.slice(0, map.size - maxSize);
    for (const [key] of toRemove) {
      map.delete(key);
    }
  }

  // Per-agent memory (private to each agent)
  setAgent(agent: string, key: string, value: unknown, tags?: string[]): void {
    if (!this.agentMemory.has(agent)) {
      this.agentMemory.set(agent, new Map());
    }
    const mem = this.agentMemory.get(agent)!;
    mem.set(key, { key, value, timestamp: new Date().toISOString(), agent, tags });
    this.evict(mem, this.config.maxPerAgentEntries);
    this.saveAgent(agent);
  }

  getAgent(agent: string, key: string): MemoryEntry | undefined {
    return this.agentMemory.get(agent)?.get(key);
  }

  searchAgent(agent: string, query: string): MemoryEntry[] {
    const mem = this.agentMemory.get(agent);
    if (!mem) return [];
    const q = query.toLowerCase();
    return Array.from(mem.values()).filter(
      (e) =>
        e.key.toLowerCase().includes(q) ||
        JSON.stringify(e.value).toLowerCase().includes(q) ||
        e.tags?.some((t) => t.toLowerCase().includes(q))
    );
  }

  // Shared memory (visible to all agents in pipeline)
  setShared(key: string, value: unknown, agent?: string, tags?: string[]): void {
    this.sharedMemory.set(key, { key, value, timestamp: new Date().toISOString(), agent, tags });
    this.evict(this.sharedMemory, this.config.maxSharedEntries);
    this.saveShared();
  }

  getShared(key: string): MemoryEntry | undefined {
    return this.sharedMemory.get(key);
  }

  searchShared(query: string): MemoryEntry[] {
    const q = query.toLowerCase();
    return Array.from(this.sharedMemory.values()).filter(
      (e) =>
        e.key.toLowerCase().includes(q) ||
        JSON.stringify(e.value).toLowerCase().includes(q) ||
        e.tags?.some((t) => t.toLowerCase().includes(q))
    );
  }

  // Global memory (persists across pipeline runs)
  setGlobal(key: string, value: unknown, tags?: string[]): void {
    this.globalMemory.set(key, { key, value, timestamp: new Date().toISOString(), tags });
    this.evict(this.globalMemory, this.config.maxGlobalEntries);
    this.saveGlobal();
  }

  getGlobal(key: string): MemoryEntry | undefined {
    return this.globalMemory.get(key);
  }

  searchGlobal(query: string): MemoryEntry[] {
    const q = query.toLowerCase();
    return Array.from(this.globalMemory.values()).filter(
      (e) =>
        e.key.toLowerCase().includes(q) ||
        JSON.stringify(e.value).toLowerCase().includes(q) ||
        e.tags?.some((t) => t.toLowerCase().includes(q))
    );
  }

  // Get context summary for an agent (inject into prompts)
  getContextForAgent(agent: string, maxTokens: number = 2000): string {
    const parts: string[] = [];

    // Agent's own memory
    const agentMem = this.agentMemory.get(agent);
    if (agentMem && agentMem.size > 0) {
      parts.push(`[Your Past Decisions]\n${Array.from(agentMem.values())
        .slice(-10)
        .map((e) => `- ${e.key}: ${JSON.stringify(e.value)}`)
        .join("\n")}`);
    }

    // Shared context
    if (this.sharedMemory.size > 0) {
      parts.push(`[Shared Context]\n${Array.from(this.sharedMemory.values())
        .slice(-20)
        .map((e) => `- ${e.key}: ${JSON.stringify(e.value)}`)
        .join("\n")}`);
    }

    // Global context (recent)
    if (this.globalMemory.size > 0) {
      parts.push(`[Global State]\n${Array.from(this.globalMemory.values())
        .slice(-10)
        .map((e) => `- ${e.key}: ${JSON.stringify(e.value)}`)
        .join("\n")}`);
    }

    const full = parts.join("\n\n");
    // Rough token limit (4 chars per token)
    const maxChars = maxTokens * 4;
    return full.length > maxChars ? full.slice(-maxChars) : full;
  }

  clearAgent(agent: string): void {
    this.agentMemory.delete(agent);
    const file = this.getAgentFile(agent);
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }

  clearShared(): void {
    this.sharedMemory.clear();
    const file = this.getSharedFile();
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }

  clearAll(): void {
    this.agentMemory.clear();
    this.sharedMemory.clear();
    this.globalMemory.clear();
    const memDir = path.join(this.config.dataDir, "memory");
    if (fs.existsSync(memDir)) {
      fs.readdirSync(memDir).forEach((f) => fs.unlinkSync(path.join(memDir, f)));
    }
  }
}