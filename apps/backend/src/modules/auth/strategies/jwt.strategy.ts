import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../common/prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  rol: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'super-secret-jwt-key-2026',
    });
  }

  async validate(payload: JwtPayload) {
    const empleado = await this.prisma.empleado.findUnique({
      where: { id: payload.sub },
    });

    if (!empleado || !empleado.activo) {
      throw new UnauthorizedException({
        codigo: 'USUARIO_INACTIVO',
        mensaje: 'El usuario no existe o se encuentra inactivo.',
      });
    }

    return empleado;
  }
}
