import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { QueryFailedError, Repository } from 'typeorm';
import { GuideApiCache } from '../../database/entities/guide-api-cache.entity';
import { buildCacheKey, serializeRequestParam } from './guide-cache-key.util';
import { isValidCachedResponse } from './guide-cache-response.validator';
import type { ServiceGuideApiName } from '../constants/service-guide.constants';
import { ServiceGuideUpstreamError, ServiceGuideUpstreamTimeoutError } from '../providers/service-guide-provider.error';

export interface GuideCacheExecuteOptions<T> {
  apiName: ServiceGuideApiName;
  params: Record<string, unknown>;
  requestId: string;
  timeoutMs: number;
  ttlMs: number;
  fetcher: () => Promise<T>;
}

function isUniqueConstraintViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) return false;
  const driverError = error.driverError as { code?: string; errno?: number } | undefined;
  if (!driverError) return false;
  return driverError.code === '23505' || driverError.errno === 1062;
}

@Injectable()
export class GuideCacheService {
  private readonly logger = new Logger(GuideCacheService.name);

  constructor(
    @InjectRepository(GuideApiCache)
    private readonly cacheRepo: Repository<GuideApiCache>,
  ) {}

  async executeWithCache<T>(options: GuideCacheExecuteOptions<T>): Promise<T> {
    const { apiName, params, requestId, timeoutMs, ttlMs, fetcher } = options;
    const cacheKey = buildCacheKey(apiName, params);
    const requestParam = serializeRequestParam(params);
    const started = Date.now();

    try {
      const data = await this.withTimeout(fetcher(), timeoutMs);
      await this.trySaveSuccess(cacheKey, apiName, requestParam, data, ttlMs, requestId);
      this.logger.log(
        `guide_cache api=${apiName} result=success fromCache=false durationMs=${Date.now() - started} requestId=${requestId}`,
      );
      return data;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof ServiceGuideUpstreamTimeoutError) {
        this.logger.warn(
          `guide_cache api=${apiName} result=timeout durationMs=${Date.now() - started} requestId=${requestId}`,
        );
      } else if (error instanceof ServiceGuideUpstreamError) {
        this.logger.warn(
          `guide_cache api=${apiName} result=upstream_error durationMs=${Date.now() - started} requestId=${requestId}`,
        );
      } else {
        this.logger.warn(
          `guide_cache api=${apiName} result=error durationMs=${Date.now() - started} requestId=${requestId}`,
        );
      }

      const cached = await this.readFallbackCache<T>(cacheKey, apiName, requestId);
      if (cached != null) {
        this.logger.log(
          `guide_cache api=${apiName} result=fallback fromCache=true requestId=${requestId}`,
        );
        return cached;
      }
      throw new ServiceUnavailableException('办事指南服务暂不可用');
    }
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<T>((_, reject) => {
          timer = setTimeout(() => reject(new ServiceGuideUpstreamTimeoutError(timeoutMs)), timeoutMs);
        }),
      ]);
    } catch (error) {
      if (error instanceof ServiceGuideUpstreamTimeoutError) {
        throw error;
      }
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new ServiceGuideUpstreamError('上游办事指南接口调用失败', error);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private async trySaveSuccess<T>(
    cacheKey: string,
    apiName: string,
    requestParam: string,
    data: T,
    ttlMs: number,
    requestId: string,
  ): Promise<void> {
    try {
      await this.saveSuccess(cacheKey, apiName, requestParam, data, ttlMs);
    } catch {
      this.logger.warn(
        `guide_cache api=${apiName} result=write_failed requestId=${requestId}`,
      );
    }
  }

  private async saveSuccess<T>(
    cacheKey: string,
    apiName: string,
    requestParam: string,
    data: T,
    ttlMs: number,
  ): Promise<void> {
    const now = new Date();
    const expireAt = new Date(now.getTime() + ttlMs);
    const responseBody = JSON.stringify(data);
    const existing = await this.cacheRepo.findOne({ where: { cacheKey } });
    if (existing) {
      existing.apiName = apiName;
      existing.requestParam = requestParam;
      existing.responseBody = responseBody;
      existing.successAt = now;
      existing.expireAt = expireAt;
      await this.cacheRepo.save(existing);
      return;
    }
    try {
      await this.cacheRepo.save(
        this.cacheRepo.create({
          cacheKey,
          apiName,
          requestParam,
          responseBody,
          successAt: now,
          expireAt,
        }),
      );
    } catch (error) {
      if (!isUniqueConstraintViolation(error)) {
        throw error;
      }
      const raced = await this.cacheRepo.findOne({ where: { cacheKey } });
      if (!raced) {
        throw error;
      }
      raced.apiName = apiName;
      raced.requestParam = requestParam;
      raced.responseBody = responseBody;
      raced.successAt = now;
      raced.expireAt = expireAt;
      await this.cacheRepo.save(raced);
    }
  }

  /** Reads last successful cache for upstream failure fallback (ignores expire_at). */
  async readFallbackCache<T>(
    cacheKey: string,
    apiName: ServiceGuideApiName,
    requestId: string,
  ): Promise<T | null> {
    let row: GuideApiCache | null;
    try {
      row = await this.cacheRepo.findOne({ where: { cacheKey } });
    } catch {
      this.logger.warn(
        `guide_cache api=${apiName} result=read_error requestId=${requestId}`,
      );
      return null;
    }
    if (!row) return null;
    let parsed: unknown;
    try {
      parsed = JSON.parse(row.responseBody);
    } catch {
      this.logger.warn(
        `guide_cache api=${apiName} result=corrupt_json requestId=${requestId}`,
      );
      return null;
    }
    if (!isValidCachedResponse(apiName, parsed)) {
      this.logger.warn(
        `guide_cache api=${apiName} result=corrupt_shape requestId=${requestId}`,
      );
      return null;
    }
    return parsed as T;
  }
}
