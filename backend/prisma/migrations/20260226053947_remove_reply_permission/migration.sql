/*
  Warnings:

  - You are about to drop the `ReplyPermission` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `assigneeId` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `assignerId` on the `Task` table. All the data in the column will be lost.
  - Added the required column `leaderId` to the `Task` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "ReplyPermission_taskId_userId_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ReplyPermission";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "displayId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "leaderId" TEXT NOT NULL,
    "dueAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT '지시등록',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Task_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Task" ("completedAt", "content", "createdAt", "displayId", "dueAt", "id", "isDeleted", "status", "title", "updatedAt") SELECT "completedAt", "content", "createdAt", "displayId", "dueAt", "id", "isDeleted", "status", "title", "updatedAt" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
CREATE UNIQUE INDEX "Task_displayId_key" ON "Task"("displayId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
