-- CreateTable
CREATE TABLE "VoicePreference" (
    "userId" TEXT NOT NULL,
    "readAloud" BOOLEAN NOT NULL DEFAULT true,
    "autoListen" BOOLEAN NOT NULL DEFAULT false,
    "speechRate" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "speechPitch" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "voiceLocale" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VoicePreference_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "VoicePreference" ADD CONSTRAINT "VoicePreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
