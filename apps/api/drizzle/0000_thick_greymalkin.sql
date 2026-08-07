CREATE TYPE "public"."media_kind" AS ENUM('recording', 'reenactment', 'documentary');--> statement-breakpoint
CREATE TYPE "public"."message_role" AS ENUM('user', 'assistant', 'system');--> statement-breakpoint
CREATE TYPE "public"."rights_status" AS ENUM('public_domain', 'licensed', 'permission_required', 'copyright', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."source_type" AS ENUM('primary', 'contemporary', 'scholarly');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'curator', 'admin');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('unverified', 'in_review', 'verified', 'disputed');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"ip_address" text,
	"user_agent" text,
	"request_id" text,
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"display_name" text,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "historical_person" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"full_name" text NOT NULL,
	"display_name" text NOT NULL,
	"birth_date" date,
	"death_date" date,
	"birthplace" text,
	"death_place" text,
	"nationality" text,
	"occupations" text[] DEFAULT '{}' NOT NULL,
	"historical_era" text,
	"categories" text[] DEFAULT '{}' NOT NULL,
	"short_biography" text,
	"long_biography" text,
	"portrait_url" text,
	"hero_image_url" text,
	"knowledge_cutoff_date" date,
	"published" boolean DEFAULT false NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"source_count" integer DEFAULT 0 NOT NULL,
	"audio_source_count" integer DEFAULT 0 NOT NULL,
	"video_source_count" integer DEFAULT 0 NOT NULL,
	"persona_configuration" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "historical_person_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "source" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"historical_person_id" uuid NOT NULL,
	"title" text NOT NULL,
	"author" text,
	"document_type" text,
	"date_created" date,
	"approximate_date" text,
	"historical_period" text,
	"description" text,
	"archive_name" text,
	"collection_name" text,
	"canonical_url" text,
	"original_document_url" text,
	"transcription_url" text,
	"local_file_url" text,
	"full_text" text,
	"language" text DEFAULT 'en' NOT NULL,
	"translated" boolean DEFAULT false NOT NULL,
	"translator" text,
	"source_type" "source_type" DEFAULT 'primary' NOT NULL,
	"rights_status" "rights_status" DEFAULT 'unknown' NOT NULL,
	"copyright_jurisdiction" text,
	"rights_notes" text,
	"verification_status" "verification_status" DEFAULT 'unverified' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_chunk" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"historical_person_id" uuid NOT NULL,
	"chunk_index" integer NOT NULL,
	"text" text NOT NULL,
	"token_count" integer,
	"page_number" integer,
	"chapter" text,
	"section" text,
	"date_context" date,
	"topic_tags" text[] DEFAULT '{}' NOT NULL,
	"embedding" vector(1536),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audio_source" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"historical_person_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"kind" "media_kind" DEFAULT 'recording' NOT NULL,
	"speaker" text,
	"recorded_date" date,
	"approximate_date" text,
	"duration_seconds" integer,
	"audio_url" text,
	"local_file_url" text,
	"format" text,
	"language" text DEFAULT 'en' NOT NULL,
	"archive_name" text,
	"collection_name" text,
	"canonical_url" text,
	"transcript_source_id" uuid,
	"transcription_completed" boolean DEFAULT false NOT NULL,
	"rights_status" "rights_status" DEFAULT 'unknown' NOT NULL,
	"rights_notes" text,
	"verification_status" "verification_status" DEFAULT 'unverified' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_source" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"historical_person_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"kind" "media_kind" DEFAULT 'documentary' NOT NULL,
	"recorded_date" date,
	"approximate_date" text,
	"duration_seconds" integer,
	"video_url" text,
	"local_file_url" text,
	"thumbnail_url" text,
	"format" text,
	"language" text DEFAULT 'en' NOT NULL,
	"archive_name" text,
	"collection_name" text,
	"canonical_url" text,
	"transcript_source_id" uuid,
	"transcription_completed" boolean DEFAULT false NOT NULL,
	"rights_status" "rights_status" DEFAULT 'unknown' NOT NULL,
	"rights_notes" text,
	"verification_status" "verification_status" DEFAULT 'unverified' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"historical_person_id" uuid NOT NULL,
	"title" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation_participant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"historical_person_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" "message_role" NOT NULL,
	"speaker_person_id" uuid,
	"content" text NOT NULL,
	"citations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"retrieved_source_chunk_ids" uuid[] DEFAULT '{}' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source" ADD CONSTRAINT "source_historical_person_id_historical_person_id_fk" FOREIGN KEY ("historical_person_id") REFERENCES "public"."historical_person"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_chunk" ADD CONSTRAINT "source_chunk_source_id_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."source"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_chunk" ADD CONSTRAINT "source_chunk_historical_person_id_historical_person_id_fk" FOREIGN KEY ("historical_person_id") REFERENCES "public"."historical_person"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audio_source" ADD CONSTRAINT "audio_source_historical_person_id_historical_person_id_fk" FOREIGN KEY ("historical_person_id") REFERENCES "public"."historical_person"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audio_source" ADD CONSTRAINT "audio_source_transcript_source_id_source_id_fk" FOREIGN KEY ("transcript_source_id") REFERENCES "public"."source"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_source" ADD CONSTRAINT "video_source_historical_person_id_historical_person_id_fk" FOREIGN KEY ("historical_person_id") REFERENCES "public"."historical_person"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_source" ADD CONSTRAINT "video_source_transcript_source_id_source_id_fk" FOREIGN KEY ("transcript_source_id") REFERENCES "public"."source"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_historical_person_id_historical_person_id_fk" FOREIGN KEY ("historical_person_id") REFERENCES "public"."historical_person"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_participant" ADD CONSTRAINT "conversation_participant_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_participant" ADD CONSTRAINT "conversation_participant_historical_person_id_historical_person_id_fk" FOREIGN KEY ("historical_person_id") REFERENCES "public"."historical_person"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_speaker_person_id_historical_person_id_fk" FOREIGN KEY ("speaker_person_id") REFERENCES "public"."historical_person"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_actor_idx" ON "audit_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "historical_person_published_idx" ON "historical_person" USING btree ("published");--> statement-breakpoint
CREATE INDEX "historical_person_featured_idx" ON "historical_person" USING btree ("featured");--> statement-breakpoint
CREATE INDEX "historical_person_era_idx" ON "historical_person" USING btree ("historical_era");--> statement-breakpoint
CREATE INDEX "source_person_idx" ON "source" USING btree ("historical_person_id");--> statement-breakpoint
CREATE INDEX "source_type_idx" ON "source" USING btree ("source_type");--> statement-breakpoint
CREATE INDEX "source_rights_idx" ON "source" USING btree ("rights_status");--> statement-breakpoint
CREATE INDEX "source_verification_idx" ON "source" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX "source_person_date_idx" ON "source" USING btree ("historical_person_id","date_created");--> statement-breakpoint
CREATE UNIQUE INDEX "source_chunk_source_index_uq" ON "source_chunk" USING btree ("source_id","chunk_index");--> statement-breakpoint
CREATE INDEX "source_chunk_person_idx" ON "source_chunk" USING btree ("historical_person_id");--> statement-breakpoint
CREATE INDEX "source_chunk_person_date_idx" ON "source_chunk" USING btree ("historical_person_id","date_context");--> statement-breakpoint
CREATE INDEX "source_chunk_embedding_hnsw_idx" ON "source_chunk" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "audio_source_person_idx" ON "audio_source" USING btree ("historical_person_id");--> statement-breakpoint
CREATE INDEX "audio_source_kind_idx" ON "audio_source" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "video_source_person_idx" ON "video_source" USING btree ("historical_person_id");--> statement-breakpoint
CREATE INDEX "video_source_kind_idx" ON "video_source" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "conversation_user_idx" ON "conversation" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "conversation_person_idx" ON "conversation" USING btree ("historical_person_id");--> statement-breakpoint
CREATE INDEX "conversation_updated_at_idx" ON "conversation" USING btree ("updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_participant_uq" ON "conversation_participant" USING btree ("conversation_id","historical_person_id");--> statement-breakpoint
CREATE INDEX "message_conversation_idx" ON "message" USING btree ("conversation_id","created_at");