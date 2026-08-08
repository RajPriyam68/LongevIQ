import type { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma.js';
import type {
  CreateMedicalReportInput,
  ListReportsFilter,
  ReportsRepository,
} from './reports.repository.types.js';

export class PrismaReportsRepository implements ReportsRepository {
  async create(input: CreateMedicalReportInput) {
    return prisma.medicalReport.create({
      data: {
        userId: input.userId,
        title: input.title,
        reportDate: input.reportDate,
        source: input.source ?? null,
        category: input.category,
        notes: input.notes ?? null,
        status: input.status,
        fileName: input.fileName,
        fileSizeBytes: input.fileSizeBytes,
        mimeType: input.mimeType,
        storageKey: input.storageKey,
      },
    });
  }

  async findById(id: string) {
    return prisma.medicalReport.findUnique({ where: { id } });
  }

  async listByUser(userId: string, filter: ListReportsFilter) {
    const where: Prisma.MedicalReportWhereInput = {
      userId,
      ...(filter.category ? { category: filter.category } : {}),
      ...(filter.status ? { status: filter.status } : {}),
    };

    const [items, total] = await prisma.$transaction([
      prisma.medicalReport.findMany({
        where,
        orderBy: { createdAt: filter.sort },
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      prisma.medicalReport.count({ where }),
    ]);

    return { items, total };
  }

  async update(id: string, data: Prisma.MedicalReportUpdateInput) {
    return prisma.medicalReport.update({ where: { id }, data });
  }

  async delete(id: string) {
    await prisma.medicalReport.delete({ where: { id } });
  }
}
