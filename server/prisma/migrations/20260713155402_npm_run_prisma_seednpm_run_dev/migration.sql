-- CreateTable
CREATE TABLE `authenticators` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `credential_id` VARCHAR(191) NOT NULL,
    `credential_public_key` VARCHAR(191) NOT NULL,
    `counter` INTEGER NOT NULL DEFAULT 0,
    `credential_device_type` VARCHAR(191) NOT NULL,
    `credential_backed_up` BOOLEAN NOT NULL DEFAULT false,
    `transports` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `authenticators_credential_id_key`(`credential_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `authenticators` ADD CONSTRAINT `authenticators_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
