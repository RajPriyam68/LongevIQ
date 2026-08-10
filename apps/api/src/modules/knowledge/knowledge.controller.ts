import type { Request, Response } from 'express';
import type {
  CreateKnowledgeDocumentInput,
  ListKnowledgeDocumentsQuery,
  SearchKnowledgeQuery,
  UpdateKnowledgeDocumentInput,
} from '@longeviq/shared';
import { sendSuccess } from '../../utils/api-response.js';
import type { KnowledgeService } from './knowledge.service.js';

function requestContext(req: Request) {
  return {
    ipAddress: req.ip ?? null,
    userAgent: req.get('user-agent') ?? null,
  };
}

export class KnowledgeController {
  constructor(private readonly service: KnowledgeService) {}

  async search(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as SearchKnowledgeQuery;
    const result = await this.service.search(query);
    sendSuccess(res, result);
  }

  async list(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as ListKnowledgeDocumentsQuery;
    const result = await this.service.listDocuments(req.user!.role, query);
    sendSuccess(res, result);
  }

  async getOne(req: Request, res: Response): Promise<void> {
    const document = await this.service.getDocument(req.user!.role, String(req.params.id));
    sendSuccess(res, { document });
  }

  async create(req: Request, res: Response): Promise<void> {
    const document = await this.service.createDocument(
      req.user!.id,
      req.user!.role,
      req.body as CreateKnowledgeDocumentInput,
      requestContext(req),
    );
    sendSuccess(res, { document }, 201);
  }

  async update(req: Request, res: Response): Promise<void> {
    const document = await this.service.updateDocument(
      req.user!.id,
      req.user!.role,
      String(req.params.id),
      req.body as UpdateKnowledgeDocumentInput,
      requestContext(req),
    );
    sendSuccess(res, { document });
  }

  async remove(req: Request, res: Response): Promise<void> {
    await this.service.deleteDocument(
      req.user!.id,
      req.user!.role,
      String(req.params.id),
      requestContext(req),
    );
    sendSuccess(res, { deleted: true });
  }
}
