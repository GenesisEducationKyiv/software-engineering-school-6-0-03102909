import { describe, it, expect } from 'vitest';
import { filesOfProject, slicesOfProject } from 'tsarch';
import * as path from 'path';

const apiTsConfig = path.join(__dirname, '../packages/api/tsconfig.json');
const notificationTsConfig = path.join(__dirname, '../packages/notification/tsconfig.json');
const monorepoTsConfig = path.join(__dirname, '../tsconfig.arch.json');

const shouldNotDepend = async (config: string, from: string, to: string) => {
  const violations = await filesOfProject(config)
    .inFolder(from)
    .shouldNot()
    .dependOnFiles()
    .inFolder(to)
    .check();
  return violations;
};

const shouldNotCrossDepend = async (from: string, to: string) => {
  const violations = await slicesOfProject(monorepoTsConfig)
    .definedBy('packages/(**)/')
    .shouldNot()
    .containDependency(from, to)
    .check();
  return violations;
};

describe('architecture boundaries', () => {
  const SERVICES = ['api', 'notification'] as const;
  const SHARED = 'shared';

  describe('api layer independence', () => {
    const forbidden: [string, string][] = [
      ['services', 'repositories'],
      ['services', 'db'],
      ['services', 'api'],
      ['repositories', 'api'],
      ['repositories', 'services'],
      ['api', 'repositories'],
      ['api', 'db'],
    ];

    it.each(forbidden)('%s should not depend on %s', async (from, to) => {
      const violations = await shouldNotDepend(apiTsConfig, from, to);
      expect(violations).toEqual([]);
    });
  });

  describe('notification layer independence', () => {
    const forbidden: [string, string][] = [
      ['services', 'grpc'],
      ['services', 'messaging'],
      ['services', 'handlers'],
      ['services', 'api'],
    ];

    it.each(forbidden)('%s should not depend on %s', async (from, to) => {
      const violations = await shouldNotDepend(notificationTsConfig, from, to);
      expect(violations).toEqual([]);
    });
  });

  describe('cross-package isolation', () => {
    it.each(SERVICES)('%s should not depend on the other service', async (service) => {
      const other = SERVICES.find((s) => s !== service)!;
      const violations = await shouldNotCrossDepend(service, other);
      expect(violations).toEqual([]);
    });

    it.each(SERVICES)('shared package should not depend on %s', async (target) => {
      const violations = await shouldNotCrossDepend(SHARED, target);
      expect(violations).toEqual([]);
    });
  });
});
