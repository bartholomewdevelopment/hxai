CREATE TYPE "public"."source_processing_status" AS ENUM('pending', 'fetching', 'extracting', 'chunking', 'chunked', 'embedding', 'ready', 'failed');--> statement-breakpoint
ALTER TABLE "source" ADD COLUMN "published" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "source" ADD COLUMN "processing_status" "source_processing_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "source" ADD COLUMN "processing_error" text;--> statement-breakpoint
ALTER TABLE "source" ADD COLUMN "processed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "source" ADD COLUMN "embedded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "source" ADD COLUMN "chunk_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "source" ADD COLUMN "content_hash" text;--> statement-breakpoint
ALTER TABLE "source" ADD COLUMN "retrieved_from" text;--> statement-breakpoint
ALTER TABLE "source" ADD COLUMN "retrieved_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "source_published_idx" ON "source" USING btree ("published");--> statement-breakpoint
CREATE INDEX "source_processing_status_idx" ON "source" USING btree ("processing_status");