import {
  pgTable,
  pgEnum,
  text,
  varchar,
  timestamp,
  real,
  primaryKey,
  json,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const roleEnum = pgEnum("role", ["ADMIN", "ANALYST", "VIEWER"]);
export const sentimentEnum = pgEnum("sentiment", ["POS", "NEU", "NEG"]);
export const statusEnum = pgEnum("status", ["NEW", "REVIEWED", "ACTIONED"]);

// Workspace
export const workspaces = pgTable("workspaces", {
  id: text("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Users
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").default("VIEWER").notNull(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Feedback
export const feedbacks = pgTable("feedbacks", {
  id: text("id").primaryKey(),
  content: text("content").notNull(),
  channel: varchar("channel", { length: 100 }).notNull(),
  sourceRef: varchar("source_ref", { length: 255 }),
  customerLabel: varchar("customer_label", { length: 255 }),
  sentiment: sentimentEnum("sentiment"),
  sentimentScore: real("sentiment_score"),
  status: statusEnum("status").default("NEW").notNull(),
  featureArea: varchar("feature_area", { length: 255 }),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Themes
export const themes = pgTable("themes", {
  id: text("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  color: varchar("color", { length: 7 }),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
});

// Feedback <-> Theme junction
export const feedbackThemes = pgTable(
  "feedback_themes",
  {
    feedbackId: text("feedback_id")
      .notNull()
      .references(() => feedbacks.id, { onDelete: "cascade" }),
    themeId: text("theme_id")
      .notNull()
      .references(() => themes.id, { onDelete: "cascade" }),
    confidence: real("confidence"),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.feedbackId, table.themeId] }),
  })
);

// Embeddings - store as JSON text since we don't have pgvector
export const embeddings = pgTable("embeddings", {
  id: text("id").primaryKey(),
  feedbackId: text("feedback_id")
    .notNull()
    .unique()
    .references(() => feedbacks.id, { onDelete: "cascade" }),
  vector: text("vector"), // JSON array of floats stored as text
});

// Reports
export const reports = pgTable("reports", {
  id: text("id").primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  contentJson: json("content_json").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  generatedById: text("generated_by_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

// Relations
export const workspacesRelations = relations(workspaces, ({ many }) => ({
  users: many(users),
  feedbacks: many(feedbacks),
  themes: many(themes),
  reports: many(reports),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [users.workspaceId],
    references: [workspaces.id],
  }),
  reports: many(reports),
}));

export const feedbacksRelations = relations(feedbacks, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [feedbacks.workspaceId],
    references: [workspaces.id],
  }),
  feedbackThemes: many(feedbackThemes),
  embedding: one(embeddings, {
    fields: [feedbacks.id],
    references: [embeddings.feedbackId],
  }),
}));

export const themesRelations = relations(themes, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [themes.workspaceId],
    references: [workspaces.id],
  }),
  feedbackThemes: many(feedbackThemes),
}));

export const feedbackThemesRelations = relations(feedbackThemes, ({ one }) => ({
  feedback: one(feedbacks, {
    fields: [feedbackThemes.feedbackId],
    references: [feedbacks.id],
  }),
  theme: one(themes, {
    fields: [feedbackThemes.themeId],
    references: [themes.id],
  }),
}));

export const embeddingsRelations = relations(embeddings, ({ one }) => ({
  feedback: one(feedbacks, {
    fields: [embeddings.feedbackId],
    references: [feedbacks.id],
  }),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [reports.workspaceId],
    references: [workspaces.id],
  }),
  generatedBy: one(users, {
    fields: [reports.generatedById],
    references: [users.id],
  }),
}));

// Type exports
export type Workspace = typeof workspaces.$inferSelect;
export type InsertWorkspace = typeof workspaces.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Feedback = typeof feedbacks.$inferSelect;
export type InsertFeedback = typeof feedbacks.$inferInsert;
export type Theme = typeof themes.$inferSelect;
export type InsertTheme = typeof themes.$inferInsert;
export type FeedbackTheme = typeof feedbackThemes.$inferSelect;
export type InsertFeedbackTheme = typeof feedbackThemes.$inferInsert;
export type Embedding = typeof embeddings.$inferSelect;
export type InsertEmbedding = typeof embeddings.$inferInsert;
export type Report = typeof reports.$inferSelect;
export type InsertReport = typeof reports.$inferInsert;
