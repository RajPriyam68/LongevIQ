import type { Request, Response } from 'express';
import type { ListNotificationsQuery } from '@longeviq/shared';
import { sendSuccess } from '../../utils/api-response.js';
import type { NotificationService } from './notification.service.js';

export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  async list(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as ListNotificationsQuery;
    const result = await this.service.list(req.user!.id, {
      read: query.read,
      type: query.type,
      page: query.page,
      limit: query.limit,
    });
    sendSuccess(res, result);
  }

  async unreadCount(req: Request, res: Response): Promise<void> {
    const result = await this.service.unreadCount(req.user!.id);
    sendSuccess(res, result);
  }

  async markRead(req: Request, res: Response): Promise<void> {
    const result = await this.service.markRead(req.user!.id, String(req.params.id));
    sendSuccess(res, result);
  }

  async markAllRead(req: Request, res: Response): Promise<void> {
    const result = await this.service.markAllRead(req.user!.id);
    sendSuccess(res, result);
  }

  async remove(req: Request, res: Response): Promise<void> {
    const result = await this.service.remove(req.user!.id, String(req.params.id));
    sendSuccess(res, result);
  }
}
