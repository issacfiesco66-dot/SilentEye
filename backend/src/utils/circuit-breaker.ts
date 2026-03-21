import { logger } from './logger.js';

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures = 0;
  private lastFailureTime = 0;

  constructor(
    private readonly name: string,
    private readonly threshold: number = 3,
    private readonly resetTimeMs: number = 60_000,
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.resetTimeMs) {
        this.state = 'HALF_OPEN';
        logger.info(`CircuitBreaker [${this.name}] HALF_OPEN — probando reconexión`);
      } else {
        throw new Error(`CircuitBreaker [${this.name}] OPEN — servicio no disponible, reintento en ${Math.ceil((this.resetTimeMs - (Date.now() - this.lastFailureTime)) / 1000)}s`);
      }
    }

    try {
      const result = await fn();
      if (this.state === 'HALF_OPEN') {
        logger.info(`CircuitBreaker [${this.name}] CLOSED — servicio recuperado`);
      }
      this.reset();
      return result;
    } catch (err) {
      this.recordFailure();
      throw err;
    }
  }

  /**
   * Non-throwing variant: returns false instead of throwing when circuit is open.
   * Useful for fire-and-forget services (SMS, email) that return boolean.
   */
  async tryExecute<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await this.execute(fn);
    } catch (err: any) {
      if (this.state === 'OPEN') {
        logger.warn(`CircuitBreaker [${this.name}] OPEN — retornando fallback`);
      }
      return fallback;
    }
  }

  private recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      logger.error(
        `CircuitBreaker [${this.name}] OPEN tras ${this.failures} fallos consecutivos — ` +
        `reintentos bloqueados por ${this.resetTimeMs / 1000}s`
      );
    }
  }

  private reset(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  getState(): CircuitState {
    return this.state;
  }
}
