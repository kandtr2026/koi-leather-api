import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

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

    // Deploy timestamp: build-meta.json (written at build time) > git commit date > server boot time.
    // On Vercel serverless there is no git binary, so build-meta.json is the reliable source.
    let deployedAt = this.readBuildMeta();
    if (!deployedAt) {
      try {
        deployedAt = execSync('git log -1 --format=%cI', { encoding: 'utf-8' }).trim();
      } catch {}
    }
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

  private readBuildMeta(): string | undefined {
    const candidates = [
      path.join(process.cwd(), 'public', 'build-meta.json'),
      path.join(process.cwd(), 'dist', 'build-meta.json'),
      path.join(process.cwd(), 'build-meta.json'),
    ];
    for (const file of candidates) {
      try {
        const meta = JSON.parse(fs.readFileSync(file, 'utf-8'));
        if (meta?.buildTime) return meta.buildTime;
      } catch {}
    }
    return undefined;
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
