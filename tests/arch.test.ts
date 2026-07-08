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
  describe('api layer independence', () => {
    it('services should not depend on repositories', async () => {
      const violations = await shouldNotDepend(apiTsConfig, 'services', 'repositories');
      expect(violations).toEqual([]);
    });

    it('services should not depend on db', async () => {
      const violations = await shouldNotDepend(apiTsConfig, 'services', 'db');
      expect(violations).toEqual([]);
    });

    it('services should not depend on presentation (api)', async () => {
      const violations = await shouldNotDepend(apiTsConfig, 'services', 'api');
      expect(violations).toEqual([]);
    });

    it('infrastructure (repositories) should not depend on presentation', async () => {
      const violations = await shouldNotDepend(apiTsConfig, 'repositories', 'api');
      expect(violations).toEqual([]);
    });
  });

  describe('notification layer independence', () => {
    it('services should not depend on grpc', async () => {
      const violations = await shouldNotDepend(notificationTsConfig, 'services', 'grpc');
      expect(violations).toEqual([]);
    });

    it('services should not depend on messaging', async () => {
      const violations = await shouldNotDepend(notificationTsConfig, 'services', 'messaging');
      expect(violations).toEqual([]);
    });

    it('services should not depend on handlers', async () => {
      const violations = await shouldNotDepend(notificationTsConfig, 'services', 'handlers');
      expect(violations).toEqual([]);
    });
  });

  describe('cross-package isolation', () => {
    it('api package should not depend on notification package', async () => {
      const violations = await shouldNotCrossDepend('api', 'notification');
      expect(violations).toEqual([]);
    });

    it('notification package should not depend on api package', async () => {
      const violations = await shouldNotCrossDepend('notification', 'api');
      expect(violations).toEqual([]);
    });

    it('shared package should not depend on api package', async () => {
      const violations = await shouldNotCrossDepend('shared', 'api');
      expect(violations).toEqual([]);
    });

    it('shared package should not depend on notification package', async () => {
      const violations = await shouldNotCrossDepend('shared', 'notification');
      expect(violations).toEqual([]);
    });
  });
});
