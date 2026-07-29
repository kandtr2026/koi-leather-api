import { Module, Global } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { randomBytes } from "crypto";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AuthGuard } from "./auth.guard";

function resolveJwtSecret(): string {
  const fromEnv = process.env.JWT_SECRET;
  if (fromEnv) return fromEnv;

  if (process.env.VERCEL_ENV === "production") {
    // Fail-closed: never sign production tokens with a public hardcoded secret.
    // Use a random per-boot secret so any issued token is unforgeable; admins
    // must set JWT_SECRET for login to work at all.
    console.error(
      "[Auth] JWT_SECRET is not set in production — using an ephemeral random secret; logins will not persist.",
    );
    return randomBytes(32).toString("hex");
  }

  return "koi-leather-dev-secret-change-in-production";
}

@Global()
@Module({
  imports: [
    JwtModule.register({
      secret: resolveJwtSecret(),
      signOptions: { expiresIn: "24h" },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard],
  exports: [AuthService, AuthGuard, JwtModule],
})
export class AuthModule {}
