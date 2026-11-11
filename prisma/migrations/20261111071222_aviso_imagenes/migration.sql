-- CreateTable
CREATE TABLE "AnnouncementImage" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AnnouncementImage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AnnouncementImage" ADD CONSTRAINT "AnnouncementImage_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
