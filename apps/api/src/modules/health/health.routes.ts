import { Router } from 'express';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';

const healthService = new HealthService();
const healthController = new HealthController(healthService);

const router = Router();

router.get('/', (req, res) => healthController.check(req, res));

export default router;
