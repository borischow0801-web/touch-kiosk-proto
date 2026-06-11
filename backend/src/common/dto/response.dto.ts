export interface ResponseDto<T = unknown> {
  code: number;
  message: string;
  data: T | null;
  timestamp: number;
  requestId: string;
}

export function createResponse<T>(
  data: T,
  requestId: string,
  code = 0,
  message = '成功',
): ResponseDto<T> {
  return { code, message, data, timestamp: Date.now(), requestId };
}

export function createErrorResponse(
  code: number,
  message: string,
  requestId: string,
): ResponseDto<null> {
  return { code, message, data: null, timestamp: Date.now(), requestId };
}
