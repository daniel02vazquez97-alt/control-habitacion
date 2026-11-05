import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let codigo = 'INTERNAL_SERVER_ERROR';
    let mensaje = 'Ocurrió un error interno en el servidor.';
    let detalles: unknown = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        mensaje = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, any>;
        codigo = resObj.codigo || `HTTP_${status}`;
        mensaje = resObj.message || resObj.mensaje || exception.message;
        detalles = resObj.detalles || (Array.isArray(resObj.message) ? resObj.message : null);
      }
    } else if (exception instanceof Error) {
      mensaje = exception.message;
      detalles = exception.stack;
    }

    this.logger.error(
      `[${request.method}] ${request.url} - Error ${status} (${codigo}): ${mensaje}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json({
      codigo,
      mensaje,
      detalles,
      timestamp: new Date().toISOString(),
    });
  }
}
