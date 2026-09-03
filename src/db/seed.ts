import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import bcrypt from "bcryptjs";
import { eq, and } from "drizzle-orm";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

function generateId(): string {
  const { randomBytes } = require("crypto");
  return randomBytes(12).toString("base64url");
}

function generateSimpleEmbedding(text: string): number[] {
  const VOCAB_SIZE = 200;
  const STOP_WORDS = new Set(["the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for"]);
  
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  const vector = new Array(VOCAB_SIZE).fill(0);
  for (const token of tokens) {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      hash = (hash * 31 + token.charCodeAt(i)) % VOCAB_SIZE;
    }
    vector[Math.abs(hash)] += 1;
  }

  const norm = Math.sqrt(vector.reduce((s: number, v: number) => s + v * v, 0));
  return norm > 0 ? vector.map((v: number) => v / norm) : vector;
}

const SEED_FEEDBACKS = [
  // Onboarding issues
  { content: "The onboarding process is incredibly confusing. I had no idea how to set up my first project after signing up.", channel: "support", sentiment: "NEG", sentimentScore: -0.8, featureArea: "onboarding", themes: ["onboarding", "ux"] },
  { content: "Getting started guide is outdated. Half the screenshots don't match the current UI.", channel: "community", sentiment: "NEG", sentimentScore: -0.6, featureArea: "onboarding", themes: ["onboarding", "documentation"] },
  { content: "Love how easy it was to get started! The setup wizard walked me through everything perfectly.", channel: "appstore", sentiment: "POS", sentimentScore: 0.9, featureArea: "onboarding", themes: ["onboarding"] },
  { content: "The welcome email didn't include my workspace link. Had to contact support to find it.", channel: "support", sentiment: "NEG", sentimentScore: -0.5, featureArea: "onboarding", themes: ["onboarding", "email"] },
  { content: "Onboarding checklist is a great touch. Helped me discover features I would have missed.", channel: "nps", sentiment: "POS", sentimentScore: 0.8, featureArea: "onboarding", themes: ["onboarding"] },

  // Billing
  { content: "I was charged twice this month. Reached out to support and still no refund after 5 days.", channel: "support", sentiment: "NEG", sentimentScore: -0.9, featureArea: "billing", themes: ["billing", "support"] },
  { content: "The pricing page is misleading. The enterprise plan says 'unlimited users' but there's a fair use limit.", channel: "sales", sentiment: "NEG", sentimentScore: -0.7, featureArea: "billing", themes: ["billing"] },
  { content: "Appreciate the transparent pricing and the free trial. No credit card required is a huge plus.", channel: "appstore", sentiment: "POS", sentimentScore: 0.85, featureArea: "billing", themes: ["billing"] },
  { content: "Just got hit with an unexpected overage charge. The dashboard doesn't warn you when you're approaching limits.", channel: "support", sentiment: "NEG", sentimentScore: -0.8, featureArea: "billing", themes: ["billing", "notifications"] },
  { content: "Switching from monthly to annual billing was seamless. Saved us 20% instantly.", channel: "nps", sentiment: "POS", sentimentScore: 0.75, featureArea: "billing", themes: ["billing"] },

  // Performance
  { content: "The dashboard takes 8+ seconds to load. This is unacceptable for a paid product.", channel: "support", sentiment: "NEG", sentimentScore: -0.85, featureArea: "performance", themes: ["performance"] },
  { content: "Reports are incredibly fast now. Whatever you did in the last update worked!", channel: "community", sentiment: "POS", sentimentScore: 0.9, featureArea: "performance", themes: ["performance"] },
  { content: "API response times are terrible. P99 is over 2 seconds which is breaking our integration.", channel: "support", sentiment: "NEG", sentimentScore: -0.9, featureArea: "performance", themes: ["performance", "integrations"] },
  { content: "Mobile app is laggy when scrolling through large datasets. Needs optimization.", channel: "appstore", sentiment: "NEG", sentimentScore: -0.6, featureArea: "performance", themes: ["performance", "mobile"] },
  { content: "Page load speeds have improved dramatically over the past month. Great work!", channel: "nps", sentiment: "POS", sentimentScore: 0.8, featureArea: "performance", themes: ["performance"] },

  // UI/UX
  { content: "The new dark mode is beautiful! Finally something that doesn't hurt my eyes at night.", channel: "appstore", sentiment: "POS", sentimentScore: 0.95, featureArea: "ui", themes: ["ui", "accessibility"] },
  { content: "The table view is cluttered. Too many columns with no way to customize which ones are visible.", channel: "community", sentiment: "NEG", sentimentScore: -0.65, featureArea: "ui", themes: ["ui"] },
  { content: "Drag and drop for organizing widgets doesn't work on Firefox. Only tested in Chrome?", channel: "support", sentiment: "NEG", sentimentScore: -0.7, featureArea: "ui", themes: ["ui", "bugs"] },
  { content: "The new sidebar navigation is so much cleaner. Reduced my clicks by half.", channel: "appstore", sentiment: "POS", sentimentScore: 0.85, featureArea: "ui", themes: ["ui"] },
  { content: "Color contrast on some buttons is too low. Hard to read for colorblind users.", channel: "community", sentiment: "NEG", sentimentScore: -0.6, featureArea: "ui", themes: ["ui", "accessibility"] },

  // Integrations
  { content: "The Slack integration is exactly what we needed. Alerts come in real-time now.", channel: "community", sentiment: "POS", sentimentScore: 0.9, featureArea: "integrations", themes: ["integrations"] },
  { content: "Zapier integration keeps disconnecting every few days. Very unreliable.", channel: "support", sentiment: "NEG", sentimentScore: -0.8, featureArea: "integrations", themes: ["integrations"] },
  { content: "Can you add a HubSpot integration? We live in HubSpot and this would save us so much manual work.", channel: "sales", sentiment: "NEU", sentimentScore: 0.1, featureArea: "integrations", themes: ["integrations", "feature request"] },
  { content: "The Salesforce connector is rock solid. Syncs perfectly every hour as expected.", channel: "nps", sentiment: "POS", sentimentScore: 0.85, featureArea: "integrations", themes: ["integrations"] },
  { content: "Webhook failures don't trigger any alerts. We lost 3 days of data before noticing.", channel: "support", sentiment: "NEG", sentimentScore: -0.95, featureArea: "integrations", themes: ["integrations", "notifications"] },

  // Mobile
  { content: "iOS app crashes on startup since the last update. Tried reinstalling, still broken.", channel: "appstore", sentiment: "NEG", sentimentScore: -0.95, featureArea: "mobile", themes: ["mobile", "bugs"] },
  { content: "Android app is finally on par with the web version. Great update!", channel: "appstore", sentiment: "POS", sentimentScore: 0.9, featureArea: "mobile", themes: ["mobile"] },
  { content: "Push notifications are delayed by hours on iOS. Defeats the purpose of real-time alerts.", channel: "appstore", sentiment: "NEG", sentimentScore: -0.75, featureArea: "mobile", themes: ["mobile", "notifications"] },
  { content: "The mobile dashboard is clean and well-optimized. Works great on my iPhone 14.", channel: "appstore", sentiment: "POS", sentimentScore: 0.8, featureArea: "mobile", themes: ["mobile"] },
  { content: "No way to approve requests from mobile. Forces me to open the desktop app.", channel: "appstore", sentiment: "NEU", sentimentScore: -0.3, featureArea: "mobile", themes: ["mobile", "feature request"] },

  // Support
  { content: "Support team is incredibly responsive. Got a detailed answer within 30 minutes.", channel: "support", sentiment: "POS", sentimentScore: 0.95, featureArea: "support", themes: ["support"] },
  { content: "Opened a ticket 2 weeks ago and still no response. Your SLA says 24 hours.", channel: "support", sentiment: "NEG", sentimentScore: -0.95, featureArea: "support", themes: ["support"] },
  { content: "The chatbot is useless. It just keeps sending me to the same FAQ article.", channel: "support", sentiment: "NEG", sentimentScore: -0.75, featureArea: "support", themes: ["support"] },
  { content: "Knowledge base articles are well-written and cover most common questions.", channel: "community", sentiment: "POS", sentimentScore: 0.75, featureArea: "support", themes: ["support", "documentation"] },
  { content: "Live chat is only available during US business hours. We're in APAC and this is a problem.", channel: "support", sentiment: "NEG", sentimentScore: -0.6, featureArea: "support", themes: ["support"] },

  // Analytics/Reporting
  { content: "The custom report builder is incredibly powerful. We replaced our entire BI tool with it.", channel: "nps", sentiment: "POS", sentimentScore: 0.95, featureArea: "analytics", themes: ["analytics", "reporting"] },
  { content: "Scheduled reports aren't being delivered to email. Checked spam folder, nothing there.", channel: "support", sentiment: "NEG", sentimentScore: -0.8, featureArea: "analytics", themes: ["reporting", "email"] },
  { content: "Would love more chart types. Currently missing waterfall charts and funnel visualizations.", channel: "community", sentiment: "NEU", sentimentScore: 0.2, featureArea: "analytics", themes: ["analytics", "feature request"] },
  { content: "Data export to CSV is broken for datasets over 50k rows. Times out every time.", channel: "support", sentiment: "NEG", sentimentScore: -0.85, featureArea: "analytics", themes: ["analytics", "bugs"] },
  { content: "The cohort analysis feature is exactly what we were looking for. Brilliant implementation.", channel: "nps", sentiment: "POS", sentimentScore: 0.9, featureArea: "analytics", themes: ["analytics"] },

  // Security
  { content: "Two-factor authentication setup was painless. Love the authenticator app support.", channel: "nps", sentiment: "POS", sentimentScore: 0.85, featureArea: "security", themes: ["security"] },
  { content: "Audit logs don't show IP addresses. This is a compliance requirement for us.", channel: "support", sentiment: "NEG", sentimentScore: -0.6, featureArea: "security", themes: ["security", "compliance"] },
  { content: "SSO integration with our Okta instance worked perfectly first try.", channel: "community", sentiment: "POS", sentimentScore: 0.9, featureArea: "security", themes: ["security", "integrations"] },
  { content: "Password reset emails are ending up in spam. Need to fix your email reputation.", channel: "support", sentiment: "NEU", sentimentScore: -0.4, featureArea: "security", themes: ["security", "email"] },

  // Search
  { content: "Global search is amazing. Find any record instantly across all modules.", channel: "nps", sentiment: "POS", sentimentScore: 0.9, featureArea: "search", themes: ["search"] },
  { content: "Search doesn't support boolean operators. Can't search for 'A AND B NOT C'.", channel: "community", sentiment: "NEU", sentimentScore: -0.2, featureArea: "search", themes: ["search", "feature request"] },
  { content: "Search results are completely irrelevant half the time. The ranking algorithm needs work.", channel: "support", sentiment: "NEG", sentimentScore: -0.7, featureArea: "search", themes: ["search"] },

  // Notifications
  { content: "Email digest is perfect. Just enough info to stay up to date without notification fatigue.", channel: "nps", sentiment: "POS", sentimentScore: 0.8, featureArea: "notifications", themes: ["notifications"] },
  { content: "Getting too many notifications. Need more granular controls to reduce noise.", channel: "community", sentiment: "NEG", sentimentScore: -0.5, featureArea: "notifications", themes: ["notifications"] },
  { content: "Alert thresholds should be percentage-based not absolute numbers. Please add this.", channel: "support", sentiment: "NEU", sentimentScore: 0.0, featureArea: "notifications", themes: ["notifications", "feature request"] },

  // NPS high scores
  { content: "NPS: 10/10. This product has transformed how our team handles customer data. Absolutely love it.", channel: "nps", sentiment: "POS", sentimentScore: 0.98, featureArea: "general", themes: ["general"] },
  { content: "NPS: 9. Would give 10 if the mobile app was better. Everything else is excellent.", channel: "nps", sentiment: "POS", sentimentScore: 0.85, featureArea: "general", themes: ["mobile", "general"] },
  { content: "NPS: 3. Too many bugs and slow support. Not worth the price at current quality.", channel: "nps", sentiment: "NEG", sentimentScore: -0.7, featureArea: "general", themes: ["bugs", "support"] },
  { content: "NPS: 8. Love the product but pricing could be more flexible for smaller teams.", channel: "nps", sentiment: "POS", sentimentScore: 0.6, featureArea: "billing", themes: ["billing"] },
  { content: "NPS: 7. Good product, just need better documentation and more integrations.", channel: "nps", sentiment: "NEU", sentimentScore: 0.3, featureArea: "integrations", themes: ["documentation", "integrations"] },

  // Additional mixed
  { content: "The API documentation is excellent. Clear examples for every endpoint.", channel: "community", sentiment: "POS", sentimentScore: 0.85, featureArea: "api", themes: ["documentation", "integrations"] },
  { content: "Rate limiting is too aggressive. Our legitimate workflows keep hitting limits.", channel: "support", sentiment: "NEG", sentimentScore: -0.7, featureArea: "api", themes: ["integrations", "performance"] },
  { content: "Auto-save feature is a lifesaver. Never lost work since it was added.", channel: "appstore", sentiment: "POS", sentimentScore: 0.9, featureArea: "ui", themes: ["ui"] },
  { content: "Collaboration features are top notch. Our whole team can work simultaneously without conflicts.", channel: "nps", sentiment: "POS", sentimentScore: 0.92, featureArea: "collaboration", themes: ["collaboration"] },
  { content: "Can't export data in Excel format. CSV doesn't preserve formatting we need.", channel: "support", sentiment: "NEG", sentimentScore: -0.5, featureArea: "analytics", themes: ["analytics", "feature request"] },

  // More varied recent items
  { content: "The product roadmap transparency is refreshing. Love being able to upvote features.", channel: "community", sentiment: "POS", sentimentScore: 0.8, featureArea: "general", themes: ["general"] },
  { content: "Downtime last Tuesday cost us a client presentation. Need better reliability.", channel: "support", sentiment: "NEG", sentimentScore: -0.9, featureArea: "performance", themes: ["performance", "reliability"] },
  { content: "Keyboard shortcuts are intuitive and well-documented. Power user heaven!", channel: "community", sentiment: "POS", sentimentScore: 0.87, featureArea: "ui", themes: ["ui", "accessibility"] },
  { content: "User permissions are too binary. Need more granular control over what analysts can see.", channel: "support", sentiment: "NEG", sentimentScore: -0.55, featureArea: "security", themes: ["security"] },
  { content: "The template library saved us weeks of setup time. Exactly what we needed.", channel: "nps", sentiment: "POS", sentimentScore: 0.88, featureArea: "general", themes: ["onboarding"] },

  // More negative to balance
  { content: "Data import wizard is buggy. Failed 4 times before I gave up and uploaded manually.", channel: "support", sentiment: "NEG", sentimentScore: -0.8, featureArea: "onboarding", themes: ["onboarding", "bugs"] },
  { content: "Copying between workspaces is not possible. Had to recreate everything from scratch.", channel: "community", sentiment: "NEG", sentimentScore: -0.65, featureArea: "general", themes: ["feature request"] },
  { content: "Multi-currency support is non-existent. Major blocker for our international business.", channel: "sales", sentiment: "NEG", sentimentScore: -0.75, featureArea: "billing", themes: ["billing", "feature request"] },
  { content: "Cannot bulk delete records. Had to delete 500 items one by one. Please add this.", channel: "support", sentiment: "NEG", sentimentScore: -0.7, featureArea: "ui", themes: ["ui", "feature request"] },
  { content: "Customer success manager is proactive and genuinely helpful. 10/10 relationship.", channel: "sales", sentiment: "POS", sentimentScore: 0.95, featureArea: "support", themes: ["support"] },

  // Community
  { content: "The community forum is incredibly active and helpful. Found answers to all my questions.", channel: "community", sentiment: "POS", sentimentScore: 0.85, featureArea: "support", themes: ["support", "documentation"] },
  { content: "Webinars are too US-centric in timing. Need APAC-friendly sessions.", channel: "community", sentiment: "NEU", sentimentScore: -0.2, featureArea: "support", themes: ["support"] },
  { content: "Partner program is a great addition. Looking forward to growing with you.", channel: "sales", sentiment: "POS", sentimentScore: 0.8, featureArea: "general", themes: ["general"] },

  // More analytics
  { content: "Real-time analytics view is simply stunning. Our sales team checks it every morning.", channel: "nps", sentiment: "POS", sentimentScore: 0.92, featureArea: "analytics", themes: ["analytics"] },
  { content: "Historical data only goes back 1 year. We need 3+ years for proper trend analysis.", channel: "support", sentiment: "NEG", sentimentScore: -0.6, featureArea: "analytics", themes: ["analytics", "feature request"] },
  { content: "Comparative period analysis is super useful for our monthly reviews.", channel: "community", sentiment: "POS", sentimentScore: 0.82, featureArea: "analytics", themes: ["analytics"] },

  // Collaboration
  { content: "Comments on reports are great for team collaboration. Works like a charm.", channel: "nps", sentiment: "POS", sentimentScore: 0.88, featureArea: "collaboration", themes: ["collaboration"] },
  { content: "No way to @mention teammates in comments. Basic feature that's missing.", channel: "community", sentiment: "NEG", sentimentScore: -0.5, featureArea: "collaboration", themes: ["collaboration", "feature request"] },

  // Final batch
  { content: "The AI-powered suggestions are surprisingly accurate. Saves so much manual work.", channel: "nps", sentiment: "POS", sentimentScore: 0.93, featureArea: "ai", themes: ["ai", "general"] },
  { content: "AI classification keeps miscategorizing our industry-specific terminology.", channel: "support", sentiment: "NEG", sentimentScore: -0.65, featureArea: "ai", themes: ["ai"] },
  { content: "Truly the best product I've used in 10 years in the industry. Flawless.", channel: "nps", sentiment: "POS", sentimentScore: 0.99, featureArea: "general", themes: ["general"] },
  { content: "Price increase without any product improvement. Losing trust in this company.", channel: "sales", sentiment: "NEG", sentimentScore: -0.85, featureArea: "billing", themes: ["billing"] },
  { content: "Granular access controls for team members would be a game changer for us.", channel: "community", sentiment: "NEU", sentimentScore: 0.1, featureArea: "security", themes: ["security", "feature request"] },
];

async function seed() {
  console.log("🌱 Starting seed...");

  // Check if already seeded
  const existing = await db.select().from(schema.workspaces).where(eq(schema.workspaces.name, "Acme Corp")).limit(1);
  
  if (existing.length > 0) {
    console.log("✅ Already seeded, skipping workspace creation...");
    await pool.end();
    return;
  }

  // Create workspace
  const workspaceId = generateId();
  await db.insert(schema.workspaces).values({
    id: workspaceId,
    name: "Acme Corp",
  });
  console.log("✅ Created workspace: Acme Corp");

  // Create users
  const adminHash = await bcrypt.hash("password123", 12);
  const analystHash = await bcrypt.hash("password123", 12);
  const viewerHash = await bcrypt.hash("password123", 12);

  const adminId = generateId();
  const analystId = generateId();
  const viewerId = generateId();

  await db.insert(schema.users).values([
    { id: adminId, name: "Admin User", email: "admin@acme.com", passwordHash: adminHash, role: "ADMIN", workspaceId },
    { id: analystId, name: "Analyst User", email: "analyst@acme.com", passwordHash: analystHash, role: "ANALYST", workspaceId },
    { id: viewerId, name: "Viewer User", email: "viewer@acme.com", passwordHash: viewerHash, role: "VIEWER", workspaceId },
  ]);
  console.log("✅ Created 3 users");

  // Create themes upfront
  const themeColors: Record<string, string> = {
    onboarding: "#6366f1",
    billing: "#f59e0b",
    performance: "#ef4444",
    ui: "#8b5cf6",
    ux: "#8b5cf6",
    integrations: "#3b82f6",
    mobile: "#14b8a6",
    support: "#10b981",
    documentation: "#6366f1",
    analytics: "#ec4899",
    reporting: "#ec4899",
    security: "#64748b",
    search: "#06b6d4",
    notifications: "#f97316",
    bugs: "#dc2626",
    "feature request": "#7c3aed",
    collaboration: "#2563eb",
    email: "#0891b2",
    accessibility: "#4ade80",
    compliance: "#64748b",
    reliability: "#dc2626",
    ai: "#7c3aed",
    api: "#3b82f6",
    general: "#94a3b8",
  };

  const themeMap: Record<string, string> = {};
  for (const [name, color] of Object.entries(themeColors)) {
    const id = generateId();
    await db.insert(schema.themes).values({
      id,
      name,
      color,
      workspaceId,
    });
    themeMap[name] = id;
  }
  console.log("✅ Created themes");

  // Create feedbacks with date distribution over last 60 days
  let feedbackCount = 0;
  for (let i = 0; i < SEED_FEEDBACKS.length; i++) {
    const item = SEED_FEEDBACKS[i];
    const id = generateId();
    
    // Distribute dates over last 60 days
    const daysAgo = Math.floor(Math.random() * 60);
    const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

    await db.insert(schema.feedbacks).values({
      id,
      content: item.content,
      channel: item.channel as any,
      sentiment: item.sentiment as any,
      sentimentScore: item.sentimentScore,
      featureArea: item.featureArea,
      workspaceId,
      status: ["NEW", "REVIEWED", "ACTIONED"][Math.floor(Math.random() * 3)] as any,
      createdAt,
      updatedAt: new Date(),
    });

    // Link themes
    for (const themeName of item.themes) {
      const themeId = themeMap[themeName];
      if (themeId) {
        await db.insert(schema.feedbackThemes).values({
          feedbackId: id,
          themeId,
          confidence: 0.85 + Math.random() * 0.15,
        }).onConflictDoNothing();
      }
    }

    // Generate embedding
    const vector = generateSimpleEmbedding(item.content);
    await db.insert(schema.embeddings).values({
      id: generateId(),
      feedbackId: id,
      vector: JSON.stringify(vector),
    }).onConflictDoNothing();

    feedbackCount++;
  }
  console.log(`✅ Created ${feedbackCount} feedback items`);

  // Create a sample report
  await db.insert(schema.reports).values({
    id: generateId(),
    title: "Q4 2024 Voice of Customer Report",
    periodStart: new Date("2024-10-01"),
    periodEnd: new Date("2024-12-31"),
    contentJson: {
      summary: "Q4 2024 showed strong positive sentiment around our analytics and collaboration features, with 68% of feedback rated as positive. Key concerns include mobile app stability (15% spike in crash reports) and support response times. Top themes were performance, billing, and onboarding. Recommended actions: prioritize mobile stability fixes, reduce average support response time to under 4 hours, and simplify the billing dashboard.",
      stats: {
        totalFeedback: 85,
        sentimentBreakdown: { positive: 57, neutral: 14, negative: 14 },
        topThemes: [{ name: "performance", count: 18 }, { name: "billing", count: 12 }, { name: "onboarding", count: 10 }],
      },
      generatedAt: new Date().toISOString(),
    },
    workspaceId,
    generatedById: adminId,
  });
  console.log("✅ Created sample report");

  console.log("\n🎉 Seed complete!");
  console.log("Demo credentials:");
  console.log("  admin@acme.com / password123 (ADMIN)");
  console.log("  analyst@acme.com / password123 (ANALYST)");
  console.log("  viewer@acme.com / password123 (VIEWER)");

  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
