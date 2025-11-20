-- CreateTable
CREATE TABLE `schedule_templates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `product_id` INTEGER NOT NULL,
    `business_area_id` INTEGER NOT NULL,
    `start_time_str` VARCHAR(191) NOT NULL,
    `end_time_str` VARCHAR(191) NOT NULL,
    `max_quota` INTEGER NOT NULL DEFAULT 10,

    INDEX `schedule_templates_business_area_id_product_id_idx`(`business_area_id`, `product_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
