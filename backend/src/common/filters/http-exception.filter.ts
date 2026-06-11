import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ERROR_MESSAGES } from '../constants/error-codes';
import { createErrorResponse } from '../dto/response.dto';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request & { requestId?: string }>();
    const res = ctx.getResponse<Response>();
    const requestId = req.requestId ?? uuidv4();

    let httpStatus: number;
    let code: number;
    let message: string;

    if (exception instanceof HttpException) {
      httpStatus = exception.getStatus();
      code = httpStatus;
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null &&
        'message' in exceptionResponse
      ) {
        const raw = (exceptionResponse as Record<string, unknown>).message;
        message = Array.isArray(raw)
          ? (raw as string[]).join('; ')
          : String(raw);
      } else {
        message = ERROR_MESSAGES[code] ?? '请求错误';
      }
    } else {
      httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
      code = 500;
      message = ERROR_MESSAGES[500];
      this.logger.error(
        'Unhandled exception',
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    res.status(httpStatus).json(createErrorResponse(code, message, requestId));
  }
}
