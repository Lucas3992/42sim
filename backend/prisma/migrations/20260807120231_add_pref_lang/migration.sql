/*
  Warnings:

  - Added the required column `prefLang` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Language" AS ENUM ('EN', 'FR', 'NL');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "prefLang" "Language" NOT NULL;
