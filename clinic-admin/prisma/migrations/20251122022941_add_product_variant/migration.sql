-- CreateTable
CREATE TABLE `product_variants` (
    `id` INTEGER NOT NULL,
    `product_id` INTEGER NOT NULL,
    `product_business_area_id` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `price` INTEGER NOT NULL,

    PRIMARY KEY (`id`, `product_id`, `product_business_area_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `patients_full_name_idx` ON `patients`(`full_name`);

-- CreateIndex
CREATE INDEX `products_name_idx` ON `products`(`name`);

-- AddForeignKey
ALTER TABLE `product_variants` ADD CONSTRAINT `product_variants_product_id_product_business_area_id_fkey` FOREIGN KEY (`product_id`, `product_business_area_id`) REFERENCES `products`(`id`, `business_area_id`) ON DELETE CASCADE ON UPDATE CASCADE;
