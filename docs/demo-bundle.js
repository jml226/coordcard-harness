// src/scraper.ts
var TIME_SEL = ".published-time-text, #published-time-text";
function channelIdFromHref(href) {
  if (!href) return "";
  const at = href.match(/\/(@[^/?#]+)/u);
  if (at) return at[1];
  const ch = href.match(/\/channel\/(UC[^/?#]+)/u);
  if (ch) return ch[1];
  return href;
}
function ownField(node, selector, unitSel) {
  const all = Array.from(node.querySelectorAll(selector));
  for (const el of all) {
    if (el.closest(unitSel) === node) return el;
  }
  return null;
}
function readFields(node, unitSel) {
  const authorEl = ownField(node, "#author-text", unitSel);
  const channelId = channelIdFromHref(authorEl?.getAttribute("href") ?? null);
  const contentEl = ownField(node, "#content-text", unitSel);
  const text = (contentEl?.textContent ?? "").trim();
  const timeEl = ownField(node, TIME_SEL, unitSel);
  const relTime = (timeEl?.textContent ?? "").trim();
  return { channelId, text, relTime };
}
function entriesByCid(nodes) {
  const out = [];
  for (const node of nodes) {
    const id = node.getAttribute("data-cid") ?? "";
    if (!id) continue;
    const ancestor = node.parentElement?.closest("[data-cid]") ?? null;
    const parentId = ancestor ? ancestor.getAttribute("data-cid") : null;
    out.push({ comment: { id, ...readFields(node, "[data-cid]"), parentId }, node });
  }
  return out;
}
function entriesLive(root) {
  const units = Array.from(root.querySelectorAll("ytd-comment-view-model"));
  return units.map((node, i) => {
    const repliesAncestor = node.parentElement?.closest("ytd-comment-replies-renderer");
    let parentId = null;
    if (repliesAncestor) {
      const thread = repliesAncestor.closest("ytd-comment-thread-renderer");
      const topVm = thread?.querySelector("ytd-comment-view-model") ?? null;
      const topIdx = topVm ? units.indexOf(topVm) : -1;
      parentId = topIdx >= 0 && topVm !== node ? `live-${topIdx}` : null;
    }
    return { comment: { id: `live-${i}`, ...readFields(node, "ytd-comment-view-model"), parentId }, node };
  });
}
function scrapeEntries(root) {
  const cidNodes = Array.from(root.querySelectorAll("[data-cid]"));
  if (cidNodes.length > 0) return entriesByCid(cidNodes);
  return entriesLive(root);
}
function scrapeComments(root) {
  return scrapeEntries(root).map((e) => e.comment);
}

// src/normalize.ts
var URL_RE = /https?:\/\/\S+|www\.\S+/gu;
var EMOJI_RE = /\p{Extended_Pictographic}/gu;
var PUNCT_RE = /[\p{P}\p{S}]/gu;
function normalize(text) {
  return text.normalize("NFKC").toLowerCase().replace(URL_RE, " ").replace(EMOJI_RE, " ").replace(PUNCT_RE, " ").replace(/\s+/gu, " ").trim();
}
function tokenCount(text) {
  const n = normalize(text);
  return n.length === 0 ? 0 : n.split(" ").length;
}

// src/charngram.ts
function charGrams(text, n = 4) {
  const s = normalize(text).replace(/\s+/gu, "");
  const grams = /* @__PURE__ */ new Set();
  if (s.length < n) {
    if (s.length > 0) grams.add(s);
    return grams;
  }
  for (let i = 0; i + n <= s.length; i++) grams.add(s.slice(i, i + n));
  return grams;
}
function jaccard(a, b) {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const g of a) if (b.has(g)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

// src/cluster.ts
var UnionFind = class {
  constructor(n) {
    this.parent = Array.from({ length: n }, (_, i) => i);
  }
  find(x) {
    while (this.parent[x] !== x) {
      this.parent[x] = this.parent[this.parent[x]];
      x = this.parent[x];
    }
    return x;
  }
  union(a, b) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent[ra] = rb;
  }
};
function cluster(comments, opts = {}) {
  const n = opts.charGram ?? 4;
  const threshold = opts.threshold ?? 0.7;
  const minTokens = opts.minTokens ?? 5;
  const eligible = comments.filter((c) => tokenCount(c.text) >= minTokens);
  const grams = eligible.map((c) => charGrams(c.text, n));
  const uf = new UnionFind(eligible.length);
  for (let i = 0; i < eligible.length; i++) {
    for (let j = i + 1; j < eligible.length; j++) {
      if (jaccard(grams[i], grams[j]) >= threshold) uf.union(i, j);
    }
  }
  const groups = /* @__PURE__ */ new Map();
  for (let i = 0; i < eligible.length; i++) {
    const root = uf.find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(eligible[i]);
  }
  const clusters = [];
  for (const members of groups.values()) {
    const distinctAuthors = new Set(members.map((m) => m.channelId));
    if (distinctAuthors.size < 2) continue;
    clusters.push({ members, repText: normalize(members[0].text) });
  }
  return clusters;
}

// src/time.ts
function parseRelMinutes(raw) {
  const s = raw.trim().toLowerCase();
  if (!s) return null;
  if (/just now|방금/u.test(s)) return 0;
  const num = s.match(/(\d+)/u);
  const n = num ? parseInt(num[1], 10) : null;
  if (/초|second/u.test(s)) return 0;
  if (n === null) return null;
  if (/분|minute|min\b/u.test(s)) return n;
  if (/시간|hour|hr\b/u.test(s)) return n * 60;
  if (/일|day/u.test(s)) return n * 1440;
  if (/주|week/u.test(s)) return n * 1440 * 7;
  if (/달|개월|month/u.test(s)) return n * 1440 * 30;
  if (/년|year/u.test(s)) return n * 1440 * 365;
  return null;
}

// src/burst.ts
function burst(cluster2) {
  const bucketAuthors = /* @__PURE__ */ new Map();
  for (const m of cluster2.members) {
    const mins = parseRelMinutes(m.relTime);
    if (mins === null) continue;
    if (!bucketAuthors.has(mins)) bucketAuthors.set(mins, /* @__PURE__ */ new Set());
    bucketAuthors.get(mins).add(m.channelId);
  }
  let maxAuthors = 0;
  for (const authors of bucketAuthors.values()) {
    if (authors.size > maxAuthors) maxAuthors = authors.size;
  }
  if (maxAuthors >= 5) return 1;
  if (maxAuthors >= 3) return 0.6;
  return 0;
}

// src/replyring.ts
function replyring(cluster2, _allComments = []) {
  const replies = cluster2.members.filter((m) => m.parentId !== null);
  const replyAuthors = new Set(replies.map((r) => r.channelId));
  if (replyAuthors.size === 0) return 0;
  const parents = new Set(replies.map((r) => r.parentId));
  const byParent = /* @__PURE__ */ new Map();
  for (const r of replies) {
    const p = r.parentId;
    if (!byParent.has(p)) byParent.set(p, /* @__PURE__ */ new Set());
    byParent.get(p).add(r.channelId);
  }
  const r2 = [...byParent.values()].some((a) => a.size >= 3);
  const r1 = parents.size >= 2;
  if ((r1 || r2) && replyAuthors.size >= 3) return 1;
  if (replyAuthors.size === 2) return 0.5;
  return 0;
}

// src/suppressor/chant-lexicon.ts
var CHANT_LEXICON = `
\uC0AC\uB791\uD574 \uC0AC\uB791\uD574\uC694 \uC624\uBE60 \uC624\uBE60\uB4E4 \uC5B8\uB2C8 \uB204\uB098 \uD615 \uBCF4\uB77C\uD574 \uC751\uC6D0 \uC751\uC6D0\uD574 \uC751\uC6D0\uD560\uAC8C \uCD5C\uC560 \uB355\uC9C8 \uC9C1\uCEA0 \uCEF4\uBC31
\uBB34\uB300 \uB5BC\uCC3D \uD654\uC774\uD305 \uD30C\uC774\uD305 \uAC00\uC988\uC544 \uB5A1\uC0C1 \uAC13 goat legend king queen icon slay
army \uC544\uBBF8 blink \uBE14\uB9C1\uD06C once \uC6D0\uC2A4 carat \uCE90\uB7FF stay \uC2A4\uD14C\uC774 moa \uBAA8\uC544 nctzen \uC5D4\uC2DC\uD2F0\uC98C
\uBC29\uD0C4 bts \uC815\uAD6D \uC9C0\uBBFC \uBDD4 \uC9C4 \uC288\uAC00 \uC81C\uC774\uD649 rm \uBE14\uB799\uD551\uD06C blackpink \uB274\uC9C4\uC2A4 newjeans
\uC0AC\uB791 \uCD5C\uACE0 \uC9F1 \uB300\uBC15 \uBA4B\uC838 \uBA4B\uC788\uC5B4 \uC608\uBED0 \uADC0\uC5EC\uC6CC \uBCF4\uACE0\uC2F6\uC5B4 \uC601\uC6D0\uD788 \uD3C9\uC0DD \uD56D\uC0C1 \uB298
rip \uBA85\uBCF5 \uACE0\uC778 \uC0BC\uAC00 \u3160\u3160 \u315C\u315C thank you \uAC10\uC0AC \uACE0\uB9C8\uC6CC \uC218\uACE0 \uC798\uBD24\uC5B4\uC694 \uC798\uBCF4\uACE0
first 1\uB4F1 \uC120\uCC29 \u314B\u314B\u314B \u314E\u314E\u314E lol haha real facts based w l
`.split(/\s+/u).filter(Boolean);

// src/suppressor/index.ts
var LEXICON_SET = new Set(CHANT_LEXICON.map((t) => normalize(t)));
var RIP_RE = /\b(rip|r\.?i\.?p)\b/iu;
var RIP_LITERALS = ["\uC0BC\uAC00 \uACE0\uC778", "\uACE0\uC778\uC758 \uBA85\uBCF5", "rest in peace"];
var FLOOD_RE = /^(ㅋ{3,}|ㅎ{3,}|(lol)+|(haha)+|😂|🤣)+$/u;
var STOP_CHANT = /* @__PURE__ */ new Set(["goat", "legend", "first", "w", "l", "real", "facts"]);
var EMOJI_RE2 = /\p{Extended_Pictographic}/u;
function suppressor(cluster2) {
  const tRaw = cluster2.members[0]?.text ?? "";
  const tNorm = cluster2.repText || normalize(tRaw);
  const rawLower = tRaw.toLowerCase();
  if (RIP_RE.test(tRaw) || RIP_RE.test(tNorm)) return true;
  if (RIP_LITERALS.some((l) => rawLower.includes(l) || tNorm.includes(l))) return true;
  const rawNoSpace = tRaw.toLowerCase().replace(/\s+/gu, "");
  if (rawNoSpace && FLOOD_RE.test(rawNoSpace)) return true;
  if (STOP_CHANT.has(tNorm.trim())) return true;
  const tokens = tNorm.split(" ").filter(Boolean);
  let hits = 0;
  for (const tok of tokens) if (LEXICON_SET.has(tok)) hits++;
  if (hits >= 2) return true;
  const cps = [...tRaw];
  if (cps.length > 0) {
    const emoji = cps.filter((c) => EMOJI_RE2.test(c)).length;
    if (emoji / cps.length >= 0.3) return true;
  }
  return false;
}

// src/age.ts
function ageSignal(cluster2, accountAgeDays) {
  if (!accountAgeDays || accountAgeDays.size === 0) return 0;
  let veryNew = 0;
  let recent = 0;
  for (const m of cluster2.members) {
    const age = accountAgeDays.get(m.channelId);
    if (age === void 0) continue;
    if (age <= 30) veryNew++;
    else if (age <= 180) recent++;
  }
  if (veryNew >= 2) return 1;
  if (recent >= 3) return 0.5;
  return 0;
}

// src/labels.ts
var HONEST_LABEL = "Matches coordinated-posting patterns in this video";
var SUPPRESSED_LABEL = "mass repetition (likely organic)";

// src/score.ts
var round2 = (x) => Math.round(x * 100) / 100;
function textSignal(distinctAuthors) {
  return Math.min(1, distinctAuthors / 5);
}
function autoStyleHandle(channelId) {
  const h = channelId.replace(/^@/, "");
  return /\d/u.test(h) && /^[a-z0-9]+$/iu.test(h) && h.length >= 6;
}
function score(cluster2, opts = {}) {
  const mode = opts.mode ?? "no-api";
  const distinctAuthors = new Set(cluster2.members.map((m) => m.channelId)).size;
  const T = textSignal(distinctAuthors);
  const B = burst(cluster2);
  const R = replyring(cluster2, cluster2.members);
  const A = mode === "api" ? ageSignal(cluster2, opts.accountAgeDays) : 0;
  const S = mode === "api" ? round2(0.4 * T + 0.25 * B + 0.2 * A + 0.15 * R) : round2(0.5 * T + 0.3 * B + 0.2 * R);
  const suppressed = suppressor(cluster2);
  const modeSignals = mode === "api" ? [T, B, A, R] : [T, B, R];
  const positive = modeSignals.filter((s) => s > 0).length;
  const flagged = S >= 0.7 && distinctAuthors >= 3 && positive >= 2 && !suppressed;
  const label = suppressed ? SUPPRESSED_LABEL : HONEST_LABEL;
  const evidence = composeEvidence(cluster2, { S, suppressed, flagged, R, A, distinctAuthors });
  return { S, flagged, suppressed, signals: { T, B, R, A }, size: distinctAuthors, label, evidence };
}
function composeEvidence(cluster2, ctx) {
  const n = ctx.distinctAuthors;
  if (ctx.suppressed) {
    return `${n} repeated comments \u2014 looks like a common reaction/chant, NOT flagged as coordinated.`;
  }
  const parts = [`${n} near-duplicate comments in the same recent window.`];
  if (ctx.R >= 1) parts.push("same text replied across multiple threads.");
  else if (ctx.R > 0) parts.push("reply pattern observed (sub-threshold).");
  if (ctx.A > 0) parts.push("multiple accounts recently created.");
  const autoCount = cluster2.members.filter((m) => autoStyleHandle(m.channelId)).length;
  if (autoCount > cluster2.members.length / 2) parts.push("(note: auto-style handles)");
  return parts.join(" ");
}

// src/inject.ts
var BADGE_CLASS = "coordcard-badge";
function ownerDoc(root) {
  const anyRoot = root;
  return anyRoot.ownerDocument ?? anyRoot;
}
function injectBadges(root, flagged) {
  const doc = ownerDoc(root);
  const nodeById = /* @__PURE__ */ new Map();
  for (const { comment, node } of scrapeEntries(root)) {
    nodeById.set(comment.id, node);
  }
  let count = 0;
  for (const { cluster: cluster2, result } of flagged) {
    if (!result.flagged) continue;
    const percent = Math.round(result.S * 100);
    for (const member of cluster2.members) {
      const node = nodeById.get(member.id);
      if (!node) continue;
      const existing = node.querySelector(`.${BADGE_CLASS}`);
      if (existing) {
        count++;
        continue;
      }
      const badge = doc.createElement("div");
      badge.className = BADGE_CLASS;
      badge.setAttribute("data-coordcard", "1");
      badge.textContent = `${result.label} \u2014 ${percent}% \xB7 ${result.evidence}`;
      node.insertBefore(badge, node.firstChild);
      count++;
    }
  }
  return count;
}

// src/scan.ts
function runScan(root, mode = "no-api") {
  const queryRoot = root;
  const comments = scrapeComments(queryRoot);
  const clusters = cluster(comments, { charGram: 4, threshold: 0.7, minTokens: 5 });
  const scored = clusters.map((c) => ({ cluster: c, result: score(c, { mode }) }));
  const flaggedClusters = scored.filter((s) => s.result.flagged);
  const badges = injectBadges(root, flaggedClusters);
  return {
    totalComments: comments.length,
    clusters: clusters.length,
    flagged: flaggedClusters.length,
    suppressed: scored.filter((s) => s.result.suppressed).length,
    badges,
    details: scored.map((s) => ({
      size: s.result.size,
      S: s.result.S,
      flagged: s.result.flagged,
      suppressed: s.result.suppressed,
      label: s.result.label,
      evidence: s.result.evidence
    }))
  };
}
export {
  runScan
};
