import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { createResponse, ResponseDto } from '../dto/response.dto';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ResponseDto<unknown>> {
    const req = context
      .switchToHttp()
      .getRequest<Request & { requestId?: string }>();

    if (!req.requestId) {
      req.requestId = uuidv4();
    }

    return next
      .handle()
      .pipe(map((data) => createResponse(data, req.requestId as string)));
  }
}
