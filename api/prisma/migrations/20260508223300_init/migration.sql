-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoJob" (
    "id" TEXT NOT NULL,
    "tavusVideoId" TEXT NOT NULL,
    "replicaId" TEXT NOT NULL,
    "script" TEXT NOT NULL,
    "tavusStatus" TEXT NOT NULL,
    "videoName" TEXT,
    "downloadUrl" TEXT,
    "hostedUrl" TEXT,
    "streamUrl" TEXT,
    "errorMessage" TEXT,
    "processedLocalPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VideoJob_tavusVideoId_key" ON "VideoJob"("tavusVideoId");

-- CreateIndex
CREATE INDEX "VideoJob_tavusVideoId_idx" ON "VideoJob"("tavusVideoId");
