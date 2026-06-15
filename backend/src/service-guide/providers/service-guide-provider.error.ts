export class ServiceGuideUpstreamError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ServiceGuideUpstreamError';
  }
}

export class ServiceGuideUpstreamTimeoutError extends ServiceGuideUpstreamError {
  constructor(timeoutMs: number) {
    super(`上游办事指南接口调用超时（${timeoutMs}ms）`);
    this.name = 'ServiceGuideUpstreamTimeoutError';
  }
}

export class ServiceGuideProviderNotConfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ServiceGuideProviderNotConfiguredError';
  }
}
