import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto) {
    const empleado = await this.prisma.empleado.findUnique({
      where: { email: loginDto.email.toLowerCase().trim() },
    });

    if (!empleado || !empleado.activo) {
      throw new UnauthorizedException({
        codigo: 'CREDENCIALES_INVALIDAS',
        mensaje: 'Correo o contraseña incorrectos.',
      });
    }

    const passwordValida = await bcrypt.compare(loginDto.password, empleado.passwordHash);
    if (!passwordValida) {
      throw new UnauthorizedException({
        codigo: 'CREDENCIALES_INVALIDAS',
        mensaje: 'Correo o contraseña incorrectos.',
      });
    }

    const payload: JwtPayload = {
      sub: empleado.id,
      email: empleado.email,
      rol: empleado.rol,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET') || 'super-secret-jwt-key-2026',
      expiresIn: '8h',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'super-secret-refresh-key-2026',
      expiresIn: '7d',
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      empleado: {
        id: empleado.id,
        nombre: empleado.nombre,
        email: empleado.email,
        rol: empleado.rol,
        activo: empleado.activo,
      },
    };
  }

  async refreshToken(dto: RefreshTokenDto) {
    try {
      const payload = this.jwtService.verify<JwtPayload>(dto.refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'super-secret-refresh-key-2026',
      });

      const empleado = await this.prisma.empleado.findUnique({
        where: { id: payload.sub },
      });

      if (!empleado || !empleado.activo) {
        throw new UnauthorizedException({
          codigo: 'SESION_EXPIRADA',
          mensaje: 'El usuario ya no se encuentra activo.',
        });
      }

      const newPayload: JwtPayload = {
        sub: empleado.id,
        email: empleado.email,
        rol: empleado.rol,
      };

      const newAccessToken = this.jwtService.sign(newPayload, {
        secret: this.configService.get<string>('JWT_SECRET') || 'super-secret-jwt-key-2026',
        expiresIn: '8h',
      });

      return {
        access_token: newAccessToken,
      };
    } catch {
      throw new UnauthorizedException({
        codigo: 'TOKEN_INVALIDO',
        mensaje: 'El token de refresco no es válido o ha expirado.',
      });
    }
  }
}
