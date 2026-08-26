/*
  Warnings:

  - Made the column `avatar_url` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "User" ALTER COLUMN "avatar_url" SET NOT NULL;
