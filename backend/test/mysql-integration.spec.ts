import 'reflect-metadata';
import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, In } from 'typeorm';
import * as bcryptjs from 'bcryptjs';
import { UsersService } from '../src/system/users.service';
import { SysUser } from '../src/database/entities/sys-user.entity';
import { SysRole } from '../src/database/entities/sys-role.entity';
import { SysUserRole } from '../src/database/entities/sys-user-role.entity';
import {
  assertMysqlTestDatabaseOwnership,
  buildMysqlTestDataSourceOptions,
} from './helpers/mysql-test-env';
import { ensureDedicatedTestDatabaseReady } from './helpers/ensure-test-db-ready';

const RUN_MYSQL_INTEGRATION = process.env.RUN_MYSQL_INTEGRATION === 'true';
const describeMysql = RUN_MYSQL_INTEGRATION ? describe : describe.skip;

if (!RUN_MYSQL_INTEGRATION) {
  // eslint-disable-next-line no-console
  console.warn(
    'MySQL integration tests skipped. Enable RUN_MYSQL_INTEGRATION with the dedicated MYSQL_TEST_* settings.',
  );
}

describeMysql('MySQL integration — concurrent SUPER_ADMIN protection', () => {
  let dataSource: DataSource;
  let usersService: UsersService;
  let saRoleId: string;
  let testUserA: string;
  let testUserB: string;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    dataSource = new DataSource(buildMysqlTestDataSourceOptions({ migrationsRun: true }));
    await dataSource.initialize();
    await assertMysqlTestDatabaseOwnership(dataSource);
    await ensureDedicatedTestDatabaseReady(dataSource);

    const saRole = await dataSource.manager.findOne(SysRole, {
      where: { roleCode: 'SUPER_ADMIN', status: 'active' },
    });
    if (!saRole) {
      throw new Error(
        'MySQL integration: SUPER_ADMIN role not found. Ensure SeedRbacData migration has been applied.',
      );
    }
    saRoleId = saRole.id;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(SysUser), useValue: dataSource.getRepository(SysUser) },
        { provide: getRepositoryToken(SysRole), useValue: dataSource.getRepository(SysRole) },
        { provide: getRepositoryToken(SysUserRole), useValue: dataSource.getRepository(SysUserRole) },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();
    usersService = module.get<UsersService>(UsersService);

    const hash = await bcryptjs.hash('TestPass123!', 10);
    const suffix = Date.now();
    const userA = dataSource.manager.create(SysUser, {
      username: `integ_sa_a_${suffix}`,
      passwordHash: hash,
      status: 'active',
    });
    const userB = dataSource.manager.create(SysUser, {
      username: `integ_sa_b_${suffix}`,
      passwordHash: hash,
      status: 'active',
    });
    await dataSource.manager.save(SysUser, [userA, userB]);
    testUserA = userA.id;
    testUserB = userB.id;
    createdUserIds.push(testUserA, testUserB);

    await dataSource.manager.save(SysUserRole, [
      dataSource.manager.create(SysUserRole, { userId: testUserA, roleId: saRoleId }),
      dataSource.manager.create(SysUserRole, { userId: testUserB, roleId: saRoleId }),
    ]);
  });

  afterAll(async () => {
    if (!dataSource?.isInitialized) return;
    if (createdUserIds.length > 0) {
      await dataSource.manager.delete(SysUserRole, { userId: In(createdUserIds) });
      await dataSource.manager.softDelete(SysUser, createdUserIds);
    }
    await dataSource.destroy();
  });

  it('两个并发禁用操作不会同时移除最后的有效 SUPER_ADMIN', async () => {
    const results = await Promise.allSettled([
      usersService.disable(testUserA, testUserB),
      usersService.disable(testUserB, testUserA),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason.message).toContain(
      '最后一个有效的超级管理员',
    );

    const activeSaUsers = await dataSource.manager
      .createQueryBuilder(SysUser, 'u')
      .innerJoin(SysUserRole, 'ur', 'ur.user_id = u.id')
      .innerJoin(SysRole, 'r', 'r.id = ur.role_id')
      .where('r.role_code = :code', { code: 'SUPER_ADMIN' })
      .andWhere('u.status = :status', { status: 'active' })
      .andWhere('u.deleted_at IS NULL')
      .getCount();
    expect(activeSaUsers).toBeGreaterThanOrEqual(1);
  });
});
