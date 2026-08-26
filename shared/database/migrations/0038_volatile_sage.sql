ALTER TABLE "product_review" ADD COLUMN "status" text DEFAULT 'approved' NOT NULL;--> statement-breakpoint
ALTER TABLE "product_review" ADD COLUMN "media_url" text;