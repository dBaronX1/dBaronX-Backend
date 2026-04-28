import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<any>();
    const response = ctx.getResponse();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = isHttpException ? exception.getResponse() : null;

    response.status(status).json({
      success: false,
      statusCode: status,
      path: request.url,
      method: request.method,
      requestId: request.requestId || null,
      timestamp: new Date().toISOString(),
      error:
        typeof exceptionResponse === 'object' && exceptionResponse
          ? exceptionResponse
          : {
              message: isHttpException
                ? exceptionResponse
                : 'Internal server error',
            },
    });
  }
}