/**
 * Short-lived in-memory cache to avoid unnecessary duplicated analyses
 * (RF-12 / RNF-14). In V2 this responsibility moves to the database.
 */

export interface AnalysisCacheOptions {
  ttlMs?: number;
  now?: () => number;
}

interface Entry {
  value: unknown;
  expiresAt: number;
}

export class AnalysisCache<T> {
  private readonly data = new Map<string, Entry>();
  private readonly ttlMs: number;
  private readonly now: () => number;

  constructor(options: AnalysisCacheOptions = {}) {
    this.ttlMs = options.ttlMs ?? 5 * 60 * 1000;
    this.now = options.now ?? Date.now;
  }

  private key(url: string, strategy: string): string {
    return `${url}::${strategy}`;
  }

  get(url: string, strategy: string): { cached: true; value: T } | { cached: false; value: undefined } {
    const entry = this.data.get(this.key(url, strategy));
    if (!entry) {
      return { cached: false, value: undefined };
    }
    if (entry.expiresAt <= this.now()) {
      this.data.delete(this.key(url, strategy));
      return { cached: false, value: undefined };
    }
    return { cached: true, value: entry.value as T };
  }

  set(url: string, strategy: string, value: T): void {
    this.data.set(this.key(url, strategy), {
      value,
      expiresAt: this.now() + this.ttlMs
    });
  }
}