import { Controller, Post, Get, Body, Req, HttpCode, HttpStatus, Header } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { GoogleLoginDto } from './dto/google-login.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Google OAuth login — exchange credential for JWT' })
  async googleLogin(@Body() dto: GoogleLoginDto) {
    return this.authService.loginWithGoogle(dto.credential);
  }

  @Get('me')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Get current user from Authorization header' })
  me(@Req() req: any) {
    const user = req.user;
    if (!user) return { authenticated: false };
    return { authenticated: true, user };
  }

  @Get('config')
  @Header('Cache-Control', 'public, max-age=3600')
  @ApiOperation({ summary: 'Public OAuth config for frontend' })
  getConfig() {
    return {
      googleClientId: process.env.GOOGLE_CLIENT_ID || '',
      adminEmails: this.authService.whitelist,
    };
  }
}
