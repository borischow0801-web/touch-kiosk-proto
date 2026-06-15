import 'reflect-metadata';
import { ServiceGuideProviderFactory } from '../src/service-guide/providers/service-guide-provider.factory';
import { SERVICE_GUIDE_PROVIDERS } from '../src/service-guide/constants/service-guide.constants';
import { ServiceGuideProviderNotConfiguredError } from '../src/service-guide/providers/service-guide-provider.error';

function withEnv(overrides: Record<string, string | undefined>, fn: () => void): void {
  const saved = { ...process.env };
  try {
    ['NODE_ENV', 'SERVICE_GUIDE_PROVIDER', 'SERVICE_GUIDE_UPSTREAM_BASE_URL', 'SERVICE_GUIDE_UPSTREAM_TIMEOUT_MS'].forEach(
      (k) => delete process.env[k],
    );
    Object.entries(overrides).forEach(([k, v]) => {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    });
    fn();
  } finally {
    ['NODE_ENV', 'SERVICE_GUIDE_PROVIDER', 'SERVICE_GUIDE_UPSTREAM_BASE_URL', 'SERVICE_GUIDE_UPSTREAM_TIMEOUT_MS'].forEach(
      (k) => delete process.env[k],
    );
    Object.assign(process.env, saved);
  }
}

describe('ServiceGuideProviderFactory', () => {
  it('defaults to development mock provider in development env', () => {
    withEnv({ NODE_ENV: 'development' }, () => {
      const factory = new ServiceGuideProviderFactory();
      factory.onModuleInit();
      expect(factory.getProvider().providerId).toBe(SERVICE_GUIDE_PROVIDERS.DEVELOPMENT);
      expect(factory.isDevelopmentMock()).toBe(true);
    });
  });

  it('defaults to development mock provider in test env', () => {
    withEnv({ NODE_ENV: 'test' }, () => {
      const factory = new ServiceGuideProviderFactory();
      factory.onModuleInit();
      expect(factory.getProvider().providerId).toBe(SERVICE_GUIDE_PROVIDERS.DEVELOPMENT);
    });
  });

  it('rejects unknown SERVICE_GUIDE_PROVIDER on init', () => {
    withEnv({ NODE_ENV: 'development', SERVICE_GUIDE_PROVIDER: 'custom' }, () => {
      const factory = new ServiceGuideProviderFactory();
      expect(() => factory.onModuleInit()).toThrow(ServiceGuideProviderNotConfiguredError);
    });
  });

  it('production without SERVICE_GUIDE_PROVIDER fails on init', () => {
    withEnv({ NODE_ENV: 'production' }, () => {
      const factory = new ServiceGuideProviderFactory();
      expect(() => factory.onModuleInit()).toThrow(ServiceGuideProviderNotConfiguredError);
      expect(() => factory.onModuleInit()).toThrow(/required in production/i);
    });
  });

  it('production with SERVICE_GUIDE_PROVIDER=development fails on init', () => {
    withEnv({ NODE_ENV: 'production', SERVICE_GUIDE_PROVIDER: 'development' }, () => {
      const factory = new ServiceGuideProviderFactory();
      expect(() => factory.onModuleInit()).toThrow(ServiceGuideProviderNotConfiguredError);
      expect(() => factory.onModuleInit()).toThrow(/not allowed in production/i);
    });
  });

  it('real provider without base URL fails on init', () => {
    withEnv({ NODE_ENV: 'development', SERVICE_GUIDE_PROVIDER: 'real' }, () => {
      const factory = new ServiceGuideProviderFactory();
      expect(() => factory.onModuleInit()).toThrow(ServiceGuideProviderNotConfiguredError);
    });
  });

  it('production real provider without base URL fails on init', () => {
    withEnv({ NODE_ENV: 'production', SERVICE_GUIDE_PROVIDER: 'real' }, () => {
      const factory = new ServiceGuideProviderFactory();
      expect(() => factory.onModuleInit()).toThrow(ServiceGuideProviderNotConfiguredError);
    });
  });

  it('real provider with base URL initializes but calls reject at runtime', async () => {
    withEnv(
      {
        NODE_ENV: 'development',
        SERVICE_GUIDE_PROVIDER: 'real',
        SERVICE_GUIDE_UPSTREAM_BASE_URL: 'https://example.invalid',
      },
      () => {
        const factory = new ServiceGuideProviderFactory();
        factory.onModuleInit();
        expect(factory.getProvider().providerId).toBe(SERVICE_GUIDE_PROVIDERS.REAL);
        expect(factory.isDevelopmentMock()).toBe(false);
      },
    );
    const factory = new ServiceGuideProviderFactory();
    withEnv(
      {
        NODE_ENV: 'development',
        SERVICE_GUIDE_PROVIDER: 'real',
        SERVICE_GUIDE_UPSTREAM_BASE_URL: 'https://example.invalid',
      },
      () => factory.onModuleInit(),
    );
    await expect(factory.getProvider().fetchItemDetail('x')).rejects.toBeInstanceOf(
      ServiceGuideProviderNotConfiguredError,
    );
  });
});
