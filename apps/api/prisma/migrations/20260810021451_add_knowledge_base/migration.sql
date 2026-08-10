-- CreateEnum
CREATE TYPE "KnowledgeCategory" AS ENUM ('METRICS', 'LABS', 'NUTRITION', 'WELLNESS');

-- CreateEnum
CREATE TYPE "KnowledgeStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "KnowledgeDocument" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "category" "KnowledgeCategory" NOT NULL DEFAULT 'WELLNESS',
    "source" TEXT,
    "status" "KnowledgeStatus" NOT NULL DEFAULT 'DRAFT',
    "language" TEXT NOT NULL DEFAULT 'english',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeChunk" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "searchVector" tsvector,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeChunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeDocument_slug_key" ON "KnowledgeDocument"("slug");

-- CreateIndex
CREATE INDEX "KnowledgeDocument_status_category_idx" ON "KnowledgeDocument"("status", "category");

-- CreateIndex
CREATE INDEX "KnowledgeChunk_documentId_chunkIndex_idx" ON "KnowledgeChunk"("documentId", "chunkIndex");

-- CreateIndex
CREATE INDEX "KnowledgeChunk_searchVector_idx" ON "KnowledgeChunk" USING GIN ("searchVector");

-- AddForeignKey
ALTER TABLE "KnowledgeDocument" ADD CONSTRAINT "KnowledgeDocument_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeChunk" ADD CONSTRAINT "KnowledgeChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "KnowledgeDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
