import { describe, it, expect } from 'vitest';
import { filesOfProject } from 'tsarch';
import * as path from 'path';

const apiTsConfig = path.join(__dirname, '../packages/api/tsconfig.json');
const notificationTsConfig = path.join(__dirname, '../packages/notification/tsconfig.json');
const sharedTsConfig = path.join(__dirname, '../packages/shared/tsconfig.json');

describe('architecture boundaries', () => {
  describe('api layer independence', () => {
    it('services should not depend on repositories', async () => {
      const violations = await filesOfProject(apiTsConfig)
        .inFolder('services')
        .shouldNot()
        .dependOnFiles()
        .inFolder('repositories')
        .check();
      expect(violations).toEqual([]);
    });

    it('services should not depend on db', async () => {
      const violations = await filesOfProject(apiTsConfig)
        .inFolder('services')
        .shouldNot()
        .dependOnFiles()
        .inFolder('db')
        .check();
      expect(violations).toEqual([]);
    });

    it('services should not depend on presentation (api)', async () => {
      const violations = await filesOfProject(apiTsConfig)
        .inFolder('services')
        .shouldNot()
        .dependOnFiles()
        .inFolder('api')
        .check();
      expect(violations).toEqual([]);
    });

    it('infrastructure (repositories) should not depend on presentation', async () => {
      const violations = await filesOfProject(apiTsConfig)
        .inFolder('repositories')
        .shouldNot()
        .dependOnFiles()
        .inFolder('api')
        .check();
      expect(violations).toEqual([]);
    });
  });

  describe('notification layer independence', () => {
    it('services should not depend on grpc', async () => {
      const violations = await filesOfProject(notificationTsConfig)
        .inFolder('services')
        .shouldNot()
        .dependOnFiles()
        .inFolder('grpc')
        .check();
      expect(violations).toEqual([]);
    });

    it('services should not depend on messaging', async () => {
      const violations = await filesOfProject(notificationTsConfig)
        .inFolder('services')
        .shouldNot()
        .dependOnFiles()
        .inFolder('messaging')
        .check();
      expect(violations).toEqual([]);
    });

    it('services should not depend on handlers', async () => {
      const violations = await filesOfProject(notificationTsConfig)
        .inFolder('services')
        .shouldNot()
        .dependOnFiles()
        .inFolder('handlers')
        .check();
      expect(violations).toEqual([]);
    });
  });

  describe('cross-package isolation', () => {
    it('api package should not depend on notification package', async () => {
      const violations = await filesOfProject(apiTsConfig)
        .inFolder('packages/api')
        .shouldNot()
        .dependOnFiles()
        .inFolder('packages/notification')
        .check();
      expect(violations).toEqual([]);
    });

    it('notification package should not depend on api package', async () => {
      const violations = await filesOfProject(notificationTsConfig)
        .inFolder('packages/notification')
        .shouldNot()
        .dependOnFiles()
        .inFolder('packages/api')
        .check();
      expect(violations).toEqual([]);
    });

    it('shared package should not depend on api package', async () => {
      const violations = await filesOfProject(sharedTsConfig)
        .inFolder('packages/shared')
        .shouldNot()
        .dependOnFiles()
        .inFolder('packages/api')
        .check();
      expect(violations).toEqual([]);
    });

    it('shared package should not depend on notification package', async () => {
      const violations = await filesOfProject(sharedTsConfig)
        .inFolder('packages/shared')
        .shouldNot()
        .dependOnFiles()
        .inFolder('packages/notification')
        .check();
      expect(violations).toEqual([]);
    });
  });
});
