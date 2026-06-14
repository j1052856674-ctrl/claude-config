// ═══════════════════════════════════════════════════════════════════════════
// deep-research v3 — Authoritative Source Routing + Playwright Extraction
// ═══════════════════════════════════════════════════════════════════════════
//
// v3 核心变化（vs v2）:
//   v2: WebSearch → WebFetch → LLM Adversarial Verify → Synthesize
//   v3: Scope+Domain → Source Route → Playwright Search → Playwright Extract
//        → Tiered Cross-reference → Synthesize
//
// 关键设计决策:
//   1. WebFetch 全量被企业环境封禁 → 全部用 Playwright 替代
//   2. 泛搜改为限定权威源站内搜索 → 降低噪音、提升信号密度
//   3. LLM 对抗投票改为源层级交叉验证 → 减少 agent 调用、提升可复现性
//   4. 新增 Phase 1 (Route) 按领域自动匹配源 → 避免全源轰炸
//
// Playwright 调用模式：
//   - 编写独立 .mjs 脚本（import { chromium } from 'playwright'）
//   - agent 内通过 Bash 工具调用：Bash('node script.mjs ''{"url":"..."}''')
//   - 脚本接收 JSON 参数，返回 JSON 结果
//   - MCP 工具在 subagent 中可能不可用，因此走 Bash + node 路径
//   - 参考已有测试: test-playwright-v2.mjs（同目录）
//
// 深度分档影响 (v3 调整):
//   quick:    仅 L1 源，max_sources=3，简单交叉对照
//   standard: L1+L2 源，max_sources=5，L1→L2 对照验证
//   thorough: L1+L2+L3 源，max_sources=7，含登录态可选源，三层对照
// ═══════════════════════════════════════════════════════════════════════════

export const meta = {
  name: 'deep-research-v3',
  description: 'Authoritative source routing with Playwright extraction and tiered cross-reference. Replaces v2 WebSearch/WebFetch/LLM-verify with domain-routed source selection, Playwright-based structured extraction, and source-tier cross-referencing.',
  whenToUse: 'Deep multi-source research requiring authoritative sources. Use depth:quick for tech/market overviews, depth:standard for policy/business analysis, depth:thorough for academic/scientific/medical claims.',
  phases: [
    { title: 'Scope',  detail: 'Decompose question + classify domain' },
    { title: 'Route',  detail: 'Match domain->authoritative source list (v3 added)' },
    { title: 'Search', detail: 'Playwright in-site search per source + WebSearch supplement' },
    { title: 'Extract', detail: 'Playwright fetch + structured extraction per source type' },
    { title: 'Cross-reference', detail: 'Tier-based cross-check (replaces v2 Verify)' },
    { title: 'Synthesize', detail: 'Merge findings, rank by source tier + authority metrics' },
  ],
}

// ═══════════════════════════════════════════════════════════════════════════
// 0. Parse args & depth config
// ═══════════════════════════════════════════════════════════════════════════
const ARGS_RAW = (typeof args === 'string' && args.trim()) || ''
const DEPTH_SEP = ARGS_RAW.lastIndexOf('| depth:')
const QUESTION = (DEPTH_SEP >= 0 ? ARGS_RAW.slice(0, DEPTH_SEP).trim() : ARGS_RAW)
const DEPTH = DEPTH_SEP >= 0
  ? ARGS_RAW.slice(DEPTH_SEP + 8).trim().toLowerCase()
  : 'quick'

// v3 深度配置：max_sources 控制每个 tier 选多少源
const DEPTH_CONFIG = {
  quick: {
    tiers: ['L1'],
    maxSources: 3,
    maxExtract: 8,
    crossRefMode: 'simple',
  },
  standard: {
    tiers: ['L1', 'L2'],
    maxSources: 5,
    maxExtract: 15,
    crossRefMode: 'moderate',
  },
  thorough: {
    tiers: ['L1', 'L2', 'L3'],
    maxSources: 7,
    maxExtract: 25,
    crossRefMode: 'thorough',
  },
}
const cfg = DEPTH_CONFIG[DEPTH] || DEPTH_CONFIG.quick

// ═══════════════════════════════════════════════════════════════════════════
// 1. Source routing config (derived from sources-v3.json -- canonical source)
// ═══════════════════════════════════════════════════════════════════════════
// NOTE: 以下为 sources-v3.json 的嵌入精简版。权威源配置文件为同目录的 sources-v3.json。
// 如果两者不一致，以 sources-v3.json 为准。此处嵌入是为了 workflow 自包含运行。
const SOURCE_ROUTING = {
  rules: [
    {
      domain: 'tech_framework', lang: 'any',
      L1: ['github','pypi','npm','crates_io','dockerhub'],
      L2: ['stackoverflow','official_docs','zhihu_tech','juejin','csdn','medium_tech'],
      L3: ['hackernews','reddit_programming','producthunt','bilibili_tech','twitter_tech'],
    },
    {
      domain: 'academic_research', lang: 'any',
      L1: ['arxiv','semantic_scholar','paperswithcode','google_scholar','pubmed'],
      L2: ['openreview','dl_acm','ieee','zhihu_academic','researchgate'],
      L3: ['huggingface_papers','twitter_academic'],
    },
    {
      domain: 'market_industry', lang: 'zh',
      L1: ['stats_gov_cn','worldbank','fred'],
      L2: ['36kr','huxiu','mckinsey','statista','gartner','cbinsights','crunchbase','bloomberg','reuters'],
      L3: ['linkedin_company','maimai','glassdoor'],
    },
    {
      domain: 'market_industry', lang: 'en',
      L1: ['sec_edgar','worldbank','fred','census'],
      L2: ['gartner','statista','mckinsey','bloomberg','reuters'],
      L3: ['linkedin_company','glassdoor'],
    },
    {
      domain: 'consumer_product', lang: 'zh',
      L1: ['official_product_page','amazon_cn','jd'],
      L2: ['sspai','rtings','dxomark','g2','trustpilot'],
      L3: ['xiaohongshu','zhihu_shopping','douban','bilibili_review','weibo','reddit_reviews','youtube_review'],
    },
    {
      domain: 'consumer_product', lang: 'en',
      L1: ['official_product_page','amazon'],
      L2: ['rtings','dxomark','g2','trustpilot'],
      L3: ['reddit_reviews','youtube_review','twitter'],
    },
    {
      domain: 'career_job', lang: 'zh',
      L1: ['linkedin','boss_zhipin','lagou'],
      L2: ['maimai','glassdoor','levels_fyi','zhihu_career'],
      L3: ['reddit_cscareer','xiaohongshu_career'],
    },
    {
      domain: 'healthcare_medical', lang: 'any',
      L1: ['pubmed','fda','who','cochrane','clinicaltrials'],
      L2: ['mayo_clinic','uptodate','msd_manual'],
      L3: [],
    },
    {
      domain: 'finance_investment', lang: 'any',
      L1: ['sec_edgar','yahoo_finance','fred','coingecko'],
      L2: ['bloomberg','reuters','morningstar'],
      L3: ['reddit_investing','xueqiu'],
    },
    {
      domain: 'tech_trends', lang: 'any',
      L1: ['github_trending','arxiv','stackoverflow_tags'],
      L2: ['thoughtworks_radar','stateofjs','stackoverflow_survey','36kr'],
      L3: ['hackernews','reddit_programming','zhihu_tech'],
    },
    {
      domain: 'regulation_policy', lang: 'zh',
      L1: ['gov_cn','europa','congress','wto','pkulaw'],
      L2: ['iapp','lawfare'],
      L3: [],
    },
    {
      domain: 'security_vulnerability', lang: 'any',
      L1: ['nvd','cve','github_advisories'],
      L2: ['exploit_db','mitre_attack','snyk'],
      L3: ['twitter_security'],
    },
    {
      domain: 'real_estate', lang: 'zh',
      L1: ['stats_gov_cn','zillow','beike'],
      L2: ['zhihu_realestate'],
      L3: ['xiaohongshu_home','douban_group'],
    },
  ],
  default: {
    L1: ['wikipedia'],
    L2: ['websearch_broad'],
    L3: [],
  },
}

// ─── Source metadata lookup (from sources-v3.json domains section) ───
// TODO: 完整源元数据在 sources-v3.json，此处为简化映射。
//       正式版应考虑在运行时读取 sources-v3.json 或将其编译为内联常量。
const SOURCE_META = {
  // ─── L1 开源/包管理 ───
  github:               { site: 'github.com',                access: 'playwright',  login: false,   metric: 'stars+forks+contributors+release_freq' },
  pypi:                 { site: 'pypi.org',                  access: 'playwright',  login: false,   metric: 'downloads+releases' },
  npm:                  { site: 'npmjs.com',                 access: 'playwright',  login: false,   metric: 'weekly_downloads' },
  crates_io:            { site: 'crates.io',                 access: 'playwright',  login: false,   metric: 'downloads' },
  dockerhub:            { site: 'hub.docker.com',            access: 'playwright',  login: false,   metric: 'pulls+stars' },
  // ─── L1 学术 ───
  arxiv:                { site: 'arxiv.org',                 access: 'playwright',  login: false,   metric: 'citations+recency' },
  semantic_scholar:     { site: 'semanticscholar.org',       access: 'playwright',  login: false,   metric: 'citations+influential_citations' },
  paperswithcode:       { site: 'paperswithcode.com',        access: 'playwright',  login: false,   metric: 'benchmark_rank+stars' },
  google_scholar:       { site: 'scholar.google.com',        access: 'playwright',  login: false,   metric: 'citations', note: 'anti-bot strong, rate-limit needed' },
  pubmed:               { site: 'pubmed.ncbi.nlm.nih.gov',   access: 'playwright',  login: false,   metric: 'citations+journal_IF' },
  // ─── L1 市场/金融 ───
  sec_edgar:            { site: 'sec.gov/edgar',             access: 'playwright',  login: false,   metric: '10K_10Q' },
  stats_gov_cn:         { site: 'data.stats.gov.cn',         access: 'playwright',  login: false,   metric: 'official_stat' },
  worldbank:            { site: 'data.worldbank.org',        access: 'playwright',  login: false,   metric: 'official_stat' },
  census:               { site: 'census.gov',                access: 'playwright',  login: false,   metric: 'official_stat' },
  fred:                 { site: 'fred.stlouisfed.org',       access: 'playwright',  login: false,   metric: 'economic_indicator' },
  yahoo_finance:        { site: 'finance.yahoo.com',         access: 'playwright',  login: false,   metric: 'price+volume+financials' },
  coingecko:            { site: 'coingecko.com',             access: 'playwright',  login: false,   metric: 'price+volume+marketcap' },
  // ─── L1 其他 ───
  wikipedia:            { site: 'wikipedia.org',             access: 'playwright',  login: false,   metric: 'citation_count' },
  official_product_page:{ site: 'official_product_page',    access: 'playwright',  login: false,   metric: 'specs' },
  amazon:               { site: 'amazon.com',                access: 'playwright',  login: false,   metric: 'rating+review_count' },
  amazon_cn:            { site: 'amazon.cn',                 access: 'playwright',  login: false,   metric: 'rating+review_count' },
  jd:                   { site: 'jd.com',                    access: 'playwright',  login: false,   metric: 'haoPingLv+reviewCount' },
  linkedin:             { site: 'linkedin.com',              access: 'playwright',  login: 'partial', metric: 'employee_count+openings' },
  boss_zhipin:          { site: 'zhipin.com',                access: 'playwright',  login: false,   metric: 'salaryRange+JD' },
  lagou:                { site: 'lagou.com',                 access: 'playwright',  login: false,   metric: 'salary+JD' },
  indeed:               { site: 'indeed.com',                access: 'playwright',  login: false,   metric: 'salary+postings' },
  github_trending:      { site: 'github.com/trending',       access: 'playwright',  login: false,   metric: 'stars_growth' },
  stackoverflow_tags:   { site: 'stackoverflow.com/tags',    access: 'playwright',  login: false,   metric: 'question_volume_trend' },
  nvd:                  { site: 'nvd.nist.gov',              access: 'playwright',  login: false,   metric: 'CVSS' },
  cve:                  { site: 'cve.org',                   access: 'playwright',  login: false,   metric: 'CVE' },
  github_advisories:    { site: 'github.com/advisories',     access: 'playwright',  login: false,   metric: 'severity' },
  gov_cn:               { site: 'gov.cn',                    access: 'playwright',  login: false,   metric: 'official' },
  europa:               { site: 'europa.eu',                 access: 'playwright',  login: false,   metric: 'official' },
  congress:             { site: 'congress.gov',              access: 'playwright',  login: false,   metric: 'official' },
  wto:                  { site: 'wto.org',                   access: 'playwright',  login: false,   metric: 'official' },
  pkulaw:               { site: 'pkulaw.com',                access: 'playwright',  login: 'partial', metric: 'legal_database' },
  fda:                  { site: 'fda.gov',                   access: 'playwright',  login: false,   metric: 'approval+warning' },
  who:                  { site: 'who.int',                   access: 'playwright',  login: false,   metric: 'guideline+stat' },
  cochrane:             { site: 'cochrane.org',              access: 'playwright',  login: false,   metric: 'systematic_review' },
  clinicaltrials:       { site: 'clinicaltrials.gov',        access: 'playwright',  login: false,   metric: 'phase+results' },
  zillow:               { site: 'zillow.com',                access: 'playwright',  login: false,   metric: 'price_history+estimate' },
  beike:                { site: 'ke.com',                    access: 'playwright',  login: false,   metric: 'transactionPrice+listingPrice' },
  // ─── L2 权威/专业 ───
  stackoverflow:        { site: 'stackoverflow.com',         access: 'playwright+websearch', login: false, metric: 'question_count+answer_rate' },
  official_docs:        { site: 'official_docs',             access: 'playwright',  login: false,   metric: 'official' },
  zhihu_tech:           { site: 'zhihu.com',                 access: 'playwright',  login: 'partial', metric: 'upvotes+comments+verified' },
  juejin:               { site: 'juejin.cn',                 access: 'playwright',  login: false,   metric: 'likes+saves' },
  csdn:                 { site: 'csdn.net',                  access: 'playwright',  login: false,   metric: 'views+comments' },
  medium_tech:          { site: 'medium.com/tag/technology', access: 'playwright',  login: 'partial', metric: 'claps+responses' },
  openreview:           { site: 'openreview.net',            access: 'playwright',  login: false,   metric: 'peer_review_score' },
  dl_acm:               { site: 'dl.acm.org',                access: 'playwright',  login: false,   metric: 'citations' },
  ieee:                 { site: 'ieeexplore.ieee.org',       access: 'playwright',  login: false,   metric: 'citations' },
  zhihu_academic:       { site: 'zhihu.com',                 access: 'playwright',  login: 'partial', metric: 'upvotes+verified' },
  researchgate:         { site: 'researchgate.net',          access: 'playwright',  login: 'partial', metric: 'citations+reads' },
  '36kr':               { site: '36kr.com',                  access: 'playwright',  login: false,   metric: 'article_depth+author_cred' },
  huxiu:                { site: 'huxiu.com',                 access: 'playwright',  login: false,   metric: 'article_depth' },
  mckinsey:             { site: 'mckinsey.com',              access: 'playwright',  login: false,   metric: 'report' },
  statista:             { site: 'statista.com',              access: 'playwright',  login: 'partial', metric: 'statistic' },
  gartner:              { site: 'gartner.com',               access: 'playwright',  login: 'partial', metric: 'magic_quadrant' },
  cbinsights:           { site: 'cbinsights.com',            access: 'playwright',  login: 'partial', metric: 'market_map' },
  crunchbase:           { site: 'crunchbase.com',            access: 'playwright',  login: 'partial', metric: 'funding+employees' },
  bloomberg:            { site: 'bloomberg.com',             access: 'playwright',  login: 'partial', metric: 'news+data' },
  reuters:              { site: 'reuters.com',               access: 'playwright',  login: false,   metric: 'news' },
  sspai:                { site: 'sspai.com',                 access: 'playwright',  login: false,   metric: 'saves+comments' },
  rtings:               { site: 'rtings.com',                access: 'playwright',  login: false,   metric: 'test_score' },
  dxomark:              { site: 'dxomark.com',               access: 'playwright',  login: false,   metric: 'score' },
  g2:                   { site: 'g2.com',                    access: 'playwright',  login: false,   metric: 'rating+review_count' },
  trustpilot:           { site: 'trustpilot.com',            access: 'playwright',  login: false,   metric: 'rating+review_count' },
  maimai:               { site: 'maimai.cn',                 access: 'playwright',  login: true,    metric: 'employeeReview+salaryLeak', note: 'strong login required' },
  glassdoor:            { site: 'glassdoor.com',             access: 'playwright',  login: 'partial', metric: 'reviews+salary' },
  levels_fyi:           { site: 'levels.fyi',                access: 'playwright',  login: false,   metric: 'salary_bands' },
  zhihu_career:         { site: 'zhihu.com',                 access: 'playwright',  login: 'partial', metric: 'upvotes+comments' },
  mayo_clinic:          { site: 'mayoclinic.org',            access: 'playwright',  login: false,   metric: 'expert_review' },
  uptodate:             { site: 'uptodate.com',              access: 'playwright',  login: true,    metric: 'clinical_evidence', note: 'paywalled' },
  msd_manual:           { site: 'msdmanuals.com',            access: 'playwright',  login: false,   metric: 'medical_reference' },
  morningstar:          { site: 'morningstar.com',           access: 'playwright',  login: 'partial', metric: 'fund_rating' },
  thoughtworks_radar:   { site: 'thoughtworks.com/radar',    access: 'playwright',  login: false,   metric: 'adoption_ring' },
  stateofjs:            { site: 'stateofjs.com',             access: 'playwright',  login: false,   metric: 'usage+retention' },
  stackoverflow_survey: { site: 'survey.stackoverflow.co',   access: 'playwright',  login: false,   metric: 'usage_share' },
  exploit_db:           { site: 'exploit-db.com',            access: 'playwright',  login: false,   metric: 'verified' },
  mitre_attack:         { site: 'attack.mitre.org',          access: 'playwright',  login: false,   metric: 'technique' },
  snyk:                 { site: 'snyk.io',                   access: 'playwright',  login: false,   metric: 'vulnerability+fix' },
  iapp:                 { site: 'iapp.org',                  access: 'playwright',  login: false,   metric: 'expert_analysis' },
  lawfare:              { site: 'lawfaremedia.org',          access: 'playwright',  login: false,   metric: 'legal_analysis' },
  zhihu_realestate:     { site: 'zhihu.com',                 access: 'playwright',  login: 'partial', metric: 'upvotes+verified' },
  // ─── L3 社媒/社区 ───
  hackernews:           { site: 'news.ycombinator.com',      access: 'playwright+websearch', login: false, metric: 'points+comments' },
  reddit_programming:   { site: 'reddit.com/r/programming',  access: 'playwright+websearch', login: false, metric: 'upvotes+comments' },
  producthunt:          { site: 'producthunt.com',           access: 'playwright',  login: false,   metric: 'upvotes+reviews' },
  bilibili_tech:        { site: 'bilibili.com',              access: 'playwright',  login: false,   metric: 'views+danmaku+sanlian' },
  twitter_tech:         { site: 'twitter.com',               access: 'playwright+websearch', login: 'partial', metric: 'likes+retweets+verified' },
  twitter_academic:     { site: 'twitter.com',               access: 'playwright+websearch', login: 'partial', metric: 'retweets+verified' },
  twitter_security:     { site: 'twitter.com',               access: 'playwright+websearch', login: 'partial', metric: 'researcher_verified' },
  huggingface_papers:   { site: 'huggingface.co/papers',     access: 'playwright',  login: false,   metric: 'likes+discussions' },
  xiaohongshu:          { site: 'xiaohongshu.com',           access: 'playwright',  login: true,    metric: 'likes+saves+comments', note: 'strong login+anti-bot' },
  zhihu_shopping:       { site: 'zhihu.com',                 access: 'playwright',  login: 'partial', metric: 'upvotes+comments' },
  douban:               { site: 'douban.com',                access: 'playwright',  login: false,   metric: 'rating+reviewCount' },
  bilibili_review:      { site: 'bilibili.com',              access: 'playwright',  login: false,   metric: 'views+danmaku+sanlian' },
  weibo:                { site: 'weibo.com',                 access: 'playwright',  login: 'partial', metric: 'reposts+comments+likes' },
  reddit_reviews:       { site: 'reddit.com',                access: 'playwright+websearch', login: false, metric: 'upvotes+comments' },
  youtube_review:       { site: 'youtube.com',               access: 'playwright',  login: false,   metric: 'views+likes' },
  reddit_cscareer:      { site: 'reddit.com/r/cscareerquestions', access: 'playwright+websearch', login: false, metric: 'upvotes' },
  xiaohongshu_career:   { site: 'xiaohongshu.com',           access: 'playwright',  login: true,    metric: 'likes+saves', note: 'strong login' },
  reddit_investing:     { site: 'reddit.com/r/investing',    access: 'playwright+websearch', login: false, metric: 'upvotes' },
  xueqiu:               { site: 'xueqiu.com',                access: 'playwright',  login: 'partial', metric: 'follows+discussions' },
  xiaohongshu_home:     { site: 'xiaohongshu.com',           access: 'playwright',  login: true,    metric: 'likes+saves', note: 'strong login' },
  douban_group:         { site: 'douban.com/group',          access: 'playwright',  login: false,   metric: 'discussionCount' },
  linkedin_company:     { site: 'linkedin.com',              access: 'playwright',  login: 'partial', metric: 'employee_count+growth' },
  websearch_broad:      { site: 'websearch',                 access: 'websearch',   login: false,   metric: 'none', note: 'broad search discovery only, no body extraction' },
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. Domain classification keywords (from sources-v3.json domains section)
// ═══════════════════════════════════════════════════════════════════════════
const DOMAIN_KEYWORDS = {
  tech_framework:       ['framework','library','SDK','language','comparison','alternative','open source'],
  academic_research:    ['paper','research','state of the art','survey','SOTA','literature','academic'],
  market_industry:      ['market','industry','size','share','trend','revenue','growth','funding'],
  consumer_product:     ['product','buy','recommend','review','best','value'],
  career_job:           ['job','salary','interview','company','career','offer'],
  healthcare_medical:   ['drug','disease','treatment','clinical','health','symptom','vaccine'],
  finance_investment:   ['stock','investment','fund','ETF','bond','crypto','IPO','earnings'],
  tech_trends:          ['trend','evolution','future','landscape','ecosystem','roadmap'],
  regulation_policy:    ['regulation','policy','compliance','law','GDPR','standard'],
  security_vulnerability: ['vulnerability','CVE','security','attack','exploit','patch'],
  real_estate:          ['housing','real estate','rental','mortgage','location'],
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. Schemas
// ═══════════════════════════════════════════════════════════════════════════

// Phase 0: Scope -- v2 SCOPE_SCHEMA + domain classification
const SCOPE_SCHEMA = {
  type: 'object', required: ['question', 'angles', 'domain', 'lang', 'summary'],
  properties: {
    question: { type: 'string' },
    summary: { type: 'string', description: '1-2 sentence decomposition strategy' },
    domain: {
      type: 'string',
      enum: Object.keys(DOMAIN_KEYWORDS),
      description: 'Research domain classification -- determines Phase 1 source routing',
    },
    lang: {
      type: 'string',
      enum: ['zh', 'en', 'any'],
      description: 'Primary language of research -- affects Chinese vs English source selection',
    },
    angles: {
      type: 'array', minItems: 3, maxItems: 5,
      items: {
        type: 'object', required: ['label', 'query', 'rationale'],
        properties: {
          label: { type: 'string' },
          query: { type: 'string' },
          rationale: { type: 'string' },
        },
      },
    },
  },
}

// Phase 1: Route -- outputs selected source list
const ROUTE_SCHEMA = {
  type: 'object', required: ['domain', 'lang', 'selectedSources'],
  properties: {
    domain: { type: 'string' },
    lang: { type: 'string' },
    selectedSources: {
      type: 'array', minItems: 1, maxItems: 10,
      items: {
        type: 'object', required: ['id', 'site', 'tier', 'access', 'login_required', 'metric'],
        properties: {
          id: { type: 'string' },
          site: { type: 'string' },
          tier: { enum: ['L1', 'L2', 'L3'] },
          access: { enum: ['playwright', 'websearch', 'playwright+websearch'] },
          login_required: { enum: ['false', 'partial', 'true'] },
          metric: { type: 'string' },
          skip_reason: { type: 'string' },
        },
      },
    },
    skippedSources: {
      type: 'array',
      items: {
        type: 'object', required: ['id', 'reason'],
        properties: { id: { type: 'string' }, reason: { type: 'string' } },
      },
    },
  },
}

// Phase 2: Search -- per-source search results
const SEARCH_RESULT_SCHEMA = {
  type: 'object', required: ['sourceId', 'results'],
  properties: {
    sourceId: { type: 'string' },
    searchUrl: { type: 'string' },
    accessMethod: { enum: ['playwright', 'websearch', 'playwright+websearch'] },
    results: {
      type: 'array', maxItems: 8,
      items: {
        type: 'object', required: ['url', 'title', 'relevance'],
        properties: {
          url: { type: 'string' },
          title: { type: 'string' },
          snippet: { type: 'string' },
          relevance: { enum: ['high', 'medium', 'low'] },
          previewMetrics: {
            type: 'object',
            description: 'Quick metrics visible on search results page (stars, downloads, citations, etc.)',
          },
        },
      },
    },
    errors: { type: 'array', items: { type: 'string' } },
  },
}

// Phase 3: Extract -- structured extraction per URL
const EXTRACT_SCHEMA = {
  type: 'object', required: ['url', 'sourceId', 'tier', 'extractQuality'],
  properties: {
    url: { type: 'string' },
    sourceId: { type: 'string' },
    tier: { enum: ['L1', 'L2', 'L3'] },
    sourceQuality: { enum: ['primary', 'secondary', 'blog', 'forum', 'ugc', 'unreliable'] },
    publishDate: { type: 'string' },
    extractQuality: {
      enum: ['full', 'partial', 'header_only', 'failed', 'login_required', 'blocked'],
      description: 'full=complete body extraction, partial=partial extraction, header_only=metadata only, failed=network/parse error, login_required=login wall, blocked=anti-bot block',
    },
    metrics: {
      type: 'object',
      description: 'Authority metrics specific to source type. See authority_metrics in sources-v3.json for weights.',
      properties: {
        stars: { type: 'number' },
        forks: { type: 'number' },
        contributors: { type: 'number' },
        last_commit: { type: 'string' },
        release_frequency: { type: 'string' },
        downloads: { type: 'number' },
        license: { type: 'string' },
        language: { type: 'string' },
        citations: { type: 'number' },
        influential_citations: { type: 'number' },
        venue: { type: 'string' },
        rating: { type: 'number' },
        review_count: { type: 'number' },
        upvotes: { type: 'number' },
        likes: { type: 'number' },
        comments: { type: 'number' },
        points: { type: 'number' },
        retweets: { type: 'number' },
        verified: { type: 'boolean' },
        followers: { type: 'number' },
        revenue: { type: 'string' },
        funding_total: { type: 'string' },
        employee_count: { type: 'number' },
        market_share: { type: 'string' },
      },
    },
    claims: {
      type: 'array', maxItems: 5,
      items: {
        type: 'object', required: ['claim', 'quote', 'claimType', 'importance'],
        properties: {
          claim: { type: 'string' },
          quote: { type: 'string', description: 'Direct quote or data excerpt from source supporting the claim' },
          claimType: {
            enum: ['factual_data', 'expert_opinion', 'user_experience', 'market_signal', 'official_statement'],
          },
          importance: { enum: ['central', 'supporting', 'tangential'] },
        },
      },
    },
    errors: { type: 'array', items: { type: 'string' } },
  },
}

// Phase 4: Cross-reference -- tier-based claim validation (replaces v2 Verify)
const CROSS_REF_SCHEMA = {
  type: 'object', required: ['validatedClaims', 'disputes'],
  properties: {
    validatedClaims: {
      type: 'array',
      items: {
        type: 'object', required: ['claim', 'confidence', 'supportingSources', 'conflictingSources', 'sourceTier'],
        properties: {
          claim: { type: 'string' },
          confidence: { enum: ['high', 'medium', 'low'] },
          sourceTier: { enum: ['L1', 'L2', 'L3'], description: 'Highest tier among supporting sources' },
          supportingSources: {
            type: 'array',
            items: {
              type: 'object', required: ['sourceId', 'url', 'tier'],
              properties: {
                sourceId: { type: 'string' },
                url: { type: 'string' },
                tier: { enum: ['L1', 'L2', 'L3'] },
                quote: { type: 'string' },
                metrics: { type: 'object' },
              },
            },
          },
          conflictingSources: {
            type: 'array',
            items: {
              type: 'object', required: ['sourceId', 'url', 'tier', 'conflictDescription'],
              properties: {
                sourceId: { type: 'string' },
                url: { type: 'string' },
                tier: { enum: ['L1', 'L2', 'L3'] },
                conflictDescription: { type: 'string' },
              },
            },
          },
        },
      },
    },
    disputes: {
      type: 'array',
      items: {
        type: 'object', required: ['topic', 'positions', 'resolution'],
        properties: {
          topic: { type: 'string' },
          positions: { type: 'array', items: { type: 'string' } },
          resolution: {
            enum: ['L1_consensus', 'majority_L1', 'split_decision', 'unresolved', 'insufficient_data'],
          },
        },
      },
    },
  },
}

// Phase 5: Synthesize -- enhanced report
const REPORT_SCHEMA = {
  type: 'object', required: ['summary', 'findings', 'caveats', 'sourceCoverage'],
  properties: {
    summary: { type: 'string', description: '3-5 sentence executive summary' },
    findings: {
      type: 'array',
      items: {
        type: 'object', required: ['claim', 'confidence', 'sourceTier', 'sources', 'authorityMetrics'],
        properties: {
          claim: { type: 'string' },
          confidence: { enum: ['high', 'medium', 'low'] },
          sourceTier: { enum: ['L1', 'L2', 'L3'] },
          sources: { type: 'array', items: { type: 'string' } },
          authorityMetrics: { type: 'object' },
          evidence: { type: 'string' },
          disputeNote: { type: 'string' },
        },
      },
    },
    caveats: { type: 'string' },
    openQuestions: { type: 'array', items: { type: 'string' } },
    sourceCoverage: {
      type: 'object', required: ['totalSources', 'l1Count', 'l2Count', 'l3Count', 'loginRestricted', 'extractSuccessRate'],
      properties: {
        totalSources: { type: 'number' },
        l1Count: { type: 'number' },
        l2Count: { type: 'number' },
        l3Count: { type: 'number' },
        loginRestricted: { type: 'array', items: { type: 'object', required: ['sourceId', 'reason'], properties: { sourceId: { type: 'string' }, reason: { type: 'string' } } } },
        extractSuccessRate: { type: 'string' },
      },
    },
  },
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. Playwright invocation utilities
// ═══════════════════════════════════════════════════════════════════════════
//
// DESIGN NOTE: Playwright MCP tools may be unavailable in subagents,
// so all calls go through Bash + Node.js .mjs scripts.
// Workflow agent() receives "Use Bash to run: node script.mjs '...json...'" in its prompt.
//
// Script location: C:\Users\fanjiang\.claude\skills\deep-research\scripts\
// Naming: pw-search-{sourceId}.mjs for search, pw-extract-{sourceId}.mjs for extract
//
// Script contract:
//   - Input: single JSON string arg (or stdin JSON)
//   - Output: stdout JSON (single line)
//   - Exit code: 0=success, 1=extract failed (degradable), 2=network error (retryable), 3=blocked (skip)
//   - Timeout: default 45s; google_scholar/anti-bot sites 60s
//
// TODO: Full site-specific Playwright adapters. Priority:
//   P0 (high-freq L1): github, arxiv, pubmed, npm, pypi, yahoo_finance
//   P1 (high-freq L2): stackoverflow, zhihu, 36kr, crunchbase, statista
//   P2 (other L2/L3): rest on-demand
//
// Current: generic Playwright fetch + structured extraction prompt as fallback,
// progressively replaced by site-specific scripts.

/** Build a generic Playwright fetch + extract instruction for agents. */
const pwGenericExtract = (url, sourceId) => {
  const meta = SOURCE_META[sourceId] || {}
  return [
    '## Playwright Extraction: ' + sourceId,
    '',
    '**Target URL:** ' + url,
    '**Source:** ' + sourceId + ' (' + (meta.site || 'unknown') + ')',
    '**Tier:** ' + (meta.tier || 'unknown'),
    '**Expected metrics:** ' + (meta.metric || 'generic'),
    '',
    '### Instructions',
    '1. Write a temporary .mjs script using `import { chromium } from \'playwright\'`.',
    '2. Launch headless Chromium, navigate to the URL, wait for content to load.',
    '3. Extract structured data per source type (see rules below).',
    '4. Extract 2-5 FALSIFIABLE claims with direct quotes.',
    '5. Return JSON matching EXTRACT_SCHEMA.',
    '6. On failure: set extractQuality appropriately and include error details.',
    '',
    '### Source-Type-Specific Extraction Rules',
    sourceTypeExtractRules(sourceId),
    '',
    '### Playwright Call Pattern',
    '```bash',
    'node pw-extract.mjs \'{"url":"' + url + '","sourceId":"' + sourceId + '"}\'',
    '```',
    '',
    '### Timeout & Retry',
    '- Network timeout: 30s',
    '- Navigation waitUntil: \'domcontentloaded\' (not \'networkidle\' -- too slow)',
    '- If blocked (403/captcha): set extractQuality="blocked", do NOT retry',
    '- If network error: retry ONCE after 2s delay, then set extractQuality="failed"',
  ].join('\n')
}

/** Source-type-specific extraction guidance. */
const sourceTypeExtractRules = (sourceId) => {
  // GitHub & package managers
  if (['github','pypi','npm','crates_io','dockerhub'].includes(sourceId)) {
    return [
      '- **Code repo**: Extract stars, forks, contributors, last commit date, release frequency, license, primary language',
      '- **Package manager**: Extract download counts, version history, dependents',
      '- Search for README sections: features, comparison, benchmarks',
      '- Claim type: mostly factual_data (adoption stats, benchmarks)',
    ].join('\n')
  }
  // Academic
  if (['arxiv','semantic_scholar','paperswithcode','google_scholar','pubmed','openreview','dl_acm','ieee'].includes(sourceId)) {
    return [
      '- **Paper**: Extract title, authors, abstract, submitted date, citation count',
      '- For arxiv: use h1.title.mathjax, .authors, blockquote.abstract selectors',
      '- For semanticscholar/paperswithcode: extract benchmark rankings, SOTA claims',
      '- Claim type: mostly factual_data (experimental results, benchmarks) + expert_opinion',
    ].join('\n')
  }
  // Market / financial
  if (['sec_edgar','yahoo_finance','bloomberg','reuters','fred','worldbank','stats_gov_cn','crunchbase','cbinsights','36kr','huxiu','mckinsey','gartner','statista'].includes(sourceId)) {
    return [
      '- **Financial**: Extract revenue, profit, market cap, funding rounds, growth rate',
      '- **Market report**: Extract market size, CAGR, market share, key players',
      '- **News/analysis**: Extract key claims, author credentials, publication date',
      '- Claim type: factual_data (financials), market_signal (trends), expert_opinion (analyst views)',
    ].join('\n')
  }
  // Consumer reviews
  if (['amazon','amazon_cn','jd','g2','trustpilot','sspai','rtings','dxomark'].includes(sourceId)) {
    return [
      '- **Review platform**: Extract aggregate rating, review count, rating distribution',
      '- Extract representative positive AND negative reviews (at least one each)',
      '- For rtings/dxomark: extract test methodology notes and score breakdowns',
      '- Claim type: user_experience (reviews), factual_data (specs and test scores)',
    ].join('\n')
  }
  // Chinese UGC platforms
  if (['zhihu_tech','zhihu_academic','zhihu_shopping','zhihu_career','zhihu_realestate','juejin','csdn','xiaohongshu','xiaohongshu_career','xiaohongshu_home','weibo','douban','douban_group','bilibili_tech','bilibili_review','maimai','xueqiu'].includes(sourceId)) {
    return [
      '- **Chinese UGC**: Extract author credibility indicators (followers, professional badge, verified)',
      '- Extract engagement metrics: likes/upvotes, comments, saves/shares',
      '- For video platforms (bilibili): extract title, description, comment sentiment -- video body CANNOT be transcribed',
      '- For xiaohongshu/maimai (login_required): set extractQuality="login_required" if login wall hit',
      '- Claim type: user_experience (personal reviews), expert_opinion (professional analysis)',
      '- WARNING: Chinese UGC platforms have significant SEO spam and promotional content. Cross-reference required.',
    ].join('\n')
  }
  // Social / forums
  if (['hackernews','reddit_programming','reddit_reviews','reddit_cscareer','reddit_investing','producthunt','twitter_tech','twitter_academic','twitter_security','youtube_review','linkedin_company','glassdoor','indeed','levels_fyi','boss_zhipin','lagou','huggingface_papers'].includes(sourceId)) {
    return [
      '- **Social/Discussion**: Extract post score/upvotes, comment count, comment quality indicators',
      '- For twitter: extract verified status, follower count, engagement -- unauthenticated browsing is limited',
      '- For reddit/HN: extract top-level comments with highest scores as supplementary insights',
      '- For linkedin/glassdoor (partial login): extract publicly visible content, note login-gated content',
      '- Claim type: mostly user_experience + market_signal',
      '- WARNING: These are social proof sources -- claims from here need L1/L2 corroboration',
    ].join('\n')
  }
  // Healthcare (special rules)
  if (['fda','who','cochrane','clinicaltrials','mayo_clinic','msd_manual','uptodate'].includes(sourceId)) {
    return [
      '- **Medical authority**: Extract official guidelines, approval status, contraindications',
      '- Extract publication/update date -- recency is critical for medical claims',
      '- Extract evidence level (RCT, meta-analysis, systematic review, expert opinion)',
      '- Claim type: official_statement (guidelines), factual_data (trial results)',
      '- WARNING: NEVER extract dosage or treatment recommendations as factual claims without explicit disclaimers',
    ].join('\n')
  }
  // Security
  if (['nvd','cve','github_advisories','exploit_db','mitre_attack','snyk'].includes(sourceId)) {
    return [
      '- **Vulnerability DB**: Extract CVE ID, CVSS score, affected versions, patch status',
      '- Extract attack vector, complexity, impact summary',
      '- Claim type: factual_data (vulnerability details)',
    ].join('\n')
  }
  // Default generic
  return [
    '- Extract page title, publication date, author/source credibility',
    '- Extract key factual claims with direct quotes',
    '- Assess source quality: primary (official), secondary (reputable media), blog (personal), forum (community), ugc (user-generated), unreliable',
    '- Note any access restrictions (paywall, login wall, geo-block)',
  ].join('\n')
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. PHASE 0: Scope -- decompose question + classify domain
// ═══════════════════════════════════════════════════════════════════════════
phase('Scope')

if (!QUESTION) {
  return {
    error: 'No research question provided. Pass it as args: Workflow({name: \'deep-research-v3\', args: \'<question> | depth:quick\'}). Depth options: quick, standard, thorough.',
  }
}
log('Depth: ' + DEPTH + ' | Tiers: ' + cfg.tiers.join('+') + ' | Max sources: ' + cfg.maxSources)
log('Q: ' + QUESTION.slice(0, 100) + (QUESTION.length > 100 ? '...' : ''))

const scope = await agent(
  [
    '## Phase 0: Scope -- Decompose & Classify',
    '',
    '### Research Question',
    QUESTION,
    '',
    '### Task',
    '1. Decompose the question into 3-5 complementary search angles.',
    '   Each angle should have a label, a specific search query, and a rationale.',
    '   Make queries specific enough to surface high-signal results.',
    '2. Classify the research domain from this list:',
    '   ' + Object.entries(DOMAIN_KEYWORDS).map(function(e) { return '- **' + e[0] + '**: ' + e[1].slice(0, 5).join(', ') + '...' }).join('\n   '),
    '3. Determine the primary language (zh/en/any).',
    '',
    '### Domain Classification Rules',
    '- tech_framework: comparing frameworks, libraries, SDKs, language choice',
    '- academic_research: papers, surveys, SOTA, literature review',
    '- market_industry: market size, industry trends, revenue, funding',
    '- consumer_product: product reviews, buying recommendations, comparisons',
    '- career_job: salary, company reviews, job market, career path',
    '- healthcare_medical: drugs, diseases, treatments, clinical trials -- **restricted to authoritative sources only**',
    '- finance_investment: stocks, funds, crypto, investment analysis',
    '- tech_trends: technology evolution, ecosystem landscape, future directions',
    '- regulation_policy: laws, regulations, compliance, standards',
    '- security_vulnerability: CVEs, exploits, vulnerability analysis',
    '- real_estate: housing prices, rental market, location analysis',
    '',
    'If no domain clearly matches, pick the closest one. Default to market_industry for business questions.',
    '',
    'Structured output only.',
  ].join('\n'),
  { label: 'scope', schema: SCOPE_SCHEMA }
)

if (!scope || !scope.angles || scope.angles.length === 0) {
  return { error: 'Scope agent returned no result or empty angles.' }
}
log('Domain: ' + scope.domain + ' | Lang: ' + scope.lang + ' | Angles: ' + scope.angles.map(function(a) { return a.label }).join(', '))

// ═══════════════════════════════════════════════════════════════════════════
// 6. PHASE 1: Route -- match domain to source list (deterministic, not agent)
// ═══════════════════════════════════════════════════════════════════════════
phase('Route')

// Match domain against SOURCE_ROUTING rules, with lang-specific overrides
const routingRule = SOURCE_ROUTING.rules.find(
  function(r) { return r.domain === scope.domain && (r.lang === scope.lang || r.lang === 'any') }
) || SOURCE_ROUTING.default

log('Matched routing rule: domain=' + scope.domain + ' lang=' + scope.lang)

// Select sources per tier based on depth config
const selectedSourceIds = []
const skippedSources = []

for (let ti = 0; ti < cfg.tiers.length; ti++) {
  const tier = cfg.tiers[ti]
  const tierSources = (routingRule[tier] || []).slice()
  if (tierSources.length === 0) continue

  // Filter login_required=true sources unless thorough mode
  // TODO: In thorough mode, attempt persistent session for login_required sources
  const available = tierSources.filter(function(id) {
    const meta = SOURCE_META[id]
    if (!meta) {
      skippedSources.push({ id: id, reason: 'No metadata found for source ID' })
      return false
    }
    if (meta.login === true && DEPTH !== 'thorough') {
      skippedSources.push({ id: id, reason: 'Login required (' + meta.site + '), only included in thorough mode' })
      return false
    }
    if (meta.login === 'partial' && DEPTH === 'quick') {
      skippedSources.push({ id: id, reason: 'Partial login (' + meta.site + '), skipped in quick mode' })
      return false
    }
    return true
  })

  // Take up to remaining slots
  // Keyword-aware source prioritization within tier:
  // Reorder sources so those whose metric matches the question's intent come first
  // (e.g. "most starred" → prioritize sources with "stars" in their metric field).
  const metricKeywords = [
    { words: ['star', 'stars', 'starred', 'most popular', 'popularity'], metric: 'stars' },
    { words: ['download', 'downloads', 'most used', 'usage', 'installs'], metric: 'downloads' },
    { words: ['citation', 'citations', 'cited', 'most cited', 'influential'], metric: 'citations' },
    { words: ['fork', 'forks', 'forked', 'most forked'], metric: 'forks' },
    { words: ['contributor', 'contributors', 'community size', 'maintainers'], metric: 'contributors' },
  ]
  const questionLower = QUESTION.toLowerCase()
  const priorityMetric = metricKeywords.find(function(mk) {
    return mk.words.some(function(w) { return questionLower.includes(w) })
  })
  if (priorityMetric) {
    available.sort(function(a, b) {
      const ma = SOURCE_META[a] || {}, mb = SOURCE_META[b] || {}
      const aMatch = (ma.metric || '').includes(priorityMetric.metric) ? 0 : 1
      const bMatch = (mb.metric || '').includes(priorityMetric.metric) ? 0 : 1
      return aMatch - bMatch
    })
  }
  const remaining = cfg.maxSources - selectedSourceIds.length
  for (let ai = 0; ai < available.length && ai < remaining; ai++) {
    selectedSourceIds.push(available[ai])
  }
}

log('Selected ' + selectedSourceIds.length + ' sources: ' + selectedSourceIds.join(', '))
if (skippedSources.length > 0) {
  log('Skipped ' + skippedSources.length + ' sources: ' + skippedSources.map(function(s) { return s.id + '(' + s.reason + ')' }).join(', '))
}

// Build Phase 1 output
const routeResult = {
  domain: scope.domain,
  lang: scope.lang,
  selectedSources: selectedSourceIds.map(function(id) {
    const meta = SOURCE_META[id] || {}
    const isL1 = (routingRule.L1 || []).includes(id)
    const isL2 = (routingRule.L2 || []).includes(id)
    return {
      id: id,
      site: meta.site || id,
      tier: isL1 ? 'L1' : isL2 ? 'L2' : 'L3',
      access: meta.access || 'playwright',
      login_required: String(meta.login || false),
      metric: meta.metric || 'generic',
    }
  }),
  skippedSources: skippedSources,
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. PHASE 2: Search -- per-source search via Playwright + WebSearch
// ═══════════════════════════════════════════════════════════════════════════
phase('Search')

// Dedup state (same normURL logic as v2)
const normURL = function(u) {
  try {
    const p = new URL(u)
    return (p.hostname.replace(/^www\./, '') + p.pathname.replace(/\/$/, '')).toLowerCase()
  } catch (e) { return u.toLowerCase() }
}
const seen = new Map()
const dupes = []

// Search strategy per source type:
// - playwright access: agent writes + runs .mjs with Playwright search
// - websearch access: agent uses WebSearch API
// - playwright+websearch: Playwright primary, WebSearch supplementary

const buildSearchPrompt = function(source, angle) {
  const meta = SOURCE_META[source.id] || {}
  const isPlaywright = meta.access === 'playwright' || meta.access === 'playwright+websearch'
  const isWebSearch = meta.access === 'websearch' || meta.access === 'playwright+websearch'

  const lines = [
    '## Phase 2: Search -- ' + source.id + ' (' + source.site + ')',
    '',
    '**Research Question:** ' + QUESTION,
    '**Angle:** ' + angle.label + ' -- ' + (angle.rationale || ''),
    '**Search Query:** ' + angle.query,
    '**Source:** ' + source.id + ' | Tier: ' + source.tier + ' | Access: ' + source.access,
    '',
  ]

  if (isPlaywright) {
    lines.push(
      '### Primary: Playwright In-Site Search',
      '',
      'Write and run a temporary .mjs script that:',
      '1. Launches headless Chromium via `import { chromium } from \'playwright\'`',
      '2. Navigates to the site\'s search page with the query',
      '3. Extracts search results (title, URL, snippet, and any visible metrics)',
      '4. Returns JSON matching SEARCH_RESULT_SCHEMA',
      '',
      '#### Site-Specific Search URL Patterns:',
      siteSearchPatterns(source.id),
      '',
      '#### Call via:',
      '```bash',
      'node pw-search.mjs \'{"sourceId":"' + source.id + '","searchUrl":"<constructed search URL>"}\'',
      '```',
      '',
    )
  }

  if (isWebSearch) {
    lines.push(
      '### ' + (isPlaywright ? 'Supplementary' : 'Primary') + ': WebSearch Discovery',
      '',
      'Use WebSearch with site-scoped query to discover sources:',
      '- Query: ' + angle.query + ' site:' + source.site,
      '- WebSearch snippets are discovery only -- full content extraction happens in Phase 3 via Playwright',
      '- Return the top 3-5 most relevant URLs found',
      '',
    )
  }

  lines.push(
    '### Output',
    '- Top 3-8 results, ranked by relevance to the research question',
    '- Include preview metrics visible on search results page (stars, dates, etc.)',
    '- Skip SEO spam, content farms, and obviously irrelevant results',
    '- Mark each result with relevance: high/medium/low',
    '',
    'Structured output only.',
  )
  return lines.join('\n')
}

// ─── SEARCH_URLS — site-specific search URL patterns for Playwright in-site search ───
// Alias: also referenced as SEARCH_URLS in documentation.
// Each entry maps sourceId → Playwright search page URL template with {query} placeholder.
const siteSearchPatterns = function(sourceId) {
  const patterns = {
    github:             '- https://github.com/search?q={query}&type=repositories&s=stars',
    pypi:               '- https://pypi.org/search/?q={query}',
    npm:                '- https://www.npmjs.com/search?q={query}',
    crates_io:          '- https://crates.io/search?q={query}',
    dockerhub:          '- https://hub.docker.com/search?q={query}',
    arxiv:              '- https://arxiv.org/search/?query={query}&searchtype=all',
    semantic_scholar:   '- https://www.semanticscholar.org/search?q={query}&sort=relevance',
    paperswithcode:     '- https://paperswithcode.com/search?q={query}',
    google_scholar:     '- https://scholar.google.com/scholar?q={query} (WARNING: strong anti-bot, rate-limit, top 10 only)',
    pubmed:             '- https://pubmed.ncbi.nlm.nih.gov/?term={query}&sort=relevance',
    stackoverflow:      '- https://stackoverflow.com/search?q={query}',
    zhihu_tech:         '- https://www.zhihu.com/search?type=content&q={query}',
    juejin:             '- https://juejin.cn/search?query={query}&sort=hotest',
    csdn:               '- https://so.csdn.net/so/search?q={query}&t=all',
    '36kr':             '- https://www.36kr.com/search?q={query}',
    huxiu:              '- https://www.huxiu.com/search.html?q={query}',
    amazon:             '- https://www.amazon.com/s?k={query}',
    amazon_cn:          '- https://www.amazon.cn/s?k={query}',
    jd:                 '- https://search.jd.com/Search?keyword={query}',
    reddit:             '- https://www.reddit.com/search/?q={query}&sort=relevance',
    hackernews:         '- USE WebSearch: site:news.ycombinator.com {query} (HN search limited)',
    youtube_review:     '- https://www.youtube.com/results?search_query={query}+review',
    producthunt:        '- https://www.producthunt.com/search?q={query}',
    bilibili_tech:      '- https://search.bilibili.com/all?keyword={query}&order=click',
    bilibili_review:    '- https://search.bilibili.com/all?keyword={query}+review&order=click',
    xiaohongshu:        '- WARNING strong login+anti-bot: WebSearch site:xiaohongshu.com {query} as supplement',
    maimai:             '- WARNING strong login: WebSearch site:maimai.cn {query} as supplement',
    weibo:              '- https://s.weibo.com/weibo?q={query} (topic search publicly accessible)',
    douban:             '- https://www.douban.com/search?q={query}',
    linkedin:           '- https://www.linkedin.com/search/results/all/?keywords={query} (partial login restriction)',
    twitter_tech:       '- USE WebSearch: site:twitter.com {query} (API rate-limited)',
    wikipedia:          '- https://en.wikipedia.org/w/index.php?search={query}',
    nvd:                '- https://nvd.nist.gov/vuln/search/results?query={query}',
    cve:                '- https://www.cve.org/CVERecord/Search?query={query}',
    github_advisories:  '- https://github.com/advisories?query={query}',
    yahoo_finance:      '- https://finance.yahoo.com/search?q={query}',
    sec_edgar:          '- https://www.sec.gov/edgar/search/#?q={query}',
    fred:               '- https://fred.stlouisfed.org/search?st={query}',
    worldbank:          '- https://data.worldbank.org/?display=default&q={query}',
    stats_gov_cn:       '- WebSearch: site:data.stats.gov.cn {query}',
  }
  return patterns[sourceId]
    ? patterns[sourceId]
    : '- No site-specific pattern yet. Use site homepage search or WebSearch site:' + ((SOURCE_META[sourceId] || {}).site || sourceId) + ' {query}.'
}

// Pair each angle with selected sources
const searchTasks = []
for (let ai = 0; ai < scope.angles.length; ai++) {
  const angle = scope.angles[ai]
  for (let si = 0; si < routeResult.selectedSources.length; si++) {
    const source = routeResult.selectedSources[si]
    searchTasks.push({ angle: angle, source: source })
  }
}

log('Search phase: ' + searchTasks.length + ' tasks (' + scope.angles.length + ' angles x ' + routeResult.selectedSources.length + ' sources)')

const searchResultsRaw = await parallel(
  searchTasks.map(function(task) {
    return function() {
      return agent(buildSearchPrompt(task.source, task.angle), {
        label: 'search:' + task.source.id + '/' + task.angle.label.slice(0, 15),
        phase: 'Search',
        schema: SEARCH_RESULT_SCHEMA,
      }).then(function(r) {
        if (!r) return null
        const novel = (r.results || []).filter(function(res) {
          const key = normURL(res.url)
          if (seen.has(key)) { dupes.push(res.url); return false }
          seen.set(key, task.source.id)
          return true
        })
        log(task.source.id + '/' + task.angle.label + ': ' + novel.length + ' novel results (kept)')
        return { sourceId: task.source.id, angle: task.angle.label, tier: task.source.tier, results: novel, accessMethod: r.accessMethod, errors: r.errors || [] }
      }).catch(function(e) {
        log('search failed: ' + task.source.id + '/' + task.angle.label + ' -- ' + (e.message || e))
        return { sourceId: task.source.id, angle: task.angle.label, tier: task.source.tier, results: [], errors: [e.message || String(e)] }
      })
    }
  })
).then(function(results) { return results.filter(Boolean) })

const allSearchResults = searchResultsRaw.filter(function(sr) { return sr.results.length > 0 })
const totalUrls = allSearchResults.reduce(function(sum, sr) { return sum + sr.results.length }, 0)
log('Search complete: ' + allSearchResults.length + ' source-searches with results -> ' + totalUrls + ' unique URLs (' + dupes.length + ' dupes removed)')

// ═══════════════════════════════════════════════════════════════════════════
// 8. PHASE 3: Extract -- Playwright fetch + structured extraction
// ═══════════════════════════════════════════════════════════════════════════
phase('Extract')

// Build flat list of URLs to extract
const extractTasks = []
for (let sri = 0; sri < allSearchResults.length; sri++) {
  const sr = allSearchResults[sri]
  for (let ri = 0; ri < sr.results.length; ri++) {
    const res = sr.results[ri]
    extractTasks.push({
      url: res.url,
      title: res.title || '',
      sourceId: sr.sourceId,
      tier: sr.tier,
      angle: sr.angle,
      previewMetrics: res.previewMetrics || {},
    })
  }
}

// Cap extraction count by depth
const maxExtract = cfg.maxExtract
const tasksToExtract = extractTasks
  .sort(function(a, b) { return a.tier === 'L1' ? -1 : a.tier === 'L2' ? 0 : 1 })
  .slice(0, maxExtract)

log('Extracting ' + tasksToExtract.length + ' URLs (capped from ' + extractTasks.length + ', max=' + maxExtract + ')')

// Build extract prompt
const buildExtractPrompt = function(task) {
  return [
    pwGenericExtract(task.url, task.sourceId),
    '',
    '### Context',
    '- **Found via angle:** ' + task.angle,
    '- **Search title:** ' + (task.title || 'N/A'),
    '- **Preview metrics from search:** ' + JSON.stringify(task.previewMetrics || {}),
    '',
    '### Output',
    'Return structured JSON matching EXTRACT_SCHEMA. Focus on:',
    '1. Source-specific authority metrics (stars, citations, downloads, ratings, etc.)',
    '2. 2-5 falsifiable claims with direct quotes',
    '3. extractQuality assessment',
    '4. Any errors encountered',
    '',
    'Structured output only.',
  ].join('\n')
}

const extractResults = await parallel(
  tasksToExtract.map(function(task) {
    return function() {
      return agent(buildExtractPrompt(task), {
        label: 'extract:' + task.sourceId + '/' + (task.title || task.url).slice(0, 30),
        phase: 'Extract',
        schema: EXTRACT_SCHEMA,
      }).then(function(ext) {
        if (!ext) return null
        return {
          url: task.url,
          sourceId: task.sourceId,
          tier: task.tier,
          angle: task.angle,
          extractQuality: ext.extractQuality,
          sourceQuality: ext.sourceQuality,
          publishDate: ext.publishDate,
          metrics: ext.metrics || {},
          claims: (ext.claims || []).map(function(c) {
            return {
              claim: c.claim,
              quote: c.quote,
              claimType: c.claimType,
              importance: c.importance,
              sourceUrl: task.url,
              sourceId: task.sourceId,
              sourceTier: task.tier,
              sourceQuality: ext.sourceQuality,
            }
          }),
          errors: ext.errors || [],
        }
      }).catch(function(e) {
        log('extract failed: ' + task.sourceId + '/' + task.url.slice(0, 40) + ' -- ' + (e.message || e))
        return {
          url: task.url,
          sourceId: task.sourceId,
          tier: task.tier,
          angle: task.angle,
          extractQuality: 'failed',
          sourceQuality: 'unreliable',
          metrics: {},
          claims: [],
          errors: [e.message || String(e)],
        }
      })
    }
  })
).then(function(results) { return results.filter(Boolean) })

// Stats
const extractStats = {
  total: extractResults.length,
  full: extractResults.filter(function(e) { return e.extractQuality === 'full' }).length,
  partial: extractResults.filter(function(e) { return e.extractQuality === 'partial' || e.extractQuality === 'header_only' }).length,
  failed: extractResults.filter(function(e) { return e.extractQuality === 'failed' || e.extractQuality === 'blocked' }).length,
  login_required: extractResults.filter(function(e) { return e.extractQuality === 'login_required' }).length,
}
log('Extract complete: ' + extractStats.full + ' full / ' + extractStats.partial + ' partial / ' + extractStats.failed + ' failed / ' + extractStats.login_required + ' login required')

const allClaims = []
for (let ei = 0; ei < extractResults.length; ei++) {
  const e = extractResults[ei]
  for (let ci = 0; ci < e.claims.length; ci++) {
    allClaims.push(e.claims[ci])
  }
}
log('Total claims extracted: ' + allClaims.length)

// Early exit: no claims
if (allClaims.length === 0) {
  return {
    question: QUESTION,
    depth: DEPTH,
    domain: scope.domain,
    summary: 'No claims extracted from ' + extractResults.length + ' sources.',
    findings: [],
    sourceCoverage: {
      totalSources: extractResults.length,
      l1Count: extractResults.filter(function(e) { return e.tier === 'L1' }).length,
      l2Count: extractResults.filter(function(e) { return e.tier === 'L2' }).length,
      l3Count: extractResults.filter(function(e) { return e.tier === 'L3' }).length,
      loginRestricted: skippedSources.map(function(s) { return { sourceId: s.id, reason: s.reason } }),
      extractSuccessRate: extractStats.full + '/' + extractResults.length + ' (' + Math.round(extractStats.full / extractResults.length * 100) + '%)',
    },
    sources: extractResults.map(function(e) { return { url: e.url, quality: e.sourceQuality, tier: e.tier } }),
    stats: {
      angles: scope.angles.length,
      sourcesSearched: routeResult.selectedSources.length,
      urlsFound: totalUrls,
      urlsExtracted: extractResults.length,
      claims: 0,
      depth: DEPTH,
    },
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 9. PHASE 4: Cross-reference -- tier-based claim validation
// ═══════════════════════════════════════════════════════════════════════════
phase('Cross-reference')

// v3 key change: replace LLM adversarial voting (v2 Verify) with source-tier cross-referencing
//
// Validation logic:
//   L1 sources disagree among themselves -> "disputed", needs more sources
//   L1 sources agree -> high confidence
//   Only L1+L2 sources agree -> medium-high confidence
//   Only L2 sources -> medium confidence
//   Only L2/L3 sources -> medium-low confidence
//   Only L3 sources -> low confidence
//
// Cross-reference mode depends on depth:
//   quick (simple):    claim has >=1 L1 support and 0 L1 opposition -> high
//   standard (moderate): claim has >=2 sources (L1+L2) support and 0 L1 opposition -> high
//   thorough (thorough): L1+L2+L3 three-tier check, any L1 opposition downgrades

const claimBlocks = []
for (let i = 0; i < allClaims.length; i++) {
  const c = allClaims[i]
  claimBlocks.push(
    '[' + i + '] **' + (c.claim || '').slice(0, 120) + '**\n' +
    '    Source: ' + c.sourceId + ' (' + c.sourceTier + ') | Type: ' + (c.claimType || 'unknown') + ' | Importance: ' + (c.importance || 'unknown') + '\n' +
    '    Quote: "' + (c.quote || '').slice(0, 150) + '"\n' +
    '    URL: ' + c.sourceUrl + '\n'
  )
}

const CROSS_REF_PROMPT = [
  '## Phase 4: Tier-Based Cross-Reference',
  '',
  '**Research Question:** ' + QUESTION,
  '**Cross-reference Mode:** ' + cfg.crossRefMode,
  '**Depth:** ' + DEPTH + ' (tiers: ' + cfg.tiers.join('+') + ')',
  '',
  '### Validation Rules (NO LLM voting -- purely source-tier-based)',
  '',
  '1. **Group claims by semantic similarity.** Same factual claim from multiple sources -> merge.',
  '2. **Assign confidence by source tier:**',
  '   - >=2 L1 sources agree, no L1 dispute -> **high**',
  '   - 1 L1 + >=1 L2 agree, no L1 dispute -> **high**',
  '   - >=2 L2 sources agree, no L1 -> **medium**',
  '   - 1 L2 only -> **medium**',
  '   - L2 + L3 agree -> **medium**',
  '   - Only L3 sources -> **low**',
  '   - Any L1 source disputes -> **downgrade one level** (high->medium, medium->low)',
  '3. **For disputes with L1 disagreement** -> mark as "disputed" under disputes array',
  '4. **For data-type claims** (factual_data): require >=2 independent sources for high confidence',
  '5. **For expert_opinion claims**: author + venue credibility matters',
  '6. **For user_experience claims**: always medium at best; need L1/L2 corroboration for high',
  '',
  '### Extracted Claims (' + allClaims.length + ' total)',
  '',
].concat(claimBlocks).concat([
  '',
  '### Task',
  '1. Identify semantically identical/similar claims and group them.',
  '2. For each group, count supporting sources by tier.',
  '3. Assign confidence based on the tier rules above.',
  '4. Identify disputes (claims contradicted by sources of equal or higher tier).',
  '5. For disputed topics, recommend resolution.',
  '',
  '### Important',
  '- Do NOT make subjective judgments about claim truth. Only evaluate based on source tier + agreement patterns.',
  '- Claims with only L3 social proof sources are LOW confidence regardless of count.',
  '- Medical/healthcare claims from non-authoritative sources -> automatically LOW',
  '',
  'Structured output only.',
]).join('\n')

const crossRefResult = await agent(CROSS_REF_PROMPT, {
  label: 'cross-reference',
  schema: CROSS_REF_SCHEMA,
})

if (!crossRefResult) {
  log('WARNING: Cross-reference agent returned no result. Falling back to raw claims.')
}

const validatedClaims = crossRefResult && crossRefResult.validatedClaims
  ? crossRefResult.validatedClaims
  : allClaims.map(function(c) {
      return {
        claim: c.claim,
        confidence: c.sourceTier === 'L1' ? 'medium' : 'low',
        sourceTier: c.sourceTier,
        supportingSources: [{ sourceId: c.sourceId, url: c.sourceUrl, tier: c.sourceTier, quote: c.quote }],
        conflictingSources: [],
      }
    })

const disputes = (crossRefResult && crossRefResult.disputes) || []
log('Cross-reference: ' + validatedClaims.length + ' validated claims, ' + disputes.length + ' disputes')

// ═══════════════════════════════════════════════════════════════════════════
// 10. PHASE 5: Synthesize -- final report
// ═══════════════════════════════════════════════════════════════════════════
phase('Synthesize')

const synthClaimBlocks = []
for (let i = 0; i < validatedClaims.length; i++) {
  const vc = validatedClaims[i]
  const tierLabel = vc.sourceTier === 'L1' ? 'L1' : vc.sourceTier === 'L2' ? 'L2' : 'L3'
  const supporting = (vc.supportingSources || []).map(function(s) { return s.sourceId + '(' + s.tier + ')' }).join(', ')
  const conflicting = (vc.conflictingSources || []).length > 0
    ? (vc.conflictingSources || []).map(function(s) { return s.sourceId }).join(', ')
    : 'none'
  synthClaimBlocks.push(
    '[' + i + '] ' + tierLabel + ' **Confidence: ' + (vc.confidence || 'medium') + '**\n' +
    '    Claim: ' + (vc.claim || '').slice(0, 200) + '\n' +
    '    Supporting: ' + supporting + '\n' +
    '    Conflicting: ' + conflicting + '\n'
  )
}

const disputeBlocks = []
for (let i = 0; i < disputes.length; i++) {
  const d = disputes[i]
  disputeBlocks.push(
    '[' + i + '] Topic: ' + (d.topic || '') + '\n' +
    '    Positions: ' + (d.positions || []).join(' | ') + '\n' +
    '    Resolution: ' + (d.resolution || 'unresolved') + '\n'
  )
}

const loginSkippedStr = skippedSources.map(function(s) { return s.id }).join(', ') || 'none'

const SYNTHESIS_PROMPT = [
  '## Phase 5: Synthesize -- Research Report (deep-research v3)',
  '',
  '**Research Question:** ' + QUESTION,
  '**Depth:** ' + DEPTH + ' | Domain: ' + scope.domain + ' | Language: ' + scope.lang,
  '',
  '### Validated Claims (' + validatedClaims.length + ')',
  '',
].concat(synthClaimBlocks).concat([
  '',
  '### Disputes (' + disputes.length + ')',
  '',
]).concat(disputeBlocks).concat([
  '',
  '### Source Coverage',
  '- L1 sources: ' + extractResults.filter(function(e) { return e.tier === 'L1' }).length + ' (primary/authoritative)',
  '- L2 sources: ' + extractResults.filter(function(e) { return e.tier === 'L2' }).length + ' (secondary/expert)',
  '- L3 sources: ' + extractResults.filter(function(e) { return e.tier === 'L3' }).length + ' (social proof)',
  '- Extraction success: ' + extractStats.full + ' full, ' + extractStats.partial + ' partial, ' + extractStats.failed + ' failed',
  '- Login-restricted skipped: ' + loginSkippedStr,
  '',
  '### Instructions',
  '1. **Merge semantic duplicates** -- claims saying the same thing should be merged, combining their sources.',
  '2. **Group into coherent findings** addressing the research question.',
  '3. **Assign confidence based on source tier** -- L1 agreement > L2 agreement > L3 agreement. Explicitly mark sourceTier.',
  '4. **Include authority metrics summary** -- for each finding, note key metrics from supporting sources.',
  '5. **Write a 3-5 sentence executive summary** capturing key conclusions.',
  '6. **Note caveats**: source limitations, login restrictions, coverage gaps, disputed topics.',
  '7. **List 2-5 open questions** for further research.',
  '8. **Provide source coverage statistics**: counts by tier, extraction success rate, login-restricted sources.',
  '',
  '### Quality Guidelines',
  '- Findings from L1 sources with high authority metrics -> prioritize in summary',
  '- Disputed claims -> include both sides, note uncertainty',
  '- Healthcare claims -> explicitly state evidence level (RCT / meta-analysis / expert opinion)',
  '- Financial claims -> include date of data; market data changes rapidly',
  '',
  'Structured output only.',
]).join('\n')

const report = await agent(SYNTHESIS_PROMPT, {
  label: 'synthesize',
  schema: REPORT_SCHEMA,
})

// ═══════════════════════════════════════════════════════════════════════════
// 11. Build final output
// ═══════════════════════════════════════════════════════════════════════════

const buildSourceCoverage = function() {
  return {
    totalSources: extractResults.length,
    l1Count: extractResults.filter(function(e) { return e.tier === 'L1' }).length,
    l2Count: extractResults.filter(function(e) { return e.tier === 'L2' }).length,
    l3Count: extractResults.filter(function(e) { return e.tier === 'L3' }).length,
    loginRestricted: skippedSources.map(function(s) { return { sourceId: s.id, reason: s.reason } }),
    extractSuccessRate: extractStats.full + '/' + extractResults.length + ' (' + Math.round(extractStats.full / Math.max(extractResults.length, 1) * 100) + '%)',
  }
}

const buildSourcesList = function() {
  return extractResults.map(function(e) {
    return {
      url: e.url,
      sourceId: e.sourceId,
      tier: e.tier,
      quality: e.sourceQuality,
      extractQuality: e.extractQuality,
      claimCount: e.claims.length,
    }
  })
}

const buildStats = function(synthesisCount) {
  return {
    domain: scope.domain,
    lang: scope.lang,
    angles: scope.angles.length,
    sourcesRouted: routeResult.selectedSources.length,
    sourcesSkipped: skippedSources.length,
    urlsFound: totalUrls,
    urlsExtracted: extractResults.length,
    claimsExtracted: allClaims.length,
    claimsValidated: validatedClaims.length,
    disputes: disputes.length,
    afterSynthesis: synthesisCount,
    urlDupes: dupes.length,
    extractFull: extractStats.full,
    extractPartial: extractStats.partial,
    extractFailed: extractStats.failed,
    extractLoginRequired: extractStats.login_required,
    depth: DEPTH,
    agentCalls: 1 + searchTasks.length + tasksToExtract.length + 1 + 1,
  }
}

if (!report) {
  return {
    question: QUESTION,
    depth: DEPTH,
    domain: scope.domain,
    lang: scope.lang,
    summary: 'Synthesis agent failed -- returning ' + validatedClaims.length + ' validated claims raw (tier-based cross-reference only).',
    findings: validatedClaims.map(function(vc) {
      return {
        claim: vc.claim,
        confidence: vc.confidence,
        sourceTier: vc.sourceTier,
        sources: (vc.supportingSources || []).map(function(s) { return s.url }),
        authorityMetrics: vc.authorityMetrics || {},
        evidence: vc.evidence || '',
        disputeNote: (vc.conflictingSources || []).length > 0 ? 'Disputed' : undefined,
      }
    }),
    caveats: 'Synthesis agent skipped or errored. Claims are cross-referenced by source tier only.',
    openQuestions: [],
    disputedTopics: disputes.map(function(d) { return { topic: d.topic, resolution: d.resolution } }),
    sourceCoverage: buildSourceCoverage(),
    sources: buildSourcesList(),
    stats: buildStats(validatedClaims.length),
  }
}

return {
  question: QUESTION,
  depth: DEPTH,
  domain: scope.domain,
  lang: scope.lang,
  summary: report.summary,
  findings: report.findings,
  caveats: report.caveats,
  openQuestions: report.openQuestions,
  disputedTopics: disputes.map(function(d) { return { topic: d.topic, resolution: d.resolution } }),
  sourceCoverage: report.sourceCoverage || buildSourceCoverage(),
  sources: buildSourcesList(),
  stats: buildStats(report.findings ? report.findings.length : validatedClaims.length),
}

// ═══════════════════════════════════════════════════════════════════════════
// DESIGN DECISIONS & TODOs
// ═══════════════════════════════════════════════════════════════════════════
//
// [DECISION] Phase 1 Route is deterministic (not agent-based)
//   Reason: domain->source mapping is a rules engine, no LLM needed.
//   Deterministic routing ensures reproducibility.
//   Cost: domain classification depends on Phase 0 agent judgment.
//   Mitigation: Scope schema constrains domain to fixed enum values.
//
// [DECISION] Phase 4 Cross-reference uses source tier instead of LLM voting
//   Reason: v2's LLM adversarial voting consumed massive agents
//   (thorough: 25 claims x 3 votes = 75 agents), and LLM bias across
//   different sources was uncontrollable.
//   v3 deterministic tier logic: L1 consensus -> high confidence,
//   reducing ~70% of Verify agent calls.
//   Risk: "both L1 sources wrong" (rare, surfaced via disputes mechanism).
//
// [DECISION] Playwright via Bash + Node script
//   Reason: Playwright MCP tools may be unavailable in subagents.
//   Bash calling .mjs is a verified reliable path.
//   test-playwright-v2.mjs successfully accessed github/arxiv/huggingface.
//   Cost: each site needs independent .mjs adapter script; ~6 for P0.
//
// TODO: [P0] Create scripts/ directory and first batch of Playwright adapters
//   - pw-extract-github.mjs
//   - pw-extract-arxiv.mjs
//   - pw-extract-pubmed.mjs
//   - pw-extract-npm.mjs
//   - pw-extract-pypi.mjs
//   - pw-extract-yahoo-finance.mjs
//   Each script must handle: page load, selector extraction, anti-bot,
//   timeout/retry, structured output.
//
// TODO: [P1] Phase 1 runtime loading of sources-v3.json
//   Currently embed a reduced SOURCE_META. Production should:
//   - Read sources-v3.json (if fs access available)
//   - Or compile-time inline (avoid runtime dependency)
//   - Sync when sources-v3.json adds new domains
//
// TODO: [P1] Phase 2 Search dedup enhancement
//   Current normURL (hostname+pathname) does not handle:
//   - Mobile URLs (m.xxx.com vs xxx.com)
//   - URL parameter differences (utm_source etc.)
//   - Short link redirects (t.cn, bit.ly)
//   - Cross-platform reposts (same article on zhihu + juejin)
//
// TODO: [P2] Phase 2 cross-source result ranking
//   Current: each source returns independent relevance markers.
//   Suggested: weighted ranking using authority_metrics weights + relevance + source tier.
//
// TODO: [P2] Phase 3 Extract concurrency control
//   Current: all extract tasks via parallel() full concurrency.
//   For anti-bot sites (google_scholar, zhihu):
//   - Rate-limit queue (same domain >= 3s interval)
//   - Failure retry strategy (429 -> wait 5s retry, 403 -> mark block no retry)
//   - IP pool rotation (long-term; current: mark blocked then degrade)
//
// TODO: [P2] Phase 4 Cross-reference semantic dedup
//   Current: relies on agent to identify semantically identical claims.
//   Suggested: pre-match with simple text similarity (Jaccard on keywords),
//   agent does final merge.
//
// TODO: [P3] Login session support
//   sources-v3.json marks login_required: true/partial sources (maimai, xiaohongshu, weibo).
//   Current quick/standard mode skips these sources entirely.
//   thorough mode prompts user about enabling persistent session.
//   Implementation: check Playwright persistent session existence -> inject cookie -> launch with that session.
//
// TODO: [P3] Cache layer
//   Same URL may be extracted multiple times (different angles find same result).
//   Suggested: Phase 3 pre-check cache (in-memory Map<url, extractResult>), hit = direct reuse.
//
// TODO: [P3] Phase 5 Report format enhancement
//   Add: source authority visualization, dispute matrix, coverage heatmap.
//   Consider: output machine-readable JSON alongside Markdown report for downstream consumption.
//
// ─── Design Decisions ───
//
// [DECISION] Keyword-aware source prioritization (Phase 1 Route, v3.1)
//   Problem: quick mode takes first N L1 sources blindly. For "most starred" questions,
//   pypi/npm report downloads, not stars — weak signal match.
//   Solution: Before slicing, reorder available sources within tier so those whose
//   metric field matches question keywords come first. Uses simple keyword lookup
//   (metricKeywords table above Route phase), not NLP — deterministic + fast.
//   Cost: ~10 extra comparisons per Route phase. Zero agent calls added.
//   Limitation: keyword matching is surface-level. "most influential" won't match
//   "influential_citations" unless both appear in the keywords table.
