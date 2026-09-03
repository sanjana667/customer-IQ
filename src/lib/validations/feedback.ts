import { z } from "zod";

export const createFeedbackSchema = z.object({
  content: z.string().min(1, "Content is required").max(10000),
  channel: z.enum(["support", "appstore", "nps", "sales", "community"]),
  customerLabel: z.string().max(255).optional(),
  sourceRef: z.string().max(255).optional(),
});

export const updateFeedbackStatusSchema = z.object({
  status: z.enum(["NEW", "REVIEWED", "ACTIONED"]),
});

export const feedbackQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  channel: z.string().optional(),
  sentiment: z.enum(["POS", "NEU", "NEG"]).optional(),
  theme: z.string().optional(),
  status: z.enum(["NEW", "REVIEWED", "ACTIONED"]).optional(),
  search: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;
export type UpdateFeedbackStatusInput = z.infer<typeof updateFeedbackStatusSchema>;
export type FeedbackQueryInput = z.infer<typeof feedbackQuerySchema>;
