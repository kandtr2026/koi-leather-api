import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { execSync } from 'child_process';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private deployInfo: Record<string, any>;

  constructor() {
    this.deployInfo = this.collectDeployInfo();
  }

  private collectDeployInfo() {
    let commitSha = process.env.VERCEL_GIT_COMMIT_SHA;
    let commitRef = process.env.VERCEL_GIT_COMMIT_REF;
    let commitMsg = process.env.VERCEL_GIT_COMMIT_MESSAGE;
    let deployId = process.env.VERCEL_DEPLOYMENT_ID;
    let vercelEnv = process.env.VERCEL_ENV;
    let vercelUrl = process.env.VERCEL_URL;

    // Fallback to local git when not on Vercel
    if (!commitSha) {
      try {
        commitSha = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
      } catch {}
    }
    if (!commitRef) {
      try {
        commitRef = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
      } catch {}
    }
    if (!commitMsg) {
      try {
        commitMsg = execSync('git log -1 --pretty=%s', { encoding: 'utf-8' }).trim();
      } catch {}
    }

    // Deploy timestamp: git commit date > server boot time
    let deployedAt;
    try {
      deployedAt = execSync('git log -1 --format=%cI', { encoding: 'utf-8' }).trim();
    } catch {}
    if (!deployedAt) {
      deployedAt = new Date().toISOString();
    }

    return {
      commit: commitSha || 'unknown',
      branch: commitRef || 'unknown',
      message: commitMsg || '',
      deployedAt,
      vercel: vercelEnv ? { environment: vercelEnv, deployId, url: vercelUrl } : undefined,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Liveness check + deploy info' })
  check() {
    return {
      ok: true,
      service: 'koi-leather-api',
      ts: new Date().toISOString(),
      deploy: this.deployInfo,
    };
  }
}
