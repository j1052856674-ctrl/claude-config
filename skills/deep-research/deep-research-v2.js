export const meta = {
  name: 'deep-research-v2',
  description: 'Optimized deep research — supports quick/standard/thorough depth modes. Quick: ~15 agents, 10-15min. Standard: ~25 agents. Thorough: ~50+ agents.',
  whenToUse: 'Market research, industry overview, trend analysis, or any multi-source research report. Use depth:quick for data-driven topics, depth:standard for policy/business analysis, depth:thorough for academic/scientific claims.',
  phases: [{"title":"Scope","detail":"Decompose question into search angles"},{"title":"Search","detail":"Parallel web search per angle"},{"title":"Fetch","detail":"Fetch sources, extract claims"},{"title":"Verify","detail":"Cross-check claims (depth-dependent)"},{"title":"Synthesize","detail":"Merge findings, rank by confidence, cite sources"}],
}

// ─── Depth configuration ───
// Parse depth from args: "question | depth:quick"
const ARGS_RAW = (typeof args === "string" && args.trim()) || ""
const DEPTH_SEP = ARGS_RAW.lastIndexOf("| depth:")
const QUESTION = (DEPTH_SEP >= 0 ? ARGS_RAW.slice(0, DEPTH_SEP).trim() : ARGS_RAW)
const DEPTH = DEPTH_SEP >= 0 ? ARGS_RAW.slice(DEPTH_SEP + 8).trim().toLowerCase() : "quick"

const DEPTH_CONFIG = {
  quick:    { votesPerClaim: 1, maxVerify: 8,  maxFetch: 5,  fetchBatchSize: 3, verifyStyle: "cross-reference" },
  standard: { votesPerClaim: 2, maxVerify: 15, maxFetch: 10, fetchBatchSize: 1, verifyStyle: "moderate" },
  thorough: { votesPerClaim: 3, maxVerify: 25, maxFetch: 15, fetchBatchSize: 1, verifyStyle: "adversarial" },
}
const cfg = DEPTH_CONFIG[DEPTH] || DEPTH_CONFIG.quick

// ─── Schemas ───
const SCOPE_SCHEMA = {
  type: "object", required: ["question", "angles", "summary"],
  properties: {
    question: { type: "string" },
    summary: { type: "string" },
    angles: { type: "array", minItems: 3, maxItems: 5, items: {
      type: "object", required: ["label", "query"],
      properties: {
        label: { type: "string" },
        query: { type: "string" },
        rationale: { type: "string" },
      },
    }},
  },
}
const SEARCH_SCHEMA = {
  type: "object", required: ["results"],
  properties: {
    results: { type: "array", maxItems: 5, items: {
      type: "object", required: ["url", "title", "relevance"],
      properties: {
        url: { type: "string" },
        title: { type: "string" },
        snippet: { type: "string" },
        relevance: { enum: ["high", "medium", "low"] },
      },
    }},
  },
}
const EXTRACT_SCHEMA = {
  type: "object", required: ["claims", "sourceQuality"],
  properties: {
    sourceQuality: { enum: ["primary", "secondary", "blog", "forum", "unreliable"] },
    publishDate: { type: "string" },
    claims: { type: "array", maxItems: 4, items: {
      type: "object", required: ["claim", "quote", "importance"],
      properties: {
        claim: { type: "string" },
        quote: { type: "string" },
        importance: { enum: ["central", "supporting", "tangential"] },
      },
    }},
  },
}
const BATCH_EXTRACT_SCHEMA = {
  type: "object", required: ["sources"],
  properties: {
    sources: { type: "array", items: {
      type: "object", required: ["url", "sourceQuality", "claims"],
      properties: {
        url: { type: "string" },
        title: { type: "string" },
        sourceQuality: { enum: ["primary", "secondary", "blog", "forum", "unreliable"] },
        publishDate: { type: "string" },
        claims: { type: "array", maxItems: 4, items: {
          type: "object", required: ["claim", "quote", "importance"],
          properties: {
            claim: { type: "string" },
            quote: { type: "string" },
            importance: { enum: ["central", "supporting", "tangential"] },
          },
        }},
      },
    }},
  },
}
const VERDICT_SCHEMA = {
  type: "object", required: ["refuted", "evidence", "confidence"],
  properties: {
    refuted: { type: "boolean" },
    evidence: { type: "string" },
    confidence: { enum: ["high", "medium", "low"] },
    counterSource: { type: "string" },
  },
}
const REPORT_SCHEMA = {
  type: "object", required: ["summary", "findings", "caveats"],
  properties: {
    summary: { type: "string" },
    findings: { type: "array", items: {
      type: "object", required: ["claim", "confidence", "sources", "evidence"],
      properties: {
        claim: { type: "string" },
        confidence: { enum: ["high", "medium", "low"] },
        sources: { type: "array", items: { type: "string" } },
        evidence: { type: "string" },
        vote: { type: "string" },
      },
    }},
    caveats: { type: "string" },
    openQuestions: { type: "array", items: { type: "string" } },
  },
}

// ─── Phase 0: Scope ───
phase("Scope")
if (!QUESTION) {
  return { error: "No research question provided. Pass it as args: Workflow({name: 'deep-research-v2', args: '<question> | depth:quick'}). Depth options: quick, standard, thorough." }
}
log("Depth: " + DEPTH + " | Q: " + QUESTION.slice(0, 80) + (QUESTION.length > 80 ? "…" : ""))

const scope = await agent(
  "Decompose this research question into complementary search angles.\n\n" +
  "## Question\n" + QUESTION + "\n\n" +
  "## Task\n" +
  "Generate 3-5 distinct web search queries that together cover the question from different angles. Pick angles that suit the question's domain.\n" +
  "Make queries specific enough to surface high-signal results. Avoid redundancy.\n" +
  "Return: the question, a 1-2 sentence decomposition strategy, and the angles.\n\nStructured output only.",
  { label: "scope", schema: SCOPE_SCHEMA }
)
if (!scope) {
  return { error: "Scope agent returned no result." }
}
log("Decomposed into " + scope.angles.length + " angles: " + scope.angles.map(a => a.label).join(", "))

// ─── Dedup state ───
const normURL = u => {
  try {
    const p = new URL(u)
    return (p.hostname.replace(/^www\./, "") + p.pathname.replace(/\/$/, "")).toLowerCase()
  } catch { return u.toLowerCase() }
}
const seen = new Map()
const dupes = []
let fetchSlots = cfg.maxFetch
const relRank = { high: 0, medium: 1, low: 2 }

// ─── Phase 1: Search ───
phase("Search")
const SEARCH_PROMPT = (angle) =>
  "## Web Searcher: " + angle.label + "\n\n" +
  "Research question: \"" + QUESTION + "\"\n\n" +
  "Your angle: **" + angle.label + "** — " + (angle.rationale || "") + "\n" +
  "Search query: `" + angle.query + "`\n\n" +
  "## Task\nUse WebSearch with the query above (or a refined version). Return the top 3-5 most relevant results.\n" +
  "Rank by relevance to the ORIGINAL question. Skip SEO spam/content farms.\n\nStructured output only."

const searchResults = await parallel(
  scope.angles.map(angle => () =>
    agent(SEARCH_PROMPT(angle), {
      label: "search:" + angle.label, phase: "Search", schema: SEARCH_SCHEMA
    }).then(r => {
      if (!r) return null
      log(angle.label + ": " + r.results.length + " results")
      return { angle: angle.label, results: r.results }
    })
  )
).then(results => results.filter(Boolean).map(sr => {
  // Dedup within search results
  const novel = sr.results.filter(r => {
    const key = normURL(r.url)
    if (seen.has(key)) { dupes.push(r.url); return false }
    if (fetchSlots <= 0 && relRank[r.relevance] >= 1) return false
    seen.set(key, sr.angle)
    fetchSlots--
    return true
  })
  log(sr.angle + ": " + novel.length + " novel (kept)")
  return { angle: sr.angle, results: novel }
}))

// ─── Phase 2: Fetch ───
phase("Fetch")
const allUrls = searchResults.flatMap(sr =>
  sr.results.map(r => ({ url: r.url, title: r.title, angle: sr.angle }))
)
log("Fetching " + allUrls.length + " sources (depth=" + DEPTH + ", batchSize=" + cfg.fetchBatchSize + ")")

const FETCH_PROMPT = (source, angle) =>
  "## Source Extractor\n\n" +
  "Research question: \"" + QUESTION + "\"\n\n" +
  "Fetch and extract key claims from this source:\n" +
  "**URL:** " + source.url + "\n**Title:** " + source.title + "\n**Found via:** " + angle + " search\n\n" +
  "## Task\n1. Use WebFetch to retrieve the page content.\n" +
  "2. Assess source quality.\n" +
  "3. Extract 2-4 FALSIFIABLE claims that bear on the research question. Each must be concrete, checkable, with a direct quote.\n" +
  "4. If fetch fails or irrelevant, return claims: [] and sourceQuality: \"unreliable\".\n\nStructured output only."

const BATCH_FETCH_PROMPT = (sources, angle) =>
  "## Batch Source Extractor\n\n" +
  "Research question: \"" + QUESTION + "\"\n\n" +
  "Fetch and extract claims from these " + sources.length + " sources:\n" +
  sources.map(s => "- **" + s.title + "** (" + s.url + ")").join("\n") + "\n\n" +
  "## Task\nFor each source:\n1. Use WebFetch to retrieve the page content.\n" +
  "2. Assess source quality.\n" +
  "3. Extract 2-4 key claims (concrete, checkable, with quotes).\n" +
  "4. If a fetch fails or is irrelevant, set sourceQuality: \"unreliable\" and claims: [].\n\nStructured output only."

// Phase 2: Fetch — quick: batch fetch, standard/thorough: individual fetch
let fetchedSources
if (DEPTH === "quick") {
  const batches = []
  for (let i = 0; i < allUrls.length; i += cfg.fetchBatchSize) {
    batches.push(allUrls.slice(i, i + cfg.fetchBatchSize))
  }
  fetchedSources = await parallel(
    batches.map(batch => () =>
      agent(BATCH_FETCH_PROMPT(batch, batch[0].angle), {
        label: "batch-fetch:" + batch.length,
        phase: "Fetch",
        schema: BATCH_EXTRACT_SCHEMA,
      }).then(r => {
        if (!r) return []
        return r.sources.map(s => ({
          url: s.url, title: s.title || "", angle: batch[0].angle,
          sourceQuality: s.sourceQuality, publishDate: s.publishDate,
          claims: (s.claims || []).map(c => ({ ...c, sourceUrl: s.url, sourceQuality: s.sourceQuality })),
        }))
      }).catch(e => {
        log("batch fetch failed: " + e.message)
        return batch.map(s => ({ url: s.url, title: s.title, angle: s.angle, sourceQuality: "unreliable", claims: [] }))
      })
    )
  ).then(r => r.flat())
} else {
  fetchedSources = await parallel(
    allUrls.map(source => () =>
      agent(FETCH_PROMPT(source, source.angle), {
        label: "fetch:" + source.url.slice(0, 40),
        phase: "Fetch",
        schema: EXTRACT_SCHEMA,
      }).then(ext => {
        if (!ext) return null
        return {
          url: source.url, title: source.title, angle: source.angle,
          sourceQuality: ext.sourceQuality, publishDate: ext.publishDate,
          claims: ext.claims.map(c => ({ ...c, sourceUrl: source.url, sourceQuality: ext.sourceQuality })),
        }
      }).catch(e => {
        log("fetch failed: " + source.url + " — " + (e.message || e))
        return { url: source.url, title: source.title, angle: source.angle, sourceQuality: "unreliable", claims: [] }
      })
    )
  ).then(r => r.filter(Boolean))
}

const allClaims = fetchedSources.flatMap(s => s.claims)
const impRank = { central: 0, supporting: 1, tangential: 2 }
const qualRank = { primary: 0, secondary: 1, blog: 2, forum: 3, unreliable: 4 }

const rankedClaims = [...allClaims]
  .sort((a, b) => (impRank[a.importance] - impRank[b.importance]) || (qualRank[a.sourceQuality] - qualRank[b.sourceQuality]))
  .slice(0, cfg.maxVerify)

log("Fetched " + fetchedSources.length + " sources → " + allClaims.length + " claims → verifying top " + rankedClaims.length)

if (rankedClaims.length === 0) {
  return {
    question: QUESTION,
    depth: DEPTH,
    summary: "No claims extracted. " + fetchedSources.length + " sources fetched.",
    findings: [],
    sources: fetchedSources.map(s => ({ url: s.url, quality: s.sourceQuality })),
    stats: { angles: scope.angles.length, sources: fetchedSources.length, claims: 0, dupes: dupes.length },
  }
}

// ─── Phase 3: Verify ───
phase("Verify")
const V = cfg.votesPerClaim
const REFUTE_NEEDED = DEPTH === "thorough" ? 2 : 1

// Build verify prompt based on depth
const VERIFY_PROMPT_QUICK = (claim) =>
  "## Cross-Reference Check\n\n" +
  "Research question: " + QUESTION + "\n\n" +
  "Claim: \"" + claim.claim + "\"\n" +
  "Source: " + claim.sourceUrl + " (" + claim.sourceQuality + ")\n" +
  "Quote: \"" + claim.quote + "\"\n\n" +
  "## Task\n1. Is the claim supported by the quote, or is it an overreach?\n" +
  "2. Quick WebSearch: does another credible source confirm or contradict this data?\n" +
  "3. Is the source quality sufficient for the claim's strength?\n\n" +
  "refuted=true if: unsupported/contradicted/marketing fluff. refuted=false if well-supported.\n" +
  "Default to refuted=false if uncertain (for market data, assume data is correct unless contradicted).\n\nStructured output only."

const VERIFY_PROMPT_STANDARD = (claim, v) =>
  "## Claim Verifier (vote " + (v + 1) + "/" + V + ")\n\n" +
  "Research question: " + QUESTION + "\n\n" +
  "Claim: \"" + claim.claim + "\"\n" +
  "Source: " + claim.sourceUrl + " (" + claim.sourceQuality + ")\n" +
  "Quote: \"" + claim.quote + "\"\n\n" +
  "## Task\n1. Is the claim actually supported by the quote?\n" +
  "2. WebSearch for contradicting or confirming evidence.\n" +
  "3. Is source quality sufficient? Is it outdated?\n\n" +
  "refuted=true if unsupported/contradicted/outdated/marketing. refuted=false if well-supported.\n" +
  "Default to refuted=false if uncertain.\n\nStructured output only."

const VERIFY_PROMPT_THOROUGH = (claim, v) =>
  "## Adversarial Claim Verifier (voter " + (v + 1) + "/" + V + ")\n\n" +
  "Be SKEPTICAL. Try to REFUTE this claim. ≥" + REFUTE_NEEDED + "/" + V + " refutations kill it.\n\n" +
  "Research question: " + QUESTION + "\n\n" +
  "Claim: \"" + claim.claim + "\"\n" +
  "Source: " + claim.sourceUrl + " (" + claim.sourceQuality + ")\n" +
  "Quote: \"" + claim.quote + "\"\n\n" +
  "## Checklist\n" +
  "1. Is the claim supported by the quote?\n" +
  "2. WebSearch for contradicting evidence.\n" +
  "3. Is source quality sufficient?\n" +
  "4. Is it outdated?\n" +
  "5. Is this marketing/press release/cherry-picked?\n\n" +
  "refuted=true if: unsupported/contradicted/low-quality/outdated/marketing.\n" +
  "refuted=false ONLY if well-supported, current, source matches claim strength.\n" +
  "Default to refuted=true if uncertain.\n\nStructured output only."

const makeVerifyPrompt = DEPTH === "quick"
  ? (claim, v) => VERIFY_PROMPT_QUICK(claim)
  : DEPTH === "standard"
  ? (claim, v) => VERIFY_PROMPT_STANDARD(claim, v)
  : (claim, v) => VERIFY_PROMPT_THOROUGH(claim, v)

const voted = (await parallel(
  rankedClaims.map(claim => () =>
    parallel(
      Array.from({ length: V }, (_, v) => () =>
        agent(makeVerifyPrompt(claim, v), {
          label: "v" + v + ":" + claim.claim.slice(0, 35),
          phase: "Verify",
          schema: VERDICT_SCHEMA,
        })
      )
    ).then(verdicts => {
      const valid = verdicts.filter(Boolean)
      const refuted = valid.filter(v => v.refuted).length
      const abstained = V - valid.length
      const survives = DEPTH === "quick"
        ? (valid.length >= 1 && refuted === 0) // Quick: survive if not refuted
        : (valid.length >= REFUTE_NEEDED && refuted < REFUTE_NEEDED) // Standard/Thorough: need quorum
      log("\"" + claim.claim.slice(0, 50) + "…\": " + (valid.length - refuted) + "-" + refuted + (abstained > 0 ? " (" + abstained + " abst)" : "") + " " + (survives ? "✓" : "✗"))
      return { ...claim, verdicts: valid, refutedVotes: refuted, survives }
    })
  )
)).filter(Boolean)

const confirmed = voted.filter(c => c.survives)
const killed = voted.filter(c => !c.survives)
log("Verify: " + voted.length + " claims → " + confirmed.length + " confirmed, " + killed.length + " killed")

if (confirmed.length === 0) {
  return {
    question: QUESTION, depth: DEPTH,
    summary: "All " + voted.length + " claims refuted. Research inconclusive.",
    findings: [],
    refuted: killed.map(c => ({ claim: c.claim, vote: (c.verdicts.length - c.refutedVotes) + "-" + c.refutedVotes, source: c.sourceUrl })),
    sources: fetchedSources.map(s => ({ url: s.url, quality: s.sourceQuality, claimCount: s.claims.length })),
    stats: { angles: scope.angles.length, sources: fetchedSources.length, claims: allClaims.length, verified: voted.length, confirmed: 0, killed: killed.length, depth: DEPTH },
  }
}

// ─── Phase 4: Synthesize ───
phase("Synthesize")
const confRank = { high: 0, medium: 1, low: 2 }
const block = confirmed.map((c, i) => {
  const best = c.verdicts.filter(v => !v.refuted).sort((a, b) => confRank[a.confidence] - confRank[b.confidence])[0]
  return "### [" + i + "] " + c.claim + "\n" +
    "Vote: " + (c.verdicts.length - c.refutedVotes) + "-" + c.refutedVotes + " · Source: " + c.sourceUrl + " (" + c.sourceQuality + ")\n" +
    "Quote: \"" + c.quote + "\"\nEvidence: " + (best ? best.evidence : "N/A") + "\n"
}).join("\n")

const report = await agent(
  "## Synthesis: research report (depth=" + DEPTH + ")\n\n" +
  "**Question:** " + QUESTION + "\n\n" +
  confirmed.length + " claims survived verification. Merge semantic duplicates and synthesize.\n\n" +
  "## Confirmed claims\n" + block + "\n\n" +
  "## Instructions\n" +
  "1. Merge claims that say the same thing — combine their sources.\n" +
  "2. Group into coherent findings addressing the research question.\n" +
  "3. Assign confidence: high (multiple sources, unanimous), medium (secondary/split), low (single source).\n" +
  "4. Write a 3-5 sentence executive summary.\n" +
  "5. Note caveats and uncertainties.\n" +
  "6. List 2-4 open questions.\n\nStructured output only.",
  { label: "synthesize", schema: REPORT_SCHEMA }
)

if (!report) {
  return {
    question: QUESTION, depth: DEPTH,
    summary: "Synthesis failed — returning " + confirmed.length + " verified claims raw.",
    findings: confirmed.map(c => ({ claim: c.claim, confidence: "medium", sources: [c.sourceUrl], evidence: c.quote, vote: (c.verdicts.length - c.refutedVotes) + "-" + c.refutedVotes })),
    caveats: "Synthesis agent was skipped or errored.",
    sources: fetchedSources.map(s => ({ url: s.url, quality: s.sourceQuality })),
    stats: { angles: scope.angles.length, sources: fetchedSources.length, claims: allClaims.length, verified: voted.length, confirmed: confirmed.length, depth: DEPTH },
  }
}

const agentEstimate = 1 + scope.angles.length + (DEPTH === "quick" ? Math.ceil(allUrls.length / cfg.fetchBatchSize) : allUrls.length) + (rankedClaims.length * V) + 1

return {
  question: QUESTION,
  depth: DEPTH,
  ...report,
  refuted: killed.map(c => ({ claim: c.claim, vote: (c.verdicts.length - c.refutedVotes) + "-" + c.refutedVotes, source: c.sourceUrl })),
  sources: fetchedSources.map(s => ({ url: s.url, quality: s.sourceQuality, angle: s.angle, claimCount: s.claims.length })),
  stats: {
    angles: scope.angles.length,
    sourcesFetched: fetchedSources.length,
    claimsExtracted: allClaims.length,
    claimsVerified: voted.length,
    confirmed: confirmed.length,
    killed: killed.length,
    afterSynthesis: report.findings.length,
    urlDupes: dupes.length,
    depth: DEPTH,
    agentCalls: agentEstimate,
  },
}