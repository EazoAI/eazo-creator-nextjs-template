ALTER TABLE "todos" ADD COLUMN "user_id" varchar(128) NOT NULL;--> statement-breakpoint
CREATE INDEX "todos_user_id_idx" ON "todos" USING btree ("user_id");