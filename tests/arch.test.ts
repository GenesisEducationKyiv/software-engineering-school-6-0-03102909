import { describe, it, expect } from 'vitest';
import { filesOfProject } from 'tsarch';
import * as path from 'path';

const apiTsConfig = path.join(__dirname, '../packages/api/tsconfig.json');
const notificationTsConfig = path.join(__dirname, '../packages/notification/tsconfig.json');
const sharedTsConfig = path.join(__dirname, '../packages/shared/tsconfig.json');

const shouldNotDepend = async (config: string, inFolder: string, onFolder: string) => {
  const violations = await filesOfProject(config)
    .inFolder(inFolder)
    .shouldNot()
    .dependOnFiles()
    .inFolder(onFolder)
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
      const violations = await shouldNotDepend(apiTsConfig, 'packages/api', 'packages/notification');
      expect(violations).toEqual([]);
    });

    it('notification package should not depend on api package', async () => {
      const violations = await shouldNotDepend(notificationTsConfig, 'packages/notification', 'packages/api');
      expect(violations).toEqual([]);
    });

    it('shared package should not depend on api package', async () => {
      const violations = await shouldNotDepend(sharedTsConfig, 'packages/shared', 'packages/api');
      expect(violations).toEqual([]);
    });

    it('shared package should not depend on notification package', async () => {
      const violations = await shouldNotDepend(sharedTsConfig, 'packages/shared', 'packages/notification');
      expect(violations).toEqual([]);
    });
  });
});
