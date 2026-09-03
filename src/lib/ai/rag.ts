import { db } from "@/db";
import { feedbacks, embeddings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateSimpleEmbedding, cosineSimilarity, stringToVector } from "./embeddings";
import { generateText } from "./gemini";

export interface RetrievedFeedback {
  id: string;
  content: string;
  channel: string;
  sentiment: string | null;
  createdAt: Date;
  similarity: number;
}

export async function retrieveRelevantFeedback(
  question: string,
  workspaceId: string,
  topK = 10
): Promise<RetrievedFeedback[]> {
  const questionVector = generateSimpleEmbedding(question);

  // Fetch all embeddings for this workspace
  const allEmbeddings = await db
    .select({
      feedbackId: embeddings.feedbackId,
      vector: embeddings.vector,
      content: feedbacks.content,
      channel: feedbacks.channel,
      sentiment: feedbacks.sentiment,
      createdAt: feedbacks.createdAt,
    })
    .from(embeddings)
    .innerJoin(feedbacks, eq(embeddings.feedbackId, feedbacks.id))
    .where(eq(feedbacks.workspaceId, workspaceId));

  // Calculate similarities
  const scored = allEmbeddings
    .map((row) => {
      const vector = row.vector ? stringToVector(row.vector) : [];
      const similarity =
        vector.length > 0 ? cosineSimilarity(questionVector, vector) : 0;
      return {
        id: row.feedbackId,
        content: row.content,
        channel: row.channel,
        sentiment: row.sentiment,
        createdAt: row.createdAt,
        similarity,
      };
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);

  return scored;
}

export async function answerQuestion(
  question: string,
  workspaceId: string
): Promise<{ answer: string; citations: RetrievedFeedback[] }> {
  const relevant = await retrieveRelevantFeedback(question, workspaceId, 10);

  if (relevant.length === 0) {
    return {
      answer:
        "I don't have enough feedback data to answer this question. Please ingest some feedback first.",
      citations: [],
    };
  }

  const contextText = relevant
    .map(
      (f, i) =>
        `[${i + 1}] Channel: ${f.channel}, Sentiment: ${f.sentiment ?? "unknown"}, Date: ${f.createdAt.toISOString().split("T")[0]}\nContent: "${f.content}"`
    )
    .join("\n\n");

  const systemPrompt = `You are LOOP, an AI assistant that answers questions about customer feedback. 
Answer the user's question using ONLY the provided feedback items as context.
If the answer is not clearly supported by the feedback, say so honestly.
Be concise, specific, and cite the feedback items by their number [1], [2], etc.
Do not invent data or make assumptions beyond what the feedback states.`;

  const userMessage = `Question: ${question}

Customer feedback context:
${contextText}

Please answer the question based solely on the above feedback.`;

  const answer = await generateText(
    `${systemPrompt}\n\n${userMessage}`,
    { temperature: 0.3, maxTokens: 1024 }
  );

  return { answer, citations: relevant };
}