-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "displayId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "assignerName" TEXT NOT NULL,
    "assigneeName" TEXT NOT NULL,
    "dueAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT '지시등록',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_Task" ("assigneeName", "assignerName", "completedAt", "content", "createdAt", "displayId", "dueAt", "id", "status", "title", "updatedAt") SELECT "assigneeName", "assignerName", "completedAt", "content", "createdAt", "displayId", "dueAt", "id", "status", "title", "updatedAt" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
CREATE UNIQUE INDEX "Task_displayId_key" ON "Task"("displayId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
