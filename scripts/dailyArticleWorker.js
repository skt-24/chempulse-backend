'use strict';

// One-off Render Cron worker. Run at 19:00 UTC (00:30 IST).
// Requires Node.js 18+ and the backend's existing mongoose/dotenv dependencies.
// It uses the Gemini API Free Tier by default and publishes cited articles.

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const crypto = require('crypto');
const mongoose = require('mongoose');
const Article = require('../src/models/Article');
const Category = require('../src/models/Category');
const { slugify } = require('../src/utils/slugify');
const DAILY_ARTICLE_COUNT = 10;

const CATEGORY_REGISTRY = [
  { id: '6a70b4b777076b6d8bf52f1d', name: 'Materials Science', image: 'https://res.cloudinary.com/chempulse/image/upload/v1791929044/Materials_Science_amdann.png' },
  { id: '6a7adf876e7657e8aa909800', name: 'General Chemistry', image: 'https://res.cloudinary.com/chempulse/image/upload/v1791929071/General_Chemistry_ugkrmr.png' },
  { id: '6a7ae0d26e7657e8aa90981f', name: 'Organic Chemistry', image: 'https://res.cloudinary.com/chempulse/image/upload/v1791929071/Organic_Chemistry_g2mbbz.png' },
  { id: '6a7ae0fd6e7657e8aa909825', name: 'Inorganic Chemistry', image: 'https://res.cloudinary.com/chempulse/image/upload/v1791929068/Inorganic_Chemistry_sna9t5.png' },
  { id: '6a7ae1056e7657e8aa909828', name: 'Physical Chemistry', image: 'https://res.cloudinary.com/chempulse/image/upload/v1791929067/Physical_Chemistry_nlhyhv.png' },
  { id: '6a7ae10e6e7657e8aa90982b', name: 'Analytical Chemistry', image: 'https://res.cloudinary.com/chempulse/image/upload/v1791929069/Analytical_Chemistry_rhyse7.png' },
  { id: '6a7ae1166e7657e8aa90982e', name: 'Biochemistry', image: 'https://res.cloudinary.com/chempulse/image/upload/v1791929065/Biochemistry_ucgpwt.png' },
  { id: '6a7ae11f6e7657e8aa909831', name: 'Polymer Chemistry', image: 'https://res.cloudinary.com/chempulse/image/upload/v1791929064/Polymer_Chemistry_ef0xgt.png' },
  { id: '6a7ae1276e7657e8aa909834', name: 'Materials Chemistry', image: 'https://res.cloudinary.com/chempulse/image/upload/v1791929063/Materials_Chemistry_faiiw5.png' },
  { id: '6a7ae12e6e7657e8aa909837', name: 'Medicinal Chemistry', image: 'https://res.cloudinary.com/chempulse/image/upload/v1791929059/Medicinal_Chemistry_rv5zwk.png' },
  { id: '6a7ae1376e7657e8aa90983a', name: 'Environmental Chemistry', image: 'https://res.cloudinary.com/chempulse/image/upload/v1791929069/Environmental_Chemistry_riixsn.png' },
  { id: '6a7ae13e6e7657e8aa90983d', name: 'Industrial Chemistry', image: 'https://res.cloudinary.com/chempulse/image/upload/v1791929063/Industrial_Chemistry_vet1oy.png' },
  { id: '6a7ae1466e7657e8aa909840', name: 'Electrochemistry', image: 'https://res.cloudinary.com/chempulse/image/upload/v1791929061/Electrochemistry_bamilw.png' },
  { id: '6a7ae14e6e7657e8aa909843', name: 'Nuclear Chemistry', image: 'https://res.cloudinary.com/chempulse/image/upload/v1791929069/Nuclear_Chemistry_ssm3y0.png' },
  { id: '6a7ae1576e7657e8aa909846', name: 'Computational Chemistry', image: 'https://res.cloudinary.com/chempulse/image/upload/v1791929068/Computational_Chemistry_p435om.png' },
  { id: '6a7ae15e6e7657e8aa909849', name: 'Atmospheric Chemistry', image: 'https://res.cloudinary.com/chempulse/image/upload/v1791929058/Atmospheric_Chemistry_kl6jsa.png' }
];

const ARTICLE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'excerpt', 'bodyMarkdown', 'primarySourceUrl', 'references'],
  properties: {
    title: { type: 'string' },
    excerpt: { type: 'string' },
    bodyMarkdown: { type: 'string' },
    primarySourceUrl: { type: 'string' },
    references: {
      type: 'array',
      minItems: 3,
      maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'url'],
        properties: { title: { type: 'string' }, url: { type: 'string' } }
      }
    }
  }
};

function istDateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(date);
}

function categoryForDate(dateKey, offset = 0) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const dayNumber = Math.floor(Date.UTC(year, month - 1, day) / 86400000);
  const categoryIndex = (dayNumber + offset) % CATEGORY_REGISTRY.length;
  return CATEGORY_REGISTRY[(categoryIndex + CATEGORY_REGISTRY.length) % CATEGORY_REGISTRY.length];
}

function extractResponseText(response) {
  return (response.candidates?.[0]?.content?.parts || [])
    .map((part) => part.text || '')
    .join('\n')
    .trim();
}

function extractCitations(response) {
  const found = new Map();
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  for (const chunk of chunks) {
    if (!chunk.web?.uri) continue;
    try {
      const url = new URL(chunk.web.uri);
      if (url.protocol === 'https:') {
        found.set(url.href, { url: url.href, title: chunk.web.title || url.hostname });
      }
    } catch (_) {
      // Ignore malformed citations.
    }
  }
  return [...found.values()];
}

async function geminiRequest(payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8 * 60 * 1000);
  try {
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
      method: 'POST',
      headers: {
        'x-goog-api-key': process.env.GEMINI_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
      }
    );
    const body = await response.json();
    if (!response.ok) {
      throw new Error(`Gemini API returned ${response.status}: ${JSON.stringify(body.error || body).slice(0, 1200)}`);
    }
    return body;
  } finally {
    clearTimeout(timeout);
  }
}

async function research(category, excludedUrls = []) {
  const response = await geminiRequest({
    contents: [{ parts: [{ text:
      'Research a chemistry topic for a student-facing article. Use Google Search grounding. ' +
      'Prefer peer-reviewed primary papers and authoritative scientific institutions. Return a concise evidence brief with specific findings and caveats. ' +
      'Do not invent facts, papers, authors, dates, numerical results, or URLs. Clearly note uncertainty. ' +
      `Find a timely educational topic in ${category.name}; prefer a primary study from the past 24 months. ` +
      `Do not repeat these source URLs or topics: ${excludedUrls.join(', ') || 'none yet'}.`
    }] }],
    tools: [{ google_search: {} }],
    generationConfig: { maxOutputTokens: 3000 }
  });
  const brief = extractResponseText(response);
  const citations = extractCitations(response);
  if (brief.length < 300 || citations.length < 3) {
    throw new Error(`Research did not return a usable brief with at least 3 web citations (got ${citations.length}).`);
  }
  return { brief, citations };
}

async function writeArticle(category, researchResult) {
  const allowedSources = researchResult.citations;
  const response = await geminiRequest({
    contents: [{ parts: [{ text: JSON.stringify({
          instructions: 'Write a clear, original chemistry research summary in Markdown for CHEMSIQ students. Do not copy source wording. Use only claims supported by the supplied research brief. Do not give operational instructions for hazardous chemistry. State limitations and uncertainty. Return only the requested structured fields. Every reference URL must be selected verbatim from the supplied allowed sources; never invent or alter a URL.',
          category: category.name,
          requirements: {
            titleMaxCharacters: 200,
            excerptMaxCharacters: 500,
            bodyMarkdownSections: ['## Overview', '## Research findings', '## Why it matters'],
            referencesMin: 3,
            approximateReadingTimeMinutes: '3 to 5',
            tone: 'accurate, accessible, neutral'
          },
          researchBrief: researchResult.brief,
          allowedSources
        }) }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: ARTICLE_SCHEMA,
      maxOutputTokens: 3000
    }
  });

  const raw = extractResponseText(response);
  let article;
  try {
    article = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Could not parse structured article response: ${error.message}`);
  }
  validateGeneratedArticle(article, allowedSources);
  return article;
}

function validateGeneratedArticle(article, allowedSources) {
  if (!article.title || article.title.trim().length > 200) throw new Error('Generated title is empty or exceeds 200 characters.');
  if (!article.excerpt || article.excerpt.trim().length > 500) throw new Error('Generated excerpt is empty or exceeds 500 characters.');
  if (!article.bodyMarkdown || article.bodyMarkdown.trim().length < 500) throw new Error('Generated body is too short.');
  if (!Array.isArray(article.references) || article.references.length < 3) throw new Error('Generated article has fewer than 3 references.');

  const allowlist = new Set(allowedSources.map((source) => source.url));
  for (const reference of article.references) {
    let url;
    try { url = new URL(reference.url); } catch (_) { throw new Error('A generated reference URL is invalid.'); }
    if (url.protocol !== 'https:' || !allowlist.has(url.href)) {
      throw new Error(`Generated reference was not returned by web search: ${reference.url}`);
    }
  }
  if (!article.references.some((reference) => reference.url === article.primarySourceUrl)) {
    throw new Error('The primary source must be one of the verified web-search citations.');
  }
}

function buildContent(article) {
  const refs = article.references.map((reference, index) => `${index + 1}. [${reference.title}](${reference.url})`).join('\n');
  return `${article.bodyMarkdown.trim()}\n\n## Sources\n${refs}`;
}

async function claimDailyRun(runs, dateKey, token) {
  await runs.createIndex({ runDate: 1 }, { unique: true, name: 'uniq_daily_article_run_date' });
  const now = new Date();
  try {
    await runs.insertOne({
      runDate: dateKey,
      status: 'running',
      lockToken: token,
      lockExpiresAt: new Date(now.getTime() + 3 * 60 * 60 * 1000),
      startedAt: now,
      createdAt: now,
      updatedAt: now
    });
    return true;
  } catch (error) {
    if (error.code !== 11000) throw error;
  }

  const result = await runs.updateOne(
    { runDate: dateKey, $or: [{ status: 'failed' }, { lockExpiresAt: { $lte: now } }] },
    { $set: { status: 'running', lockToken: token, lockExpiresAt: new Date(now.getTime() + 3 * 60 * 60 * 1000), startedAt: now, updatedAt: now } }
  );
  return result.modifiedCount === 1;
}

async function archivePreviousAutomationDrafts(dateKey) {
  const automationRunId = /^chemsiq-daily-[0-9]{4}-[0-9]{2}-[0-9]{2}(-[0-9]{2})?$/;
  const currentRunId = new RegExp(`^chemsiq-daily-${dateKey}(-|$)`);
  const result = await Article.updateMany(
    {
      externalId: { $regex: automationRunId, $not: currentRunId },
      status: 'draft',
      ingestionStatus: 'pending_review'
    },
    { $set: { status: 'archived', ingestionStatus: 'archived' } }
  );
  return result.modifiedCount || 0;
}

function readingTime(content) {
  return Math.max(1, Math.ceil(content.split(/\s+/).filter(Boolean).length / 220));
}

async function main() {
  if (Number(process.versions.node.split('.')[0]) < 18) throw new Error('Node.js 18 or newer is required for built-in fetch.');
  for (const key of ['MONGODB_URI', 'GEMINI_API_KEY']) {
    if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`);
  }

  const dateKey = istDateKey();
  const externalIdPrefix = `chemsiq-daily-${dateKey}`;
  const token = crypto.randomUUID();
  const runTime = new Date();
  const runCollectionName = 'article_automation_runs';

  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: 'chempulse',
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    retryWrites: true,
    w: 'majority'
  });

  const runs = mongoose.connection.collection(runCollectionName);
  let claimed = false;
  try {
    claimed = await claimDailyRun(runs, dateKey, token);
    if (!claimed) {
      console.log(JSON.stringify({ event: 'daily_article_skipped', dateKey, reason: 'run already claimed or completed' }));
      return;
    }

    const completedArticles = [];
    const usedPrimarySources = new Set();

    for (let slot = 1; slot <= DAILY_ARTICLE_COUNT; slot += 1) {
      const itemExternalId = `${externalIdPrefix}-${String(slot).padStart(2, '0')}`;
      const existingForSlot = await Article.findOne({ externalId: itemExternalId }).lean();
      if (existingForSlot) {
        if (existingForSlot.canonicalUrl) usedPrimarySources.add(existingForSlot.canonicalUrl);
        completedArticles.push({ articleId: existingForSlot._id, slot, recovered: true });
        continue;
      }

      await runs.updateOne(
        { runDate: dateKey, lockToken: token },
        { $set: { lockExpiresAt: new Date(Date.now() + 3 * 60 * 60 * 1000), updatedAt: new Date() } }
      );

      const categoryConfig = categoryForDate(dateKey, slot - 1);
      const category = await Category.findOne({ _id: categoryConfig.id, active: true }).lean();
      if (!category) throw new Error(`Configured category is missing or inactive: ${categoryConfig.name} (${categoryConfig.id})`);

      let researchResult;
      let generated;
      let sourceAccepted = false;
      const excludedUrls = [...usedPrimarySources];
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        researchResult = await research(categoryConfig, excludedUrls);
        generated = await writeArticle(categoryConfig, researchResult);
        const duplicate = await Article.findOne({ canonicalUrl: generated.primarySourceUrl }).select('_id title').lean();
        if (!duplicate && !usedPrimarySources.has(generated.primarySourceUrl)) {
          sourceAccepted = true;
          break;
        }
        excludedUrls.push(generated.primarySourceUrl);
      }
      if (!sourceAccepted) throw new Error(`Could not find a new primary source for daily article ${slot} after 3 attempts.`);

      const content = buildContent(generated);
      const baseSlug = slugify(generated.title);
      const slugExists = await Article.exists({ slug: baseSlug });
      const slug = slugExists ? `${baseSlug}-${dateKey}-${String(slot).padStart(2, '0')}` : baseSlug;
      const article = await Article.create({
        title: generated.title.trim(),
        slug,
        excerpt: generated.excerpt.trim(),
        content,
        author: {
          name: 'CHEMSIQ Editorial Team',
          bio: 'Chemistry research summaries prepared for CHEMSIQ.',
          avatarUrl: ''
        },
        category: category._id,
        heroImage: {
          url: categoryConfig.image,
          caption: `${categoryConfig.name} chemistry illustration`
        },
        status: 'published',
        featured: false,
        publishedAt: new Date(),
        readTimeMinutes: readingTime(content),
        source: null,
        externalId: itemExternalId,
        canonicalUrl: generated.primarySourceUrl,
        attributionText: `Research summary based on the cited primary and authoritative sources in the article. Primary source: ${generated.primarySourceUrl}`,
        license: '',
        ingestedAt: runTime,
        ingestionStatus: 'approved',
        isDemoData: false
      });
      usedPrimarySources.add(generated.primarySourceUrl);
      completedArticles.push({ articleId: article._id, slot, category: categoryConfig.name });
      console.log(JSON.stringify({ event: 'daily_article_published', dateKey, slot, articleId: String(article._id), category: categoryConfig.name, status: article.status, ingestionStatus: article.ingestionStatus }));
    }

    const archivedCount = await archivePreviousAutomationDrafts(dateKey);
    await runs.updateOne(
      { runDate: dateKey, lockToken: token },
      { $set: { status: 'completed', articleIds: completedArticles.map((item) => item.articleId), createdCount: completedArticles.length, archivedPreviousDraftCount: archivedCount, completedAt: new Date(), updatedAt: new Date() }, $unset: { lockExpiresAt: '' } }
    );
    console.log(JSON.stringify({ event: 'daily_article_batch_completed', dateKey, requestedCount: DAILY_ARTICLE_COUNT, publishedCount: completedArticles.length, archivedPreviousDraftCount: archivedCount }));
  } catch (error) {
    if (claimed) {
      await runs.updateOne(
        { runDate: dateKey, lockToken: token },
        { $set: { status: 'failed', error: String(error.message || error).slice(0, 1500), failedAt: new Date(), updatedAt: new Date() }, $unset: { lockExpiresAt: '' } }
      ).catch(() => {});
    }
    console.error(JSON.stringify({ event: 'daily_article_failed', dateKey, error: String(error.stack || error) }));
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

main().catch(async (error) => {
  console.error(JSON.stringify({ event: 'daily_article_fatal', error: String(error.stack || error) }));
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
