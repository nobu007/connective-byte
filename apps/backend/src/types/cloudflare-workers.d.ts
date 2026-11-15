declare module 'cloudflare:workers' {
  export class WorkerEntrypoint<Env = unknown> {
    protected env: Env;
    protected ctx: { waitUntil(promise: Promise<unknown>): void };
  }
}
