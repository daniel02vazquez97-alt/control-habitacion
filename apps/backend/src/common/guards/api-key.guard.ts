import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKeyHeader = request.headers['x-api-key'];
    const expectedApiKey = this.configService.get<string>('RECEPCION_API_KEY') || 'demo-recepcion-key';

    if (!apiKeyHeader || apiKeyHeader !== expectedApiKey) {
      throw new UnauthorizedException({
        codigo: 'API_KEY_INVALIDA',
        mensaje: 'La cabecera X-API-Key es inválida o no fue proporcionada.',
      });
    }

    return true;
  }
}
