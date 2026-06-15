import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DevelopmentMockServiceGuideProvider } from './development-mock.service-guide.provider';
import { RealServiceGuideProvider } from './real-service-guide.provider';
import type { ServiceGuideProvider } from './service-guide-provider.interface';
import {
  DEFAULT_UPSTREAM_TIMEOUT_MS,
  SERVICE_GUIDE_PROVIDERS,
  type ServiceGuideProviderType,
} from '../constants/service-guide.constants';
import { ServiceGuideProviderNotConfiguredError } from './service-guide-provider.error';

export interface ServiceGuideRuntimeConfig {
  providerType: ServiceGuideProviderType;
  upstreamTimeoutMs: number;
  upstreamBaseUrl?: string;
}

function isNonProductionNodeEnv(): boolean {
  const nodeEnv = (process.env.NODE_ENV ?? 'development').toLowerCase();
  return nodeEnv === 'development' || nodeEnv === 'test';
}

@Injectable()
export class ServiceGuideProviderFactory implements OnModuleInit {
  private readonly logger = new Logger(ServiceGuideProviderFactory.name);
  private provider!: ServiceGuideProvider;
  private config!: ServiceGuideRuntimeConfig;

  onModuleInit(): void {
    this.config = this.loadConfig();
    this.provider = this.createProvider(this.config);
    this.logger.log(
      `ServiceGuide provider initialized: ${this.provider.providerId} (developmentMock=${this.provider.isDevelopmentMock})`,
    );
  }

  getProvider(): ServiceGuideProvider {
    return this.provider;
  }

  getConfig(): ServiceGuideRuntimeConfig {
    return this.config;
  }

  isDevelopmentMock(): boolean {
    return this.provider.isDevelopmentMock;
  }

  private loadConfig(): ServiceGuideRuntimeConfig {
    const nonProduction = isNonProductionNodeEnv();
    const rawEnv = process.env.SERVICE_GUIDE_PROVIDER?.toLowerCase();

    if (!rawEnv) {
      if (!nonProduction) {
        throw new ServiceGuideProviderNotConfiguredError(
          'SERVICE_GUIDE_PROVIDER is required in production. ' +
            'Development mock cannot be used as the default provider.',
        );
      }
    }

    const raw = rawEnv ?? SERVICE_GUIDE_PROVIDERS.DEVELOPMENT;

    if (raw !== SERVICE_GUIDE_PROVIDERS.DEVELOPMENT && raw !== SERVICE_GUIDE_PROVIDERS.REAL) {
      throw new ServiceGuideProviderNotConfiguredError(
        `Unknown SERVICE_GUIDE_PROVIDER="${process.env.SERVICE_GUIDE_PROVIDER}". Supported: development, real.`,
      );
    }

    if (!nonProduction && raw === SERVICE_GUIDE_PROVIDERS.DEVELOPMENT) {
      throw new ServiceGuideProviderNotConfiguredError(
        'SERVICE_GUIDE_PROVIDER=development is not allowed in production.',
      );
    }

    const timeoutMs = Number(process.env.SERVICE_GUIDE_UPSTREAM_TIMEOUT_MS ?? DEFAULT_UPSTREAM_TIMEOUT_MS);
    return {
      providerType: raw,
      upstreamTimeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_UPSTREAM_TIMEOUT_MS,
      upstreamBaseUrl: process.env.SERVICE_GUIDE_UPSTREAM_BASE_URL,
    };
  }

  private createProvider(config: ServiceGuideRuntimeConfig): ServiceGuideProvider {
    if (config.providerType === SERVICE_GUIDE_PROVIDERS.DEVELOPMENT) {
      return new DevelopmentMockServiceGuideProvider();
    }
    return new RealServiceGuideProvider(config.upstreamBaseUrl);
  }
}
