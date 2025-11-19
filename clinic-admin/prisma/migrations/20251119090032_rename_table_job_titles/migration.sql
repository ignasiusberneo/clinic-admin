/*
  Warnings:

  - You are about to drop the column `employee_position_id` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the `employee_positions` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `employee_title_id` to the `employees` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `employees` DROP FOREIGN KEY `FK_Employee_Position`;

-- DropIndex
DROP INDEX `FK_Employee_Position` ON `employees`;

-- AlterTable
ALTER TABLE `employees` DROP COLUMN `employee_position_id`,
    ADD COLUMN `employee_title_id` VARCHAR(191) NOT NULL;

-- DropTable
DROP TABLE `employee_positions`;

-- CreateTable
CREATE TABLE `employee_titles` (
    `id` VARCHAR(191) NOT NULL,
    `business_area_id` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `employee_titles_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `employee_titles` ADD CONSTRAINT `FK_EmployeeTitle_BusinessArea` FOREIGN KEY (`business_area_id`) REFERENCES `business_areas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `FK_Employee_Title` FOREIGN KEY (`employee_title_id`) REFERENCES `employee_titles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
