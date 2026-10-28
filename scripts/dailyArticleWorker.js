'use strict';

// Render Cron worker: runs at 19:00 UTC (12:30 a.m. IST).
// Requires Node.js 18+ and the backend's existing mongoose and dotenv dependencies.

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const crypto = require('crypto');
const mongoose = require('mongoose');
const Article = require('../src/models/Article');
const Category = require('../src/models/Category');
const { slugify } = require('../src/utils/slugify');

const DAILY_ARTICLE_COUNT = 10;

const CATEGORIES = [
  ['6a70b4b777076b6d8bf52f1d', 'Materials Science', 'https://res.cloudinary.com/chempulse/image/upload/v1791929044/Materials_Science_amdann.png'],
  ['6a7adf876e7657e8aa909800', 'General Chemistry', 'https://res.cloudinary.com/chempulse/image/upload/v1791929071/General_Chemistry_ugkrmr.png'],
  ['6a7ae0d26e7657e8aa90981f', 'Organic Chemistry', 'https://res.cloudinary.com/chempulse/image/upload/v1791929071/Organic_Chemistry_g2mbbz.png'],
  ['6a7ae0fd6e7657e8aa909825', 'Inorganic Chemistry', 'https://res.cloudinary.com/chempulse/image/upload/v1791929068/Inorganic_Chemistry_sna9t5.png'],
  ['6a7ae1056e7657e8aa909828', 'Physical Chemistry', 'https://res.cloudinary.com/chempulse/image/upload/v1791929067/Physical_Chemistry_nlhyhv.png'],
  ['6a7ae10e6e7657e8aa90982b', 'Analytical Chemistry', 'https://res.cloudinary.com/chempulse/image/upload/v1791929069/Analytical_Chemistry_rhyse7.png'],
  ['6a7ae1166e7657e8aa90982e', 'Biochemistry', 'https://res.cloudinary.com/chempulse/image/upload/v1791929065/Biochemistry_ucgpwt.png'],
  ['6a7ae11f6e7657e8aa909831', 'Polymer Chemistry', 'https://res.cloudinary.com/chempulse/image/upload/v1791929064/Polymer_Chemistry_ef0xgt.png'],
  ['6a7ae1276e7657e8aa909834', 'Materials Chemistry', 'https://res.cloudinary.com/chempulse/image/upload/v1791929063/Materials_Chemistry_faiiw5.png'],
  ['6a7ae12e6e7657e8aa909837', 'Medicinal Chemistry', 'https://res.cloudinary.com/chempulse/image/upload/v1791929059/Medicinal_Chemistry_rv5zwk.png'],
  ['6a7ae1376e7657e8aa90983a', 'Environmental Chemistry', 'https://res.cloudinary.com/chempulse/image/upload/v1791929069/Environmental_Chemistry_riixsn.png'],
  ['6a7ae13e6e7657e8aa90983d', 'Industrial Chemistry', 'https://res.cloudinary.com/chempulse/image/upload/v1791929063/Industrial_Chemistry_vet1oy.png'],
  ['6a7ae1466e7657e8aa909840', 'Electrochemistry', 'https://res.cloudinary.com/chempulse/image/upload/v1791929061/Electrochemistry_bamilw.png'],
  ['6a7ae14e6e7657e8aa909843', 'Nuclear Chemistry', 'https://res.cloudinary.com/chempulse/image/upload/v1791929069/Nuclear_Chemistry_ssm3y0.png'],
  ['6a7ae1576e7657e8aa909846', 'Computational Chemistry', 'https://res.cloudinary.com/chempulse/image/upload/v1791929068/Computational_Chemistry_p435om.png'],
  ['6a7ae15e6e7657e8aa909849', 'Atmospheric Chemistry', 'https://res.cloudinary.com/chempulse/image/upload/v1791929058/Atmospheric_Chemistry_kl6jsa.png']
].map(([id, name, image]) => ({ id, name, image }));

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
        properties: {
          title: { type: 'string' },
          url: { type: 'string' }
        }
      }
    }
  }
};

function getIstDateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

function getCategory(dateKey, offset) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const dayNumber = Math.floor(Date.UTC(year, month - 1, day) / 86400000);
  return CATEGORIES[((dayNumber + offset) % CATEGORIES.length + CATEGORIES.length) % CATEGORIES.length];
}

function getOutputText(response) {
  return (response.output || [])
    .filter((item) => item.type === 'message')
    .flatMap((item) => item.content || [])
    .filter((part) => part.type === 'output_text')
    .map((part) => part.text || '')
    .join('\n')
    .trim();
}

function getCitations(response) {
  const found = new Map();

  for (const item of response.output || []) {
    if (item.type !== 'message') continue;

    for (const part of item.content || []) {
      for (const annotation of part.annotations || []) {
        if (annotation.type !== 'url_citation' || !annotation.url) continue;

        try {
          const url = new URL(annotation.url);
          if (url.protocol === 'https:') {
            found.set(url.href, {
              url: url.href,
              title: annotation.title || url.hostname
            });
          }
        } catch (_) {
          // Ignore malformed citation URLs.
        }
      }
    }
  }

  return [...found.values()];
}

async function openAiRequest(payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8 * 60 * 1000);

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    const body = await response.json();

    if (!response.ok) {
      throw new Error(
        `OpenAI API returned ${response.status}: ${
          JSON.stringify(body.error || body).slice(0, 1200)
        }`
      );
    }

    return body;
  } finally {
    clearTimeout(timeout);
  }
}

async function research(category, excludedUrls) {
  const response = await openAiRequest({
    model: process.env.OPENAI_MODEL || 'gpt-5.5',
    tools: [{ type: 'web_search' }],
    tool_choice: 'required',
    input: [
      {
        role: 'system',
        content:
          'Research a chemistry topic for a student-facing article. Prefer peer-reviewed primary papers and authoritative scientific institutions. Return a concise evidence brief with specific, verifiable findings and caveats. Do not invent facts, papers, authors, dates, numerical results, or URLs. Clearly say when evidence is uncertain. Search the web before answering.'
      },
      {
        role: 'user',
        content:
          `Find a timely, educational chemistry research topic in ${category.name}. ` +
          `Prefer a primary study published within the past 24 months when possible. ` +
          `Provide factual evidence for a concise article and cite the sources used. ` +
          `Do not repeat these primary source URLs or topics: ${excludedUrls.join(', ') || 'none yet'}.`
      }
    ],
    max_output_tokens: 3000
  });

  const brief = getOutputText(response);
  const citations = getCitations(response);

  if (brief.length < 300 || citations.length < 3) {
    throw new Error(`Research needs a usable brief and at least 3 citations; received ${citations.length}.`);
  }

  return { brief, citations };
}

async function writeArticle(category, researchResult) {
  const response = await openAiRequest({
    model: process.env.OPENAI_MODEL || 'gpt-5.5',
    input: [
      {
        role: 'system',
        content:
          'Write a clear, original chemistry research summary in Markdown for CHEMSIQ students. ' +
          'Use only claims supported by the supplied research brief. Do not copy source wording. ' +
          'Do not give operational instructions for hazardous chemistry. State limitations and uncertainty. ' +
          'Every reference URL must be selected exactly from the supplied allowed sources; never invent or alter a URL.'
      },
      {
        role: 'user',
        content: JSON.stringify({
          category: category.name,
          requirements: {
            titleMaxCharacters: 200,
            excerptMaxCharacters: 500,
            bodyMarkdownSections: [
              '## Overview',
              '## Research findings',
              '## Why it matters'
            ],
            referencesMin: 3,
            approximateReadingTimeMinutes: '3 to 5',
            tone: 'accurate, accessible, neutral'
          },
          researchBrief: researchResult.brief,
          allowedSources: researchResult.citations
        })
      }
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'chemsiq_article',
        strict: true,
        schema: ARTICLE_SCHEMA
      }
    },
    max_output_tokens: 3000
  });

  let article;
  try {
    article = JSON.parse(getOutputText(response));
  } catch (error) {
    throw new Error(`Could not parse article response: ${error.message}`);
  }

  validateArticle(article, researchResult.citations);
  return article;
}

function validateArticle(article, allowedSources) {
  if (!article.title || article.title.trim().length > 200) {
    throw new Error('Generated title is empty or exceeds 200 characters.');
  }
  if (!article.excerpt || article.excerpt.trim().length > 500) {
    throw new Error('Generated excerpt is empty or exceeds 500 characters.');
  }
  if (!article.bodyMarkdown || article.bodyMarkdown.trim().length < 500) {
    throw new Error('Generated article body is too short.');
  }
  if (!Array.isArray(article.references) || article.references.length < 3) {
    throw new Error('Generated article has fewer than 3 references.');
  }

  const allowedUrls = new Set(allowedSources.map((source) => source.url));

  for (const reference of article.references) {
    let url;
    try {
      url = new URL(reference.url);
    } catch (_) {
      throw new Error('Generated reference URL is invalid.');
    }

    if (url.protocol !== 'https:' || !allowedUrls.has(url.href)) {
      throw new Error(`Reference did not come from web search: ${reference.url}`);
    }
  }

  if (!article.references.some((ref) => ref.url === article.primarySourceUrl)) {
    throw new Error('Primary source must be one of the cited sources.');
  }
}

function buildContent(article) {
  const sources = article.references
    .map((ref, index) => `${index + 1}. [${ref.title}](${ref.url})`)
    .join('\n');

  return `${article.bodyMarkdown.trim()}\n\n## Sources\n${sources}`;
}

async function claimDailyRun(runs, dateKey, token) {
  await runs.createIndex(
    { runDate: 1 },
    { unique: true, name: 'uniq_daily_article_run_date' }
  );

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
    {
      runDate: dateKey,
      $or: [
        { status: 'failed' },
        { lockExpiresAt: { $lte: now } }
      ]
    },
    {
      $set: {
        status: 'running',
        lockToken: token,
        lockExpiresAt: new Date(now.getTime() + 3 * 60 * 60 * 1000),
        startedAt: now,
        updatedAt: now
      }
    }
  );

  return result.modifiedCount === 1;
}

async function archivePreviousAutomationDrafts(dateKey) {
  const automationIdPattern =
    /^chemsiq-daily-[0-9]{4}-[0-9]{2}-[0-9]{2}(-[0-9]{2})?$/;
  const currentRunPattern = new RegExp(`^chemsiq-daily-${dateKey}(-|$)`);

  const result = await Article.updateMany(
    {
      externalId: {
        $regex: automationIdPattern,
        $not: currentRunPattern
      },
      status: 'draft',
      ingestionStatus: 'pending_review'
    },
    {
      $set: {
        status: 'archived',
        ingestionStatus: 'archived'
      }
    }
  );

  return result.modifiedCount || 0;
}

function estimateReadingTime(content) {
  const words = content.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

async function main() {
  if (Number(process.versions.node.split('.')[0]) < 18) {
    throw new Error('Node.js 18 or newer is required.');
  }

  for (const key of ['MONGODB_URI', 'OPENAI_API_KEY']) {
    if (!process.env[key]) {
      throw new Error(`Missing environment variable: ${key}`);
    }
  }

  const dateKey = getIstDateKey();
  const externalIdPrefix = `chemsiq-daily-${dateKey}`;
  const token = crypto.randomUUID();

  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: 'chempulse',
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    retryWrites: true,
    w: 'majority'
  });

  const runs = mongoose.connection.collection('article_automation_runs');
  let claimed = false;

  try {
    claimed = await claimDailyRun(runs, dateKey, token);

    if (!claimed) {
      console.log(JSON.stringify({
        event: 'daily_article_skipped',
        dateKey,
        reason: 'run already claimed or completed'
      }));
      return;
    }

    const completedArticles = [];
    const usedPrimarySources = new Set();

    for (let slot = 1; slot <= DAILY_ARTICLE_COUNT; slot += 1) {
      const externalId =
        `${externalIdPrefix}-${String(slot).padStart(2, '0')}`;

      const existing = await Article.findOne({ externalId }).lean();

      if (existing) {
        if (existing.canonicalUrl) {
          usedPrimarySources.add(existing.canonicalUrl);
        }

        completedArticles.push({
          articleId: existing._id,
          slot
        });
        continue;
      }

      await runs.updateOne(
        { runDate: dateKey, lockToken: token },
        {
          $set: {
            lockExpiresAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
            updatedAt: new Date()
          }
        }
      );

      const categoryConfig = getCategory(dateKey, slot - 1);
      const category = await Category.findOne({
        _id: categoryConfig.id,
        active: true
      }).lean();

      if (!category) {
        throw new Error(`Category missing or inactive: ${categoryConfig.name}`);
      }

      let generated;
      let accepted = false;
      const excludedUrls = [...usedPrimarySources];

      for (let attempt = 1; attempt <= 3; attempt += 1) {
        const researchResult = await research(categoryConfig, excludedUrls);
        generated = await writeArticle(categoryConfig, researchResult);

        const duplicate = await Article.findOne({
          canonicalUrl: generated.primarySourceUrl
        }).select('_id title').lean();

        if (!duplicate && !usedPrimarySources.has(generated.primarySourceUrl)) {
          accepted = true;
          break;
        }

        excludedUrls.push(generated.primarySourceUrl);
      }

      if (!accepted) {
        throw new Error(`Could not find a new primary source for article ${slot}.`);
      }

      const content = buildContent(generated);
      const baseSlug = slugify(generated.title);
      const slugExists = await Article.exists({ slug: baseSlug });
      const slug = slugExists
        ? `${baseSlug}-${dateKey}-${String(slot).padStart(2, '0')}`
        : baseSlug;

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
        readTimeMinutes: estimateReadingTime(content),
        source: null,
        externalId,
        canonicalUrl: generated.primarySourceUrl,
        attributionText:
          `Research summary based on cited sources. Primary source: ${generated.primarySourceUrl}`,
        license: '',
        ingestedAt: new Date(),
        ingestionStatus: 'approved',
        isDemoData: false
      });

      usedPrimarySources.add(generated.primarySourceUrl);
      completedArticles.push({ articleId: article._id, slot });

      console.log(JSON.stringify({
        event: 'daily_article_published',
        dateKey,
        slot,
        articleId: String(article._id),
        category: categoryConfig.name
      }));
    }

    const archivedCount = await archivePreviousAutomationDrafts(dateKey);

    await runs.updateOne(
      { runDate: dateKey, lockToken: token },
      {
        $set: {
          status: 'completed',
          articleIds: completedArticles.map((item) => item.articleId),
          publishedCount: completedArticles.length,
          archivedPreviousDraftCount: archivedCount,
          completedAt: new Date(),
          updatedAt: new Date()
        },
        $unset: { lockExpiresAt: '' }
      }
    );

    console.log(JSON.stringify({
      event: 'daily_article_batch_completed',
      dateKey,
      publishedCount: completedArticles.length,
      archivedPreviousDraftCount: archivedCount
    }));
  } catch (error) {
    if (claimed) {
      await runs.updateOne(
        { runDate: dateKey, lockToken: token },
        {
          $set: {
            status: 'failed',
            error: String(error.message || error).slice(0, 1500),
            failedAt: new Date(),
            updatedAt: new Date()
          },
          $unset: { lockExpiresAt: '' }
        }
      ).catch(() => {});
    }

    console.error(JSON.stringify({
      event: 'daily_article_failed',
      dateKey,
      error: String(error.stack || error)
    }));
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

main().catch(async (error) => {
  console.error(JSON.stringify({
    event: 'daily_article_fatal',
    error: String(error.stack || error)
  }));
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});