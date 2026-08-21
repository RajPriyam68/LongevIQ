import type { Request, Response } from 'express';
import type { ListAdminUsersQuery, ListAuditLogsQuery } from '@longeviq/shared';
import { sendSuccess } from '../../utils/api-response.js';
import type { AdminService } from './admin.service.js';

export class AdminController {
  constructor(private readonly service: AdminService) {}

  async summary(req: Request, res: Response): Promise<void> {
    const result = await this.service.summary();
    sendSuccess(res, result);
  }

  async listUsers(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as ListAdminUsersQuery;
    const result = await this.service.listUsers({
      search: query.search,
      role: query.role,
      active: query.active === 'true' ? true : query.active === 'false' ? false : undefined,
      page: query.page,
      limit: query.limit,
    });
    sendSuccess(res, result);
  }

  async listAuditLogs(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as ListAuditLogsQuery;
    const result = await this.service.listAuditLogs({
      action: query.action,
      entity: query.entity,
      userId: query.userId,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      page: query.page,
      limit: query.limit,
    });
    sendSuccess(res, result);
  }
}
