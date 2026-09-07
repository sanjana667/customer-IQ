CREATE TYPE "public"."role" AS ENUM('ADMIN', 'ANALYST', 'VIEWER');--> statement-breakpoint
CREATE TYPE "public"."sentiment" AS ENUM('POS', 'NEU', 'NEG');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('NEW', 'REVIEWED', 'ACTIONED');--> statement-breakpoint
CREATE TABLE "embeddings" (
	"id" text PRIMARY KEY NOT NULL,
	"feedback_id" text NOT NULL,
	"vector" text,
	CONSTRAINT "embeddings_feedback_id_unique" UNIQUE("feedback_id")
);
--> statement-breakpoint
CREATE TABLE "feedback_themes" (
	"feedback_id" text NOT NULL,
	"theme_id" text NOT NULL,
	"confidence" real,
	CONSTRAINT "feedback_themes_feedback_id_theme_id_pk" PRIMARY KEY("feedback_id","theme_id")
);
--> statement-breakpoint
CREATE TABLE "feedbacks" (
	"id" text PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"channel" varchar(100) NOT NULL,
	"source_ref" varchar(255),
	"customer_label" varchar(255),
	"sentiment" "sentiment",
	"sentiment_score" real,
	"status" "status" DEFAULT 'NEW' NOT NULL,
	"feature_area" varchar(255),
	"workspace_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" text PRIMARY KEY NOT NULL,
	"title" varchar(500) NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"content_json" json NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"workspace_id" text NOT NULL,
	"generated_by_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "themes" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"color" varchar(7),
	"workspace_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"role" "role" DEFAULT 'VIEWER' NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "embeddings" ADD CONSTRAINT "embeddings_feedback_id_feedbacks_id_fk" FOREIGN KEY ("feedback_id") REFERENCES "public"."feedbacks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_themes" ADD CONSTRAINT "feedback_themes_feedback_id_feedbacks_id_fk" FOREIGN KEY ("feedback_id") REFERENCES "public"."feedbacks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_themes" ADD CONSTRAINT "feedback_themes_theme_id_themes_id_fk" FOREIGN KEY ("theme_id") REFERENCES "public"."themes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_generated_by_id_users_id_fk" FOREIGN KEY ("generated_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "themes" ADD CONSTRAINT "themes_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;