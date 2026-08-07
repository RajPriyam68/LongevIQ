import type { Request, Response } from 'express';
import type { AuthService } from '../auth/auth.service.js';
import { sendSuccess } from '../../utils/api-response.js';

export class UsersController {
  constructor(private readonly authService: AuthService) {}

  async getMe(req: Request, res: Response): Promise<void> {
    const user = await this.authService.getUserById(req.user!.id);
    sendSuccess(res, { user });
  }

  async updateMe(req: Request, res: Response): Promise<void> {
    const user = await this.authService.updateProfile(req.user!.id, req.body);
    sendSuccess(res, { user });
  }

  async changePassword(req: Request, res: Response): Promise<void> {
    await this.authService.changePassword(req.user!.id, req.body);
    sendSuccess(res, { changed: true });
  }
}
