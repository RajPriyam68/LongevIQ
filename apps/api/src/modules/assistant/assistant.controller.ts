import type { Request, Response } from 'express';
import type { CreateChatMessageInput, ListChatSessionsQuery } from '@longeviq/shared';
import { sendSuccess } from '../../utils/api-response.js';
import type { AssistantService } from './assistant.service.js';

function requestContext(req: Request) {
  return {
    ipAddress: req.ip ?? null,
    userAgent: req.get('user-agent') ?? null,
  };
}

export class AssistantController {
  constructor(private readonly service: AssistantService) {}

  async chat(req: Request, res: Response): Promise<void> {
    const result = await this.service.chat(
      req.user!.id,
      req.body as CreateChatMessageInput,
      requestContext(req),
    );
    sendSuccess(res, result);
  }

  async listSessions(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as ListChatSessionsQuery;
    const result = await this.service.listSessions(req.user!.id, query);
    sendSuccess(res, result);
  }

  async getSession(req: Request, res: Response): Promise<void> {
    const session = await this.service.getSession(req.user!.id, String(req.params.id));
    sendSuccess(res, { session });
  }

  async removeSession(req: Request, res: Response): Promise<void> {
    await this.service.deleteSession(req.user!.id, String(req.params.id), requestContext(req));
    sendSuccess(res, { deleted: true });
  }
}
