-- AlterTable
ALTER TABLE `order_items` ADD COLUMN `product_variant_business_area_id` INTEGER NULL,
    ADD COLUMN `product_variant_id` INTEGER NULL,
    ADD COLUMN `product_variant_product_id` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `FK_OrderItem_ProductVariant` FOREIGN KEY (`product_variant_id`, `product_variant_product_id`, `product_variant_business_area_id`) REFERENCES `product_variants`(`id`, `product_id`, `product_business_area_id`) ON DELETE SET NULL ON UPDATE CASCADE;
