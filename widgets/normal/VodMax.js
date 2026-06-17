// Source pool: keep default sources small and tested so slow/bad APIs do not block Forward detail pages.
const SOURCES = [
    { id: "dyttzy", name: "电影天堂资源", baseUrl: "http://caiji.dyttzyapi.com/api.php/provide/vod", priority: 112, tier: "primary" },
    { id: "feifan", name: "非凡资源", baseUrl: "http://ffzy5.tv/api.php/provide/vod", priority: 110, tier: "primary" },
    { id: "ruyi", name: "如意资源", baseUrl: "https://cj.rycjapi.com/api.php/provide/vod", priority: 108, tier: "primary" },
    { id: "jisu", name: "极速资源", baseUrl: "https://jszyapi.com/api.php/provide/vod", priority: 106, tier: "primary" },
    { id: "ikun", name: "iKun资源", baseUrl: "https://ikunzyapi.com/api.php/provide/vod", priority: 104, tier: "primary" },
    { id: "hongniu", name: "红牛资源", baseUrl: "https://www.hongniuzy2.com/api.php/provide/vod", priority: 102, tier: "primary" },
    { id: "lezi", name: "乐子资源", baseUrl: "https://cj.lziapi.com/api.php/provide/vod", priority: 100, tier: "primary" },
    { id: "haihua", name: "海豚资源", baseUrl: "https://hhzyapi.com/api.php/provide/vod", priority: 98, tier: "primary" },
    { id: "baofeng", name: "暴风资源", baseUrl: "https://bfzyapi.com/api.php/provide/vod", priority: 96, tier: "primary" },
    { id: "zuida", name: "最大资源", baseUrl: "https://api.zuidapi.com/api.php/provide/vod", priority: 94, tier: "primary" },
    { id: "piaoling", name: "飘零资源", baseUrl: "https://p2100.net/api.php/provide/vod", priority: 88, tier: "fallback" },
    { id: "feifanapi", name: "非凡API", baseUrl: "https://api.ffzyapi.com/api.php/provide/vod", priority: 86, tier: "fallback" },
    { id: "wujin", name: "无尽资源", baseUrl: "https://api.wujinapi.me/api.php/provide/vod", priority: 84, tier: "fallback" },
    { id: "zy360", name: "360资源", baseUrl: "https://360zy.com/api.php/provide/vod", priority: 78, tier: "fallback" },
    { id: "mdzy", name: "魔都资源", baseUrl: "https://www.mdzyapi.com/api.php/provide/vod", priority: 72, tier: "fallback" }
];

const SOURCE_MAP = Object.fromEntries(SOURCES.map(source => [source.id, source]));
const FAST_SOURCE_IDS = ["dyttzy", "zuida", "lezi", "ruyi", "ikun", "jisu", "hongniu"].filter(id => SOURCE_MAP[id]);
const PRIMARY_SOURCE_IDS = SOURCES.filter(source => source.tier === "primary").map(source => source.id);
const FALLBACK_SOURCE_IDS = SOURCES.filter(source => source.tier === "fallback").map(source => source.id);
const CHINESE_NUMBERS = {
    "零": 0,
    "一": 1,
    "二": 2,
    "两": 2,
    "三": 3,
    "四": 4,
    "五": 5,
    "六": 6,
    "七": 7,
    "八": 8,
    "九": 9,
    "十": 10
};

WidgetMetadata = {
    id: "vod_max_stream_smart_20260615",
    title: "VOD资源聚合",
    description: "Forward 详情页资源解析，支持多源补全与季集智能匹配",
    author: "工位划水冠军",
    version: "5.4.9",
    requiredVersion: "0.0.1",
    site: "https://github.com/wrs0918/forward-widgets",
    detailCacheDuration: 900,
    modules: [
        {
            id: "loadResource",
            title: "加载资源",
            functionName: "loadResource",
            type: "stream",
            cacheDuration: 180,
            params: []
        }
    ]
};

// Basic utilities shared by CMS requests, title normalization, scoring, and Forward param parsing.
function buildHeaders() {
    return {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15",
        "Accept": "application/json, text/javascript, */*; q=0.01"
    };
}

function safeText(value) {
    if (value === null || value === undefined) return "";
    return String(value).trim();
}

function parseJson(data) {
    if (typeof data === "string") return JSON.parse(data);
    return data || {};
}

function unwrapData(value) {
    if (value && typeof value === "object" && value.data && typeof value.data === "object") return value.data;
    return value || {};
}

async function requestCms(source, params, timeout) {
    const response = await Widget.http.get(source.baseUrl, {
        params: Object.assign({ out: "json" }, params),
        headers: buildHeaders(),
        timeout: timeout || 4500
    });
    return parseJson(response.data);
}

function uniq(values) {
    const seen = new Set();
    const result = [];
    for (const value of values) {
        const text = safeText(value);
        if (!text || seen.has(text)) continue;
        seen.add(text);
        result.push(text);
    }
    return result;
}

function splitMultiValue(value, separator) {
    return safeText(value)
        .split(separator)
        .map(part => safeText(part))
        .filter(Boolean);
}

function stripHtml(text) {
    return safeText(text).replace(/<[^>]+>/g, "");
}

function normalizeText(value) {
    return safeText(value)
        .replace(/&amp;/g, "&")
        .replace(/（/g, "(")
        .replace(/）/g, ")")
        .replace(/[·•・]/g, "")
        .replace(/\s+/g, "")
        .toLowerCase();
}

function normalizeCompactText(value) {
    return normalizeText(value)
        .replace(/[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]/g, roman => ({ "Ⅰ": "1", "Ⅱ": "2", "Ⅲ": "3", "Ⅳ": "4", "Ⅴ": "5", "Ⅵ": "6", "Ⅶ": "7", "Ⅷ": "8", "Ⅸ": "9", "Ⅹ": "10" }[roman] || roman));
}

const CJK_VARIANT_CHARS = {
    "偵": "侦",
    "劇": "剧",
    "場": "场",
    "國": "国",
    "動畫": "动画",
    "畫": "画",
    "異": "异",
    "獸": "兽",
    "賊": "贼",
    "龍": "龙",
    "鬥": "斗",
    "話": "话",
    "學": "学",
    "樂": "乐",
    "們": "们",
    "體": "体",
    "夢": "梦"
};

const ORTHOGRAPHIC_TITLE_VARIANTS = [
    ["工房", "工坊"],
    ["夢", "梦"],
    ["異獸", "异兽"],
    ["名偵探", "名侦探"],
    ["海賊", "海贼"]
];

// Only keep generic writing variants here; title-specific aliases should come from dynamic metadata sources.
function normalizeCjkVariants(value) {
    let text = safeText(value);
    for (const [from, to] of Object.entries(CJK_VARIANT_CHARS)) {
        text = text.replace(new RegExp(from, "g"), to);
    }
    return text;
}

function looseTitleText(value) {
    return normalizeCjkVariants(normalizeCompactText(value))
        .replace(/工房/g, "工坊");
}

function hasSeparatedEmbeddedTitle(text, target) {
    if (!text || !target || !text.includes(target)) return false;
    const index = text.indexOf(target);
    if (index <= 0) return false;
    return /[：:之\-_]$/.test(text.slice(0, index));
}

function isHighEpisodeTvPayload(payload) {
    const ep = Number(payload && payload.episode) || extractIssueNumber(payload && payload.episodeName);
    if (ep < 80 || !payload || payload.mediaType !== "tv") return false;
    if (isLikelyVariety(payload, null)) return false;
    const text = [payload.title, payload.seriesName, payload.episodeName, payload.rawParams && payload.rawParams.originalTitle, payload.rawParams && payload.rawParams.originalName].map(safeText).join(" ");
    return ep >= 120 || isAnimeText(text) || /[\u3040-\u30ff]/.test(text);
}

function shouldFetchAnimeAliasSources(payload) {
    if (!payload || payload.mediaType === "movie") return false;
    if (isLikelyVariety(payload, null) || payload.domesticVariety || payload.isVariety) return false;
    const text = [payload.title, payload.seriesName, payload.episodeName, payload.rawParams && payload.rawParams.originalTitle, payload.rawParams && payload.rawParams.originalName].map(safeText).join(" ");
    return isAnimeText(text) || /[\u3040-\u30ff]/.test(text) || /[A-Za-z]{3,}/.test(text);
}

function chineseNumberToInt(value) {
    const text = safeText(value);
    if (!text) return 0;
    if (/^\d+$/.test(text)) return Number(text);
    if (text === "十") return 10;
    const tenIndex = text.indexOf("十");
    if (tenIndex >= 0) {
        const left = text.slice(0, tenIndex);
        const right = text.slice(tenIndex + 1);
        const tens = left ? (CHINESE_NUMBERS[left] || 0) : 1;
        const ones = right ? (CHINESE_NUMBERS[right] || 0) : 0;
        return tens * 10 + ones;
    }
    return CHINESE_NUMBERS[text] || 0;
}

function seasonNumberText(number) {
    const n = Number(number);
    if (!n) return "";
    const map = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
    if (n <= 10) return map[n];
    if (n < 20) return `十${map[n - 10]}`;
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    return `${map[tens]}十${ones ? map[ones] : ""}`;
}

function extractSeasonNumber(text) {
    const value = safeText(text);
    if (!value) return 0;

    let match = value.match(/(?:第\s*)?([一二两三四五六七八九十\d]{1,3})\s*季/);
    if (match) return chineseNumberToInt(match[1]);

    match = value.match(/\bseason\s*(\d{1,2})\b/i);
    if (match) return Number(match[1]);

    match = value.match(/\bs\s*0?(\d{1,2})\b/i);
    if (match) return Number(match[1]);

    match = value.match(/([\u4e00-\u9fa5A-Za-z]{2,})\s*(\d{1,2})(?:$|\s|[（(])/);
    if (match && Number(match[2]) > 1 && !/\d{4}/.test(match[0])) return Number(match[2]);

    return 0;
}

function extractTrailingTitleNumber(text) {
    const value = removeNoiseText(text)
        .replace(/(?:第\s*)?[一二两三四五六七八九十\d]{1,3}\s*季/g, "")
        .replace(/\bseason\s*\d{1,2}\b/gi, "")
        .replace(/\bs\s*0?\d{1,2}\b/gi, "")
        .trim();
    const match = value.match(/([\u4e00-\u9fa5A-Za-z]+)\s*(\d{1,2})(?:$|[（(])/);
    if (match && Number(match[2]) > 1 && !/\d{4}/.test(match[0])) return Number(match[2]);
    return 0;
}

function removeSeasonText(title) {
    return safeText(title)
        .replace(/(?:第\s*)?[一二两三四五六七八九十\d]{1,3}\s*季/g, "")
        .replace(/\bseason\s*\d{1,2}\b/gi, "")
        .replace(/\bs\s*0?\d{1,2}\b/gi, "")
        .replace(/([\u4e00-\u9fa5A-Za-z]{2,})\s*(\d{1,2})(?:$|\s|[（(])/, "$1")
        .trim();
}

function removeNoiseText(title) {
    return safeText(title)
        .replace(/&amp;/g, "&")
        .replace(/Ⅱ/g, "2")
        .replace(/Ⅰ/g, "1")
        .replace(/[\[\(（【].*?(粤语|国语|普通话|加更|超前|reaction|解说|预告|花絮|片花|特辑|中字|字幕).*?[\]\)）】]/gi, "")
        .replace(/粤语版|国语版|普通话版|粤语|国语|普通话|中字|字幕/g, "")
        .replace(/完整版|加更版|超前营业|reaction|电影解说|预告片?|花絮|片花|先导片|制作特辑|短视频/g, "")
        .replace(/[「」"'`]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function cleanSearchKeyword(title, options) {
    const shouldRemoveSeason = !options || options.removeSeason !== false;
    let value = removeNoiseText(title);
    if (shouldRemoveSeason) value = removeSeasonText(value);
    return value.replace(/[：:]\s*$/g, "").trim();
}

function normalizeTitle(title) {
    return normalizeCompactText(cleanSearchKeyword(title));
}

function isAuxiliaryTitle(title) {
    return /(解说|预告|花絮|reaction|片花|彩蛋|直播|cut|速看|短剧|制作特辑|幕后|纪录片|trailer|少爷)/i.test(safeText(title));
}

function isAnimeText(text) {
    return /(动漫|动画|番剧|日韩动漫|日本动漫|国产动漫|欧美动漫|国漫|新番|anime|animation)/i.test(safeText(text));
}

function isAnimePayload(payload, item) {
    const fields = [payload.title, payload.seriesName, payload.episodeName, item && item.vod_class, item && item.type_name, item && item.vod_area, item && item.vod_remarks, item && item.vod_name];
    const text = fields.map(safeText).join(" ");
    return isAnimeText(text) || isHighEpisodeTvPayload(payload);
}

function isSpecialSeasonPayload(payload) {
    return safeText(payload.season) === "0" || payload.seasonNumber === 0 && payload.explicitSeason;
}

function hasAnimeSpecialEvidence(text) {
    return /(ova|oad|oav|sp|special|特别篇|番外|番外篇|外传|总集篇|総集編|特典|剧场版|劇場版|先导|前传|篇：|篇:|篇$|ova版)/i.test(safeText(text));
}

function extractTotalEpisodes(text) {
    const value = safeText(text);
    const numbers = [];
    const patterns = [
        /(?:更新至|更至|全|共|第)\s*0*(\d{2,5})\s*(?:集|话|話|回)/g,
        /0*(\d{2,5})\s*(?:集|话|話|回)(?:完结|完)?/g
    ];
    for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(value))) {
            const number = Number(match[1]);
            if (number > 0) numbers.push(number);
        }
    }
    return numbers.length ? Math.max(...numbers) : 0;
}

function isLongAnimePayload(payload) {
    const ep = Number(payload.episode) || extractIssueNumber(payload.episodeName);
    return (isAnimePayload(payload, null) || isHighEpisodeTvPayload(payload)) && ep >= 80;
}

function isLongAnimeItem(item, episodes) {
    const text = [item && item.vod_name, item && item.vod_remarks, item && item.vod_class, item && item.type_name].map(safeText).join(" ");
    const total = Math.max(extractTotalEpisodes(text), Array.isArray(episodes) ? episodes.length : 0);
    return isAnimePayload({}, item) && total >= 80;
}

function titleWritingVariants(title) {
    const value = safeText(title);
    if (!value) return [];
    const variants = [value];
    const normalizedCjk = normalizeCjkVariants(value);
    if (normalizedCjk && normalizedCjk !== value) variants.push(normalizedCjk);
    for (const [a, b] of ORTHOGRAPHIC_TITLE_VARIANTS) {
        if (value.includes(a)) variants.push(value.replace(new RegExp(a, "g"), b));
        if (value.includes(b)) variants.push(value.replace(new RegExp(b, "g"), a));
    }
    return uniq(variants);
}

function titleCoreTokens(value) {
    const text = normalizeTitle(value)
        .replace(/第?[一二两三四五六七八九十\d]{1,3}季/g, "")
        .replace(/season\d{1,2}|s\d{1,2}/g, "");
    const chunks = text.split(/[：:之\-_\s]+/).filter(part => part.length >= 2);
    return uniq([text, ...chunks]).filter(part => part.length >= 2);
}

function titleTokenMatchesAny(value, targets) {
    const tokens = titleCoreTokens(value);
    const targetTokens = targets.flatMap(titleCoreTokens);
    if (!tokens.length || !targetTokens.length) return false;
    return tokens.some(token => targetTokens.some(target => token === target || token.includes(target) || target.includes(token)));
}

function isLikelyRelevantAlias(alias, payload) {
    const normalized = normalizeTitle(alias);
    if (!normalized) return false;
    const targetTitles = [payload.title, payload.seriesName, payload.rawParams && payload.rawParams.originalTitle, payload.rawParams && payload.rawParams.originalName, ...payload.aliases].filter(Boolean);
    if (!targetTitles.length) return true;
    if (titleTokenMatchesAny(alias, targetTitles)) return true;
    if (payload.isAnime && /[\u3040-\u30ff]/.test(alias)) return true;
    if (payload.isAnime && /[A-Za-z]/.test(alias) && /[A-Za-z]/.test(targetTitles.join(" "))) return true;
    return false;
}

function isLikelyVariety(payload, item) {
    const text = [payload.title, payload.seriesName, payload.episodeName, item && item.vod_class, item && item.type_name, item && item.vod_remarks].map(safeText).join(" ");
    return /(综艺|真人秀|脱口秀|晚会|加更|超前|会员版|演唱会|第\d+期|\d{8}期)/.test(text);
}

function isMoviePayload(payload) {
    return payload.mediaType === "movie" || (!payload.season && !payload.episode && payload.mediaType !== "tv");
}

function parseDateCode(text) {
    return parseDateCodes(text)[0] || "";
}

function parseDateCodes(text) {
    const value = safeText(text);
    const codes = [];
    const compactMatches = value.match(/20\d{6}/g) || [];
    codes.push(...compactMatches);

    const separatedPattern = /(20\d{2})[-/.年\s]*(\d{1,2})[-/.月\s]*(\d{1,2})日?/g;
    let separatedMatch;
    while ((separatedMatch = separatedPattern.exec(value))) {
        codes.push(`${separatedMatch[1]}${separatedMatch[2].padStart(2, "0")}${separatedMatch[3].padStart(2, "0")}`);
    }

    return uniq(codes);
}

function parseMonthDayCodes(text, payload) {
    const year = safeText(payload.year || safeText(payload.releaseDate).slice(0, 4));
    if (!year) return [];
    const value = safeText(text);
    const codes = [];
    const pattern = /(?<!\d)(\d{1,2})[-/.月](\d{1,2})日?(?!\d)/g;
    let match;
    while ((match = pattern.exec(value))) {
        codes.push(`${year}${match[1].padStart(2, "0")}${match[2].padStart(2, "0")}`);
    }
    return uniq(codes);
}

function parseAllDateCodes(text, payload) {
    return uniq([
        ...parseDateCodes(text),
        ...parseMonthDayCodes(text, payload || {})
    ]);
}

function parseDurationMinutes(value) {
    if (value === null || value === undefined || value === "") return 0;
    if (typeof value === "number") return value > 300 ? Math.round(value / 60) : Math.round(value);
    const text = safeText(value);
    if (!text || /20\d{2}[-/.年]/.test(text)) return 0;

    let match = text.match(/(\d{1,3})\s*(?:分钟|分鐘|min|mins)/i);
    if (match) return Number(match[1]);

    match = text.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (match) {
        const first = Number(match[1]);
        const second = Number(match[2]);
        const third = Number(match[3] || 0);
        return third ? first * 60 + second + Math.round(third / 60) : first * 60 + second;
    }

    if (/^\d{2,3}$/.test(text)) return Number(text);
    return 0;
}

function durationScore(requestedMinutes, item) {
    const requested = Number(requestedMinutes) || 0;
    if (!requested) return 0;
    const actual = parseDurationMinutes(item && (item.vod_duration || item.duration || item.runtime));
    if (!actual) return 0;
    const delta = Math.abs(actual - requested);
    if (delta <= 8) return 24;
    if (delta <= 20) return 8;
    if (delta >= 45) return -18;
    return 0;
}

// Domestic variety matching is identity-first: date, issue number, part, kind, and title tokens beat TMDB episode number.
function extractVarietyTags(text) {
    const value = safeText(text);
    const tags = [];
    const patterns = [
        ["plus", /加更|加料|衍生|万事屋/g],
        ["early", /超前|抢先|提前|超前营业|超前集结/g],
        ["member", /会员|VIP|尊享|APP专享|会员版/g],
        ["pure", /纯享|纯享版|舞台纯享|剧情纯享/g],
        ["part-up", /上(?:集|期|篇)?(?!海)/g],
        ["part-mid", /中(?:集|期|篇)?/g],
        ["part-down", /下(?:集|期|篇)?/g],
        ["special", /序|先导|特别|番外|外传|特辑|发布会|大赏|回顾|集结|名场面/g],
        ["behind", /花絮|彩蛋|超前彩蛋|未播|幕后|采访|专访|存档|副本解锁|补给站|直拍/g],
        ["trailer", /预告|trailer/g],
        ["cut", /cut|短视频|速看|reaction|解说/g]
    ];
    for (const [tag, pattern] of patterns) {
        if (pattern.test(value)) tags.push(tag);
    }
    return uniq(tags);
}

function varietyTagScore(label, payload) {
    const labelTags = extractVarietyTags(label);
    const requestedTags = extractVarietyTags([payload.episodeName, payload.title].join(" "));
    if (!labelTags.length && !requestedTags.length) return 28;
    if (!labelTags.length && requestedTags.length) return -45;
    if (labelTags.length && !requestedTags.length) return -90;

    let score = 0;
    for (const tag of requestedTags) {
        score += labelTags.includes(tag) ? 50 : -35;
    }
    for (const tag of labelTags) {
        if (!requestedTags.includes(tag)) score -= 20;
    }
    return score;
}

function episodeHasRequestedDate(label, payload) {
    if (!payload.dateCodes || !payload.dateCodes.length) return false;
    const labelDateCodes = parseAllDateCodes(label, payload);
    return payload.dateCodes.some(code => labelDateCodes.includes(code));
}

function dateCodeDistanceDays(left, right) {
    if (!/^\d{8}$/.test(safeText(left)) || !/^\d{8}$/.test(safeText(right))) return 9999;
    const leftTime = Date.UTC(Number(left.slice(0, 4)), Number(left.slice(4, 6)) - 1, Number(left.slice(6, 8)));
    const rightTime = Date.UTC(Number(right.slice(0, 4)), Number(right.slice(4, 6)) - 1, Number(right.slice(6, 8)));
    return Math.round(Math.abs(leftTime - rightTime) / 86400000);
}

function hasNearRequestedDate(requestedCodes, labelCodes, maxDays) {
    if (!requestedCodes || !requestedCodes.length || !labelCodes || !labelCodes.length) return false;
    return requestedCodes.some(requested => labelCodes.some(label => dateCodeDistanceDays(requested, label) <= maxDays));
}

function shouldHardFilterVarietyDate(identity) {
    if (!identity || !identity.dateCodes || !identity.dateCodes.length) return false;
    if (identity.fromEpisodeName && (identity.issueNumber || identity.part || identity.kind !== "normal" || identity.titleTokens.length)) return false;
    return true;
}

function varietyIdentityHeadText(text) {
    const value = safeText(text);
    const beforeColon = value.split(/[：:]/)[0];
    const colonTag = (value.match(/[：:]\s*((?:上|中|下)(?:集|期|篇)?|加更|还有加更|特别加更|纯享(?:版)?|舞台纯享|超前(?:营业|集结)?|会员版|APP专享|先导片?|预告|花絮|彩蛋|采访|专访|直拍|直播|发布会|特辑|回顾|名场面|副本解锁中|存档中|补给站中)(?:$|[\s)）\],，。！？!?:：-])/) || [])[1] || "";
    const dateIssueMatch = beforeColon.match(/^(?:第)?20\d{6}(?:期)?\s*(?:第\s*[一二两三四五六七八九十\d]{1,3}\s*期)?\s*(?:[(（]?[上中下][)）]?(?:集|期|篇)?)?/);
    const issueMatch = beforeColon.match(/^(?:(?!20\d{6})\d{1,2}[-/.月]\d{1,2}日?)?\s*第\s*[一二两三四五六七八九十\d]{1,3}\s*期\s*(?:[(（]?[上中下][)）]?(?:集|期|篇)?)?/);
    let explicitHead = "";
    if (dateIssueMatch) {
        explicitHead = dateIssueMatch[0];
        const hasPart = /[上中下](?:集|期|篇)?\s*$/.test(explicitHead);
        const rawTail = beforeColon.slice(dateIssueMatch[0].length);
        const tail = rawTail.trimStart();
        const tailTag = (tail.match(/^((?:先导片?|剧情)?纯享(?:版)?|舞台纯享|(?:万事屋|推门|特别|补给站)?加更(?:版)?|还有加更|超前彩蛋|超前(?:营业|集结)?|会员版|APP专享|先导片?|副本解锁中|存档中|补给站中|预告|花絮|彩蛋|采访|专访|迷妹专访|居民采访|直拍|直播|发布会|特辑|回顾|名场面|万事屋)(?=$|[\s)）\],，。！？!?:：-]|[上中下])/) || [])[1] || "";
        if (tailTag && (!hasPart || /^\s+|^[\-·:：()（）]/.test(rawTail) || /^(?:先导片?|剧情)?纯享|舞台纯享|(?:万事屋|推门|特别|补给站)?加更|还有加更|超前|会员版|APP专享|副本解锁|存档|补给站|预告|花絮|彩蛋|采访|专访|迷妹|居民采访|直拍|直播|发布会|特辑|回顾|名场面|万事屋/.test(tail))) explicitHead += tailTag;
        const tailPart = (tail.slice(tailTag.length).match(/^([上中下])(?:集|期|篇)?/) || [])[1] || "";
        if (tailPart && !hasPart) explicitHead += tailPart;
    } else if (issueMatch) {
        explicitHead = issueMatch[0];
        const hasPart = /[上中下](?:集|期|篇)?\s*$/.test(explicitHead);
        const rawTail = beforeColon.slice(issueMatch[0].length);
        const tail = rawTail.trimStart();
        const tailTag = (tail.match(/^((?:万事屋|推门|特别|补给站)?加更(?:版)?|还有加更|纯享(?:版)?|舞台纯享|超前(?:营业|集结)?|会员版|APP专享)(?=$|[\s)）\],，。！？!?:：-])/) || [])[1] || "";
        if (tailTag && (!hasPart || /^\s+|^[\-·:：()（）]/.test(rawTail))) explicitHead += tailTag;
    } else {
        explicitHead = (beforeColon.match(/^(?:20\d{6}|\d{1,2}[-/.月]\d{1,2}日?)?\s*(?:先导片?\s*(?:上|中|下)?|(?:还有|特别)?加更(?:版)?\s*(?:第\s*[一二两三四五六七八九十\d]{1,3}\s*期)?\s*(?:上|中|下)?|纯享(?:版)?\s*(?:第\s*[一二两三四五六七八九十\d]{1,3}\s*期)?\s*(?:上|中|下)?|舞台纯享\s*(?:第\s*[一二两三四五六七八九十\d]{1,3}\s*期)?\s*(?:上|中|下)?|超前彩蛋|超前(?:营业|集结)?\s*(?:第\s*[一二两三四五六七八九十\d]{1,3}\s*期)?\s*(?:上|中|下)?|[上中下](?:集|期|篇)?|会员版|APP专享|副本解锁中|存档中|补给站中|预告|花絮|彩蛋|采访|专访|直拍|直播|发布会|特辑|回顾|名场面)/) || [])[0] || "";
    }
    if (!explicitHead && beforeColon.length <= 12 && /特辑|企划|发布会|直播|回顾|名场面|大赏/.test(beforeColon)) explicitHead = beforeColon;
    return `${explicitHead} ${colonTag}`;
}

function extractVarietyKind(text) {
    const value = varietyIdentityHeadText(text);
    if (/预告|trailer/i.test(value)) return "trailer";
    if (/解说|reaction|速看|短视频|\bcut\b/i.test(value)) return "cut";
    if (/加更|加料|万事屋|推门加更|特别加更|补给站加更|还有加更/.test(value)) return "plus";
    if (/花絮|幕后|彩蛋|超前彩蛋|未播|采访|专访|存档|副本解锁|补给站|迷妹|居民采访|直拍/.test(value)) return "behind";
    if (/超前|抢先|提前|超前营业|超前集结/.test(value)) return "early";
    if (/纯享|剧情纯享|纯享版|纯享典藏|舞台纯享/.test(value)) return "pure";
    if (/会员|VIP|尊享|APP专享|会员版/.test(value)) return "member";
    if (/序篇?|先导片?|特别|番外|外传|特辑|发布会|大赏|端午企划|端午特辑|游戏特辑|回顾|直播|集结篇|线下集结|线上集结|空降直播|名场面/.test(value)) return "special";
    return "normal";
}

function extractPlusSubKind(text) {
    const value = varietyIdentityHeadText(text);
    if (/还有加更/.test(value)) return "more";
    if (/特别加更|推门加更|补给站加更|万事屋/.test(value)) return "special";
    if (/加更|加料/.test(value)) return "plus";
    return "";
}

function extractVarietyPart(text) {
    const value = safeText(text);
    const colonPart = (value.match(/[：:]\s*([上中下])(?:\s*(?:集|期|篇))?(?:$|[\s)）\],，。！？!?:：-])/) || [])[1] || "";
    const head = `${varietyIdentityHeadText(value)} ${colonPart}`;
    const marker = "(第\\s*[一二两三四五六七八九十\\d]{1,3}\\s*期|先导片?|加更|还有加更|特别加更|纯享(?:版)?|舞台纯享|超前(?:营业|集结)?|会员版|APP专享|(?:第)?20\\d{6}(?:期)?|\\d{1,2}[-/.月]\\d{1,2}日?)";
    if (new RegExp(`${marker}\\s*[(（:]?上[)）]?(?:集|期|篇)?`).test(head) || /[(（]上[)）]/.test(head)) return "up";
    if (/副本解锁中|存档中|补给站中/.test(head)) return "mid";
    if (new RegExp(`${marker}\\s*[(（:]?中[)）]?(?:集|期|篇)?`).test(head) || /[(（]中[)）]/.test(head)) return "mid";
    if (new RegExp(`${marker}\\s*[(（:]?下[)）]?(?:集|期|篇)?`).test(head) || /[(（]下[)）]/.test(head)) return "down";
    return "";
}

function extractIssueNumber(text) {
    const value = safeText(text).replace(/20\d{6}/g, " ");
    const patterns = [
        /第\s*0?(\d{1,3})\s*期/,
        /第\s*([一二两三四五六七八九十]{1,3})\s*期/,
        /(?:^|[^\d])0?(\d{1,3})\s*期/,
        /(?:^|[^\d])0?(\d{1,3})\s*[(（:]?[上下中][)）]?/,
        /第\s*0?(\d{1,3})\s*集/
    ];
    for (const pattern of patterns) {
        const match = value.match(pattern);
        if (!match) continue;
        const number = chineseNumberToInt(match[1]);
        if (number > 0 && number < 200) return number;
    }
    return 0;
}

function extractIdentityTokens(text) {
    const value = safeText(text)
        .replace(/20\d{6}/g, " ")
        .replace(/(?:20\d{2})[-/.年\s]*\d{1,2}[-/.月\s]*\d{1,2}日?/g, " ")
        .replace(/\d{1,2}[-/.月]\d{1,2}日?/g, " ")
        .replace(/第\s*[一二两三四五六七八九十\d]{1,3}\s*(?:期|集|话|回)/g, " ")
        .replace(/[上下中](?:集|期|篇)?/g, " ")
        .replace(/正片|完整版|加更版|纯享版|舞台纯享|剧情纯享|会员版|APP专享|超前营业|超前集结|超前彩蛋|先导片?|序篇?|特别加更|还有加更|特别|番外|外传|花絮|彩蛋|幕后|未播|采访|专访|存档|副本解锁中?|补给站|万事屋|迷妹|居民采访|发布会|大赏|特辑|端午企划|端午特辑|游戏特辑|回顾|直播|集结篇|线下集结|线上集结|空降直播|名场面|预告|解说|reaction|短视频|速看|直拍|cut/gi, " ")
        .replace(/[^\u4e00-\u9fa5A-Za-z0-9]+/g, " ");
    return uniq(value.split(/\s+/).map(part => part.trim()).filter(part => part.length >= 2 && part.length <= 12));
}

function buildEpisodeIdentity(text, payload) {
    const value = safeText(text);
    return {
        dateCodes: parseAllDateCodes(value, payload || {}),
        issueNumber: extractIssueNumber(value),
        part: extractVarietyPart(value),
        kind: extractVarietyKind(value),
        plusSubKind: extractPlusSubKind(value),
        titleTokens: extractIdentityTokens(value),
        seasonNumber: extractSeasonNumber(value),
        isAuxiliary: isAuxiliaryTitle(value),
        usedEpisodeFallback: false,
        fromEpisodeName: false
    };
}

function isDomesticVariety(payload, item) {
    const text = [payload.title, payload.seriesName, payload.episodeName, item && item.vod_class, item && item.type_name, item && item.vod_area, item && item.vod_remarks].map(safeText).join(" ");
    if (/(大陆综艺|内地综艺|国产综艺|大陆|内地|中国)/.test(text) && /(综艺|真人秀|脱口秀|晚会|演唱会|第\d+期|\d{8}|加更|纯享|超前)/.test(text)) return true;
    return /[\u4e00-\u9fa5]/.test(text) && /(综艺|真人秀|脱口秀|晚会|演唱会|第\d+期|\d{8}期|加更|纯享|超前|会员版|先导|花絮|番外|上期|下期)/.test(text);
}

function hasExplicitEpisodeMarker(identity) {
    return Boolean(identity && ((identity.dateCodes && identity.dateCodes.length) || identity.kind !== "normal" || identity.part || identity.issueNumber));
}

function hasExplicitEpisodeMarkerText(text, payload) {
    return hasExplicitEpisodeMarker(buildEpisodeIdentity(text, payload || {}));
}

function buildRequestedEpisodeIdentity(payload) {
    const fallbackTitle = hasExplicitEpisodeMarkerText(payload.title, payload) ? payload.title : "";
    const text = [payload.episodeName || fallbackTitle, payload.releaseDate].join(" ");
    const identity = buildEpisodeIdentity(text, payload);
    identity.fromEpisodeName = Boolean(payload.episodeName || fallbackTitle);
    const textLooksVariety = /[\u4e00-\u9fa5]/.test([payload.title, payload.seriesName].join(" ")) && Number(payload.seasonNumber) > 0;
    if (!identity.issueNumber && Number(payload.episode) > 0 && !hasReliableVarietyIdentity(identity) && !textLooksVariety) {
        identity.issueNumber = Number(payload.episode);
        identity.usedEpisodeFallback = true;
    }
    return identity;
}

function hasReliableVarietyIdentity(identity) {
    return Boolean(identity && ((identity.dateCodes && identity.dateCodes.length) || identity.kind !== "normal" || identity.part || (identity.titleTokens.length && identity.fromEpisodeName) || (identity.issueNumber && !identity.usedEpisodeFallback)));
}

function titleTokenOverlapScore(requestedTokens, labelTokens) {
    if (!requestedTokens.length || !labelTokens.length) return 0;
    let score = 0;
    for (const token of requestedTokens) {
        if (labelTokens.some(labelToken => labelToken.includes(token) || token.includes(labelToken))) score += 18;
    }
    return Math.min(score, 72);
}

function varietyIdentityScore(label, payload, item, index) {
    if (!isDomesticVariety(payload, item)) return null;

    const requested = payload.episodeIdentity || buildRequestedEpisodeIdentity(payload);
    const labelIdentity = buildEpisodeIdentity(label, payload);
    const ep = Number(payload.episode) || 0;
    let score = 0;

    const hardFilterDate = shouldHardFilterVarietyDate(requested);
    if (requested.dateCodes.length) {
        const dateMatched = requested.dateCodes.some(code => labelIdentity.dateCodes.includes(code));
        if (dateMatched) score += 360;
        else if (labelIdentity.dateCodes.length && requested.issueNumber && !labelIdentity.issueNumber && !hasNearRequestedDate(requested.dateCodes, labelIdentity.dateCodes, 1)) score -= 360;
        else if (labelIdentity.dateCodes.length) score -= hardFilterDate ? 460 : 65;
        else score -= hardFilterDate ? 180 : 18;
    }

    if (requested.kind !== "normal") {
        score += labelIdentity.kind === requested.kind ? 150 : -190;
        if (requested.kind === "plus" && requested.plusSubKind && labelIdentity.plusSubKind) {
            score += requested.plusSubKind === labelIdentity.plusSubKind ? 45 : -120;
        }
    } else if (labelIdentity.kind !== "normal") {
        score -= 140;
    } else {
        score += 60;
    }

    if (requested.part) {
        score += labelIdentity.part === requested.part ? 90 : -110;
    } else if (labelIdentity.part) {
        score -= 12;
    }

    score += titleTokenOverlapScore(requested.titleTokens, labelIdentity.titleTokens);
    if (requested.titleTokens.length && labelIdentity.titleTokens.length && !titleTokenOverlapScore(requested.titleTokens, labelIdentity.titleTokens)) score -= 84;

    if (requested.issueNumber && labelIdentity.issueNumber) {
        score += requested.issueNumber === labelIdentity.issueNumber ? 120 : -240;
    } else if (requested.issueNumber && !requested.usedEpisodeFallback && !labelIdentity.issueNumber && !(requested.dateCodes.length && (requested.kind !== "normal" || requested.part))) {
        score -= 120;
    } else if (!hasReliableVarietyIdentity(requested) && ep && index + 1 === ep) {
        score += 16;
    }

    if (labelIdentity.dateCodes.length) score += 18;
    if (/第\d+期|\d{8}|正片/.test(label)) score += 14;
    if (labelIdentity.isAuxiliary && requested.kind === "normal") score -= 160;
    return score;
}

function varietyIdentityMatchesStream(stream, payload) {
    if (!(payload.isVariety || payload.domesticVariety) || !(payload.episodeIdentity || payload.domesticVariety)) return true;
    const requested = payload.episodeIdentity || buildRequestedEpisodeIdentity(payload);
    const text = safeText(stream.name).split("·").pop();
    const identity = buildEpisodeIdentity(text, payload);

    const exactDateMatched = requested.dateCodes.length && requested.dateCodes.some(code => identity.dateCodes.includes(code));
    if (shouldHardFilterVarietyDate(requested) && requested.dateCodes.length && !exactDateMatched) return false;
    if (requested.dateCodes.length && identity.dateCodes.length && !exactDateMatched && requested.issueNumber && !identity.issueNumber) {
        if (!(requested.part && identity.part === requested.part && hasNearRequestedDate(requested.dateCodes, identity.dateCodes, 1))) return false;
    }
    if (requested.kind !== "normal" && identity.kind !== requested.kind) return false;
    if (requested.kind === "normal" && identity.kind !== "normal") return false;
    if (requested.kind === "plus" && requested.plusSubKind && identity.plusSubKind && requested.plusSubKind !== identity.plusSubKind) return false;
    if (requested.part && identity.part !== requested.part) {
        const exactDate = requested.dateCodes.length && requested.dateCodes.some(code => identity.dateCodes.includes(code));
        const specialDateOnly = exactDate && !identity.part && requested.kind !== "normal" && identity.kind === requested.kind;
        if (!specialDateOnly) return false;
    }
    if (requested.issueNumber && identity.issueNumber && requested.issueNumber !== identity.issueNumber) return false;
    if (requested.issueNumber && !requested.usedEpisodeFallback && !identity.issueNumber && !(requested.dateCodes.length && (requested.kind !== "normal" || requested.part))) return false;
    if (requested.kind !== "normal" && requested.issueNumber && !identity.issueNumber && !(requested.dateCodes.length && identity.dateCodes.length)) return false;
    if (requested.issueNumber && !requested.usedEpisodeFallback && identity.issueNumber && requested.issueNumber !== identity.issueNumber) return false;
    if (requested.titleTokens.length && identity.titleTokens.length && !titleTokenOverlapScore(requested.titleTokens, identity.titleTokens)) {
        const hasStrongEpisodeIdentity = (exactDateMatched || (requested.dateCodes.length && identity.dateCodes.length && hasNearRequestedDate(requested.dateCodes, identity.dateCodes, 1)))
            && (!requested.issueNumber || !identity.issueNumber || requested.issueNumber === identity.issueNumber)
            && (!requested.part || identity.part === requested.part)
            && requested.kind === identity.kind;
        if (!hasStrongEpisodeIdentity) return false;
    }
    return true;
}

// Alias enrichment is defensive and bounded; external alias APIs are fallback helpers, not runtime dependencies for every request.
function parseTitleList(value) {
    if (Array.isArray(value)) return value.map(safeText).filter(Boolean);
    if (value && typeof value === "object") return Object.values(value).map(safeText).filter(Boolean);
    return splitMultiValue(value, ",")
        .flatMap(part => splitMultiValue(part, "/"))
        .flatMap(part => splitMultiValue(part, "|"))
        .flatMap(part => splitMultiValue(part, ";"))
        .flatMap(part => splitMultiValue(part, "\n"));
}

function pickEpisodeName(params) {
    const candidates = [
        params.episodeName,
        params.episodeTitle,
        params.episode_title,
        params.epName,
        params.epTitle,
        params.subtitle,
        params.subTitle,
        params.partName,
        params.partTitle,
        params.currentEpisodeName,
        params.currentEpisodeTitle
    ];
    for (const value of candidates) {
        const text = safeText(value);
        if (text) return text;
    }

    const titleLikeValues = [params.name, params.titleName, params.displayTitle, params.title].map(safeText).filter(Boolean);
    for (const text of titleLikeValues) {
        if (hasExplicitEpisodeMarkerText(text, params)) return text;
    }
    return "";
}

async function requestJsonUrl(url, params, timeout) {
    const response = await Widget.http.get(url, {
        params: params || {},
        headers: buildHeaders(),
        timeout: timeout || 1600
    });
    return parseJson(response.data);
}

function normalizeAlias(alias) {
    return removeNoiseText(alias)
        .replace(/\s+/g, " ")
        .trim();
}

function aliasValueAllowed(alias, payload) {
    if (!alias || alias.length < 2 || alias.length > 50) return false;
    if (/列表|角色|人物|游戏|小說|小说|漫畫|漫画|原聲|原声|soundtrack|volume\s*\d+|vol\.\s*\d+|kitchen/i.test(alias)) return false;
    return true;
}

function cleanAliasList(values, payload, options) {
    const skipRelevance = Boolean(options && options.skipRelevance);
    const blocked = new Set([
        normalizeTitle(payload.title),
        normalizeTitle(payload.seriesName),
        ""
    ]);
    const aliases = [];
    const seen = new Set();
    for (const value of values) {
        const alias = normalizeAlias(value);
        const normalized = normalizeTitle(alias);
        if (!aliasValueAllowed(alias, payload)) continue;
        if (blocked.has(normalized) || seen.has(normalized)) continue;
        if (!skipRelevance && !isLikelyRelevantAlias(alias, payload)) continue;
        seen.add(normalized);
        aliases.push(alias);
    }
    aliases.sort((a, b) => {
        const aCjk = /[\u4e00-\u9fa5]/.test(a) ? 1 : 0;
        const bCjk = /[\u4e00-\u9fa5]/.test(b) ? 1 : 0;
        const aKana = /[\u3040-\u30ff]/.test(a) ? 1 : 0;
        const bKana = /[\u3040-\u30ff]/.test(b) ? 1 : 0;
        return (bCjk - aCjk) || (bKana - aKana) || (a.length - b.length);
    });
    return aliases.slice(0, 10);
}

function pushRelatedAliasGroup(aliases, values, payload) {
    const cleaned = values.map(normalizeAlias).filter(alias => aliasValueAllowed(alias, payload));
    if (!cleaned.length) return;
    if (cleaned.some(alias => isLikelyRelevantAlias(alias, payload))) aliases.push(...cleaned);
}

function pushAliasGroupFromSearchHit(aliases, values, payload, term) {
    const cleaned = values.map(normalizeAlias).filter(alias => aliasValueAllowed(alias, payload));
    if (!cleaned.length) return;
    const searchTerms = uniq([term, payload.title, payload.seriesName, payload.rawParams && payload.rawParams.originalTitle, payload.rawParams && payload.rawParams.originalName].filter(Boolean));
    if (cleaned.some(alias => isLikelyRelevantAlias(alias, payload)) || searchTerms.some(searchTerm => titleTokenMatchesAny(searchTerm, cleaned))) {
        aliases.push(...cleaned);
    }
}

async function fetchWikidataAliases(payload) {
    const terms = uniq([payload.title, payload.seriesName].filter(Boolean));
    const aliases = [];
    for (const term of terms.slice(0, 2)) {
        try {
            const data = await requestJsonUrl("https://www.wikidata.org/w/api.php", {
                action: "wbsearchentities",
                search: term,
                language: "zh",
                uselang: "zh",
                format: "json",
                type: "item",
                limit: 5,
                origin: "*"
            }, 1500);
            const rows = Array.isArray(data.search) ? data.search : [];
            for (const row of rows) {
                if (/video game|manga volume|album|soundtrack|character|episode/i.test(safeText(row.description))) continue;
                pushRelatedAliasGroup(aliases, [row.label, ...(Array.isArray(row.aliases) ? row.aliases : [])], payload);
            }
        } catch (error) {
            continue;
        }
    }
    return cleanAliasList(aliases, payload, { skipRelevance: true });
}

async function fetchTvmazeAliases(payload) {
    if (payload.mediaType && payload.mediaType !== "tv") return [];
    const terms = uniq([payload.title, payload.seriesName, payload.rawParams && payload.rawParams.originalTitle].filter(Boolean));
    const aliases = [];
    for (const term of terms.slice(0, 2)) {
        try {
            const searchData = await requestJsonUrl("https://api.tvmaze.com/search/shows", { q: term }, 1500);
            const show = Array.isArray(searchData) && searchData[0] ? searchData[0].show : null;
            if (!show || !show.id) continue;
            const groupAliases = [show.name];
            const akaData = await requestJsonUrl(`https://api.tvmaze.com/shows/${show.id}/akas`, {}, 1500);
            if (Array.isArray(akaData)) {
                for (const item of akaData.slice(0, 12)) groupAliases.push(item.name);
            }
            pushRelatedAliasGroup(aliases, groupAliases, payload);
        } catch (error) {
            continue;
        }
    }
    return cleanAliasList(aliases, payload, { skipRelevance: true });
}

async function fetchJikanAliases(payload) {
    if (payload.mediaType && payload.mediaType !== "tv") return [];
    if (!shouldFetchAnimeAliasSources(payload)) return [];
    const terms = uniq([payload.title, payload.seriesName, payload.rawParams && payload.rawParams.originalTitle, payload.rawParams && payload.rawParams.originalName].filter(Boolean));
    const aliases = [];
    for (const term of terms.slice(0, 2)) {
        try {
            const data = await requestJsonUrl("https://api.jikan.moe/v4/anime", { q: term, limit: 4 }, 1800);
            const rows = Array.isArray(data.data) ? data.data : [];
            for (const row of rows) {
                pushRelatedAliasGroup(aliases, [
                    row.title,
                    row.title_english,
                    row.title_japanese,
                    ...(Array.isArray(row.title_synonyms) ? row.title_synonyms : []),
                    ...(Array.isArray(row.titles) ? row.titles.map(item => item && item.title) : [])
                ], payload);
            }
        } catch (error) {
            continue;
        }
    }
    return cleanAliasList(aliases, payload, { skipRelevance: true });
}

async function fetchBangumiAliases(payload) {
    if (payload.mediaType && payload.mediaType !== "tv") return [];
    if (!shouldFetchAnimeAliasSources(payload)) return [];
    const terms = uniq([payload.title, payload.seriesName, payload.rawParams && payload.rawParams.originalTitle, payload.rawParams && payload.rawParams.originalName].filter(Boolean));
    const aliases = [];
    for (const term of terms.slice(0, 2)) {
        try {
            const data = await requestJsonUrl(`https://api.bgm.tv/search/subject/${encodeURIComponent(term)}`, {
                type: 2,
                responseGroup: "small",
                max_results: 5
            }, 1800);
            const rows = Array.isArray(data.list) ? data.list : [];
            for (const row of rows.slice(0, 5)) {
                pushAliasGroupFromSearchHit(aliases, [
                    row.name,
                    row.name_cn,
                    row.name_jp,
                    row.name_en
                ], payload, term);
            }
        } catch (error) {
            continue;
        }
    }
    return cleanAliasList(aliases, payload, { skipRelevance: true });
}

function collectTmdbTitleFields(value, aliases) {
    if (!value || typeof value !== "object") return [];
    const values = [value.title, value.name, value.original_title, value.original_name, value.english_name];
    if (value.data && typeof value.data === "object") {
        values.push(value.data.title, value.data.name, value.data.original_title, value.data.original_name);
    }
    if (aliases) aliases.push(...values);
    return values;
}

async function fetchTmdbTitleAliases(payload) {
    if (!payload.tmdbId || !Widget.tmdb || typeof Widget.tmdb.get !== "function") return [];
    const tmdbId = normalizeTmdbNumericId(payload.tmdbId);
    if (!tmdbId) return [];

    const type = payload.mediaType === "movie" ? "movie" : "tv";
    const aliases = [];
    const paths = [
        `${type}/${tmdbId}/alternative_titles`,
        `${type}/${tmdbId}/translations`
    ];

    for (const path of paths) {
        try {
            const data = unwrapData(await Widget.tmdb.get(path, { params: { language: "zh-CN" } }));
            pushRelatedAliasGroup(aliases, collectTmdbTitleFields(data), payload);
            const rows = []
                .concat(Array.isArray(data.titles) ? data.titles : [])
                .concat(Array.isArray(data.results) ? data.results : [])
                .concat(Array.isArray(data.translations) ? data.translations : []);
            for (const row of rows.slice(0, 30)) pushRelatedAliasGroup(aliases, collectTmdbTitleFields(row), payload);
        } catch (error) {
            continue;
        }
    }

    return cleanAliasList(aliases, payload, { skipRelevance: true });
}

async function fetchExternalAliases(payload) {
    const settled = await Promise.allSettled([
        fetchTmdbTitleAliases(payload),
        fetchWikidataAliases(payload),
        fetchTvmazeAliases(payload),
        fetchJikanAliases(payload),
        fetchBangumiAliases(payload)
    ]);
    const dynamicAliases = settled.flatMap(item => item.status === "fulfilled" ? item.value : []);
    return uniq(dynamicAliases);
}

function hasTmdbEpisodeLookupPayload(payload) {
    return Boolean(payload && payload.mediaType === "tv" && payload.tmdbId && payload.seasonNumber >= 0 && Number(payload.episode) > 0);
}

function normalizeTmdbNumericId(value) {
    const text = safeText(value);
    if (!text) return "";
    const parts = text.split(".");
    const tail = parts[parts.length - 1];
    const match = tail.match(/\d+/);
    return match ? match[0] : "";
}

function normalizeTmdbEpisodeData(data) {
    const unwrapped = unwrapData(data);
    if (Array.isArray(unwrapped)) return unwrapped[0] || {};
    if (unwrapped && typeof unwrapped === "object" && unwrapped.episode && typeof unwrapped.episode === "object") return unwrapped.episode;
    return unwrapped && typeof unwrapped === "object" ? unwrapped : {};
}

// Forward may omit episodeName in stream params even when the detail page shows it, so TMDB episode data fills that gap.
async function fetchTmdbEpisodeInfo(payload) {
    if (!hasTmdbEpisodeLookupPayload(payload) || !Widget.tmdb || typeof Widget.tmdb.get !== "function") return {};
    const tmdbId = normalizeTmdbNumericId(payload.tmdbId);
    if (!tmdbId) return {};
    const path = `tv/${tmdbId}/season/${payload.seasonNumber}/episode/${Number(payload.episode)}`;
    const languageOptions = ["zh-CN", "zh-Hans", "zh"];
    try {
        for (const language of languageOptions) {
            const data = normalizeTmdbEpisodeData(await Widget.tmdb.get(path, { params: { language: language } }));
            if (extractTmdbEpisodeName(data) || extractTmdbEpisodeAirDate(data)) return data;
        }
    } catch (error) {
        return {};
    }
    return {};
}

function extractTmdbEpisodeName(data) {
    return safeText(data && (data.name || data.title || data.episodeName || data.episode_title));
}

function extractTmdbEpisodeAirDate(data) {
    return safeText(data && (data.air_date || data.airDate || data.release_date || data.first_air_date));
}

async function enrichParamsFromTmdbEpisode(params, payload) {
    if (!hasTmdbEpisodeLookupPayload(payload)) return params || {};
    if (payload.episodeName && payload.releaseDate) return params || {};

    const data = await fetchTmdbEpisodeInfo(payload);
    const episodeName = payload.episodeName || extractTmdbEpisodeName(data);
    const airDate = payload.releaseDate || extractTmdbEpisodeAirDate(data);
    if (!episodeName && !airDate) return params || {};

    return Object.assign({}, params || {}, {
        episodeName: episodeName || safeText((params || {}).episodeName),
        airDate: airDate || safeText((params || {}).airDate)
    });
}

// Convert Forward params into one normalized payload used by search, scoring, and final filtering.
function buildStreamPayload(params) {
    const seriesName = safeText(params.seriesName);
    const episodeName = pickEpisodeName(params);
    const title = safeText(params.title || seriesName || episodeName || params.name || params.id);
    const mediaType = safeText(params.type);
    const season = safeText(params.season);
    const episode = safeText(params.episode);
    const seasonFromText = extractSeasonNumber([title, seriesName, episodeName].join(" "));
    const seasonNumber = Number(season) || seasonFromText || 0;
    const releaseDate = safeText(params.airDate || params.premiereDate || params.releaseDate || params.date);
    const year = safeText(params.year || releaseDate.slice(0, 4));
    const explicitSeason = safeText(params.season) !== "";
    const aliases = uniq([
        ...parseTitleList(params.aliases),
        ...parseTitleList(params.alternativeTitles),
        ...parseTitleList(params.alternateTitles),
        ...parseTitleList(params.otherTitles),
        safeText(params.originalTitle),
        safeText(params.originalName)
    ]);
    const seededAliases = uniq([
        ...aliases,
        ...titleWritingVariants(title),
        ...titleWritingVariants(seriesName),
        ...titleWritingVariants(params.originalTitle),
        ...titleWritingVariants(params.originalName)
    ]);

    const payload = {
        title: title,
        seriesName: seriesName,
        episodeName: episodeName,
        mediaType: mediaType,
        tmdbId: normalizeTmdbNumericId(params.tmdbId),
        imdbId: safeText(params.imdbId),
        season: season,
        seasonNumber: seasonNumber,
        explicitSeason: explicitSeason,
        episode: episode,
        releaseDate: releaseDate,
        dateCode: parseDateCode([episodeName, title, releaseDate].join(" ")),
        dateCodes: parseAllDateCodes([episodeName, title, releaseDate].join(" "), { year: year, releaseDate: releaseDate }),
        varietyTags: extractVarietyTags([episodeName, title].join(" ")),
        isVariety: /(综艺|真人秀|脱口秀|晚会|演唱会|加更|超前|会员版|纯享|第\d+期|\d{8}期)/.test([title, seriesName, episodeName].join(" ")),
        year: year,
        durationMinutes: parseDurationMinutes(params.duration || params.runtime || params.episodeRuntime || params.episodeDuration),
        aliases: seededAliases,
        link: safeText(params.link),
        rawParams: params || {}
    };
    payload.episodeIdentity = buildRequestedEpisodeIdentity(payload);
    payload.domesticVariety = isDomesticVariety(payload, null);
    payload.isAnime = isAnimePayload(payload, null);
    payload.longAnime = isLongAnimePayload(payload);
    payload.specialSeason = isSpecialSeasonPayload(payload);
    payload.animeSpecialSeason = payload.specialSeason && !payload.domesticVariety && !payload.isVariety;
    return payload;
}

function buildSearchKeywords(payload) {
    const season = payload.seasonNumber;
    const seasonChinese = seasonNumberText(season);
    const baseTitles = uniq([
        payload.seriesName,
        payload.title,
        ...payload.aliases,
        payload.episodeName && payload.seriesName ? payload.seriesName : "",
        payload.title.replace(/[：:]\s*.*$/g, ""),
        payload.title.replace(/[，,]\s*/g, " "),
        payload.title.replace(/\s+(\d{1,2})$/g, "$1")
    ]);

    const keywords = [];
    const specialKeywords = [];
    for (const title of baseTitles) {
        const cleanWithSeason = cleanSearchKeyword(title, { removeSeason: false });
        const cleanWithoutSeason = cleanSearchKeyword(title);
        keywords.push(cleanWithSeason);
        keywords.push(cleanWithSeason.replace(/\s+(\d{1,2})$/g, "$1"));
        if (payload.animeSpecialSeason && cleanWithoutSeason) {
            for (const suffix of ["OVA", "OAD", "SP", "特别篇", "番外", "外传", "总集篇", "特典"]) {
                specialKeywords.push(`${cleanWithoutSeason}${suffix}`);
                specialKeywords.push(`${cleanWithoutSeason} ${suffix}`);
            }
        }
        if (season > 1 && cleanWithoutSeason && !payload.longAnime) {
            keywords.push(`${cleanWithoutSeason}第${seasonChinese}季`);
            keywords.push(`${cleanWithoutSeason}${season}`);
        }
        keywords.push(cleanWithoutSeason);
    }

    if (isMoviePayload(payload) && payload.title.includes("：")) {
        keywords.push(payload.title.split("：")[0]);
    }

    const orderedKeywords = payload.animeSpecialSeason ? [...specialKeywords, ...keywords] : keywords;
    return uniq(orderedKeywords).slice(0, payload.animeSpecialSeason ? 18 : payload.longAnime ? 10 : 6);
}

// Candidate scoring decides which VOD detail pages are worth opening before we inspect playback lists.
function titleSimilarityScore(itemTitle, keyword, payload) {
    const item = normalizeTitle(itemTitle);
    const normalizedKeyword = normalizeTitle(keyword);
    const normalizedPayloadTitle = normalizeTitle(payload.title);
    const normalizedSeries = normalizeTitle(payload.seriesName);
    const aliasTitles = payload.aliases.map(normalizeTitle);
    const looseItem = looseTitleText(itemTitle);
    const looseKeyword = looseTitleText(keyword);
    const loosePayloadTitle = looseTitleText(payload.title);
    const looseSeries = looseTitleText(payload.seriesName);
    const looseAliases = payload.aliases.map(looseTitleText);
    let score = 0;

    if (!item || !normalizedKeyword) return -100;
    if (item === normalizedKeyword || item === normalizedPayloadTitle || (normalizedSeries && item === normalizedSeries) || aliasTitles.includes(item)) score += 170;
    else if (item.startsWith(normalizedKeyword) || normalizedKeyword.startsWith(item)) score += 120;
    else if (item.includes(normalizedKeyword) || normalizedKeyword.includes(item) || aliasTitles.some(alias => item.includes(alias) || alias.includes(item))) score += 90;
    else if (looseItem === looseKeyword || looseItem === loosePayloadTitle || (looseSeries && looseItem === looseSeries) || looseAliases.includes(looseItem)) score += 150;
    else if (looseItem.includes(looseKeyword) || looseKeyword.includes(looseItem) || looseAliases.some(alias => looseItem.includes(alias) || alias.includes(looseItem))) score += 84;

    if (payload.year && safeText(itemTitle).includes(payload.year)) score += 16;
    return score;
}

function strictTitlePenalty(item, payload) {
    const itemTitle = safeText(item.vod_name);
    const itemNormalized = normalizeTitle(itemTitle);
    const titleNormalized = normalizeTitle(payload.title);
    const seriesNormalized = normalizeTitle(payload.seriesName || payload.title);
    let penalty = 0;

    if (payload.title && titleNormalized.length >= 5 && itemNormalized && itemNormalized !== titleNormalized && !itemNormalized.includes(titleNormalized)) {
        const genericSeries = seriesNormalized && itemNormalized.includes(seriesNormalized);
        if (!genericSeries || isMoviePayload(payload)) penalty -= 80;
    }

    const requestedTitleNumber = extractTrailingTitleNumber(payload.title || payload.seriesName);
    const itemTitleNumber = extractTrailingTitleNumber(itemTitle);
    if (requestedTitleNumber && itemTitleNumber && requestedTitleNumber !== itemTitleNumber) penalty -= 220;
    if (requestedTitleNumber && !itemTitleNumber && normalizeTitle(removeSeasonText(itemTitle)) === normalizeTitle(removeSeasonText(payload.title))) penalty -= 160;

    return penalty;
}

function isTitlePolluted(item, payload) {
    const itemTitle = normalizeTitle(item.vod_name);
    const rawItemTitle = safeText(item.vod_name);
    const title = normalizeTitle(payload.title);
    const series = normalizeTitle(payload.seriesName || payload.title);
    const targets = uniq([title, series, ...payload.aliases.map(normalizeTitle)]).filter(Boolean);

    const requestedSpecial = payload.specialSeason || hasAnimeSpecialEvidence([payload.title, payload.seriesName, payload.episodeName].join(" "));
    if (/前传|后传|外传|番外|衍生/.test(rawItemTitle) && targets.some(target => itemTitle.includes(target)) && !targets.includes(itemTitle)) return true;
    if (payload.longAnime && !requestedSpecial && /(特别编辑版|剧场版|劇場版|真人版|真人|live\s*action|歌姬|女王|总集篇|総集編|特别篇|番外|外传|ova|oad|sp)/i.test(rawItemTitle)) return true;
    if (payload.longAnime && !requestedSpecial && targets.some(target => target && itemTitle.startsWith(target) && itemTitle !== target) && /(：|:|之|大电影|电影|the\s*movie|movie|粉丝来信|来信|狂热行动|强者天下|黄金城|红发|歌姬)/i.test(rawItemTitle)) return true;
    if (payload.longAnime && !requestedSpecial && targets.some(target => {
        if (!target || itemTitle === target || !itemTitle.startsWith(target)) return false;
        const suffix = itemTitle.slice(target.length);
        if (!suffix || /^\d+$/.test(suffix) || /^第[一二两三四五六七八九十\d]+季$/.test(suffix)) return false;
        return true;
    })) return true;
    if (payload.longAnime && !requestedSpecial && /(篇|篇章)/.test(rawItemTitle) && !/(篇|篇章)/.test([payload.title, payload.seriesName].join(" "))) return true;
    if (payload.longAnime && /(真人版|真人|live\s*action)/i.test(rawItemTitle)) return true;
    return targets.some(target => itemTitle.includes(target) && !itemTitle.startsWith(target) && !(payload.longAnime && hasSeparatedEmbeddedTitle(itemTitle, target)));
}

function isMovieTitleMatch(item, payload) {
    const itemTitle = normalizeTitle(item.vod_name);
    const requestedTitle = normalizeTitle(payload.title);
    if (!itemTitle || !requestedTitle) return false;
    if (itemTitle === requestedTitle) return true;

    const requestedTitleNumber = extractTrailingTitleNumber(payload.title || payload.seriesName);
    const itemTitleNumber = extractTrailingTitleNumber(item.vod_name);
    if (requestedTitleNumber && itemTitleNumber === requestedTitleNumber) {
        const itemBase = normalizeTitle(removeSeasonText(item.vod_name)).replace(String(itemTitleNumber), "");
        const requestedBase = normalizeTitle(removeSeasonText(payload.title)).replace(String(requestedTitleNumber), "");
        return itemBase === requestedBase;
    }

    return false;
}

function seasonMatchScore(item, payload) {
    if (!payload.seasonNumber) return 0;
    const text = [item.vod_name, item.vod_remarks, item.vod_class, item.type_name].map(safeText).join(" ");
    const itemSeason = extractSeasonNumber(text);
    const cleanItem = normalizeTitle(removeSeasonText(item.vod_name));
    const cleanSeries = normalizeTitle(removeSeasonText(payload.seriesName || payload.title));
    if (payload.longAnime && isAnimePayload(payload, item)) {
        if (itemSeason && itemSeason !== payload.seasonNumber) return -80;
        const total = extractTotalEpisodes(text);
        if (total >= Number(payload.episode || 0)) return 35;
    }
    if (itemSeason === payload.seasonNumber) return 120;
    if (itemSeason && itemSeason !== payload.seasonNumber) return -260;
    if (payload.explicitSeason && payload.seasonNumber === 1 && isLikelyVariety(payload, item) && cleanSeries && cleanItem && cleanItem.startsWith(cleanSeries) && cleanItem !== cleanSeries) return -150;
    if (payload.explicitSeason && payload.seasonNumber === 1) return 45;

    if (cleanItem && cleanSeries && cleanItem === cleanSeries) return -120;
    return -35;
}

function mediaTypeScore(item, payload) {
    const text = [item.vod_class, item.type_name, item.vod_area, item.vod_lang, item.vod_remarks, item.vod_name].map(safeText).join(" ");
    let score = 0;
    if (payload.mediaType === "movie" && /电影|动作|科幻|剧情|喜剧|恐怖|动画电影/.test(text)) score += 14;
    if (payload.mediaType === "tv" && /剧|电视剧|欧美|韩国|香港|日本|动漫|动画/.test(text)) score += 12;
    if (/香港|港剧|粤语/.test(payload.title) && /香港|港剧|粤语/.test(text)) score += 18;
    if (isLikelyVariety(payload, item) && /综艺|真人秀|第\d+期|加更/.test(text)) score += 18;
    return score;
}

function qualityScore(text) {
    const value = safeText(text);
    let score = 0;
    if (/2160p|4k|uhd|蓝光|blu-?ray|高码|无损/i.test(value)) score += 34;
    if (/1080p|1080|fhd|full\s*hd|HD中字|HD国语|HD粤语|HD/i.test(value)) score += 24;
    if (/720p|720/i.test(value)) score += 8;
    if (/正片|完整版|完结|已完结|全集/.test(value)) score += 8;
    if (/TC|HDTC|TS|CAM|枪版|抢先|尝鲜|预告|片花|解说|reaction|网盘|夸克|阿里云|迅雷|百度云|115|share\//i.test(value)) score -= 55;
    return score;
}

function scoreSearchMatch(item, payload, source, keyword) {
    if (!item || !item.vod_id || !item.vod_name) return -999;
    const itemNormalized = normalizeTitle(item.vod_name);
    const titleNormalized = normalizeTitle(payload.title);
    const requestedTitleNumber = extractTrailingTitleNumber(payload.title || payload.seriesName);
    const itemTitleNumber = extractTrailingTitleNumber(item.vod_name);

    if (requestedTitleNumber && itemTitleNumber !== requestedTitleNumber) return -999;
    if (isMoviePayload(payload) && titleNormalized.length >= 5 && !isMovieTitleMatch(item, payload)) {
        return -999;
    }
    if (isTitlePolluted(item, payload)) return -999;
    if (isAnimePayload(payload, item) && !payload.specialSeason && !hasAnimeSpecialEvidence([payload.title, payload.seriesName, payload.episodeName].join(" ")) && hasAnimeSpecialEvidence([item.vod_name, item.vod_remarks, item.vod_class, item.type_name].join(" "))) return -999;

    let score = source.priority || 0;
    score += titleSimilarityScore(item.vod_name, keyword, payload);
    score += strictTitlePenalty(item, payload);
    score += seasonMatchScore(item, payload);
    score += mediaTypeScore(item, payload);
    score += qualityScore([item.vod_name, item.vod_remarks, item.vod_class, item.type_name].join(" "));

    if (isAuxiliaryTitle(item.vod_name)) score -= 220;
    if (isMoviePayload(payload) && isAuxiliaryTitle([item.vod_name, item.vod_remarks, item.vod_class].join(" "))) score -= 260;
    return score;
}

async function searchSource(source, payload, keywords, timeout, options) {
    const results = [];
    const searchOptions = options || {};
    const keywordLimit = searchOptions.keywordLimit || (payload.animeSpecialSeason ? 14 : payload.longAnime ? 8 : timeout <= 2600 ? 3 : 5);
    for (const keyword of keywords.slice(0, keywordLimit)) {
        try {
            const data = await requestCms(source, { ac: "detail", wd: keyword }, timeout);
            const list = Array.isArray(data.list) ? data.list : [];
            for (const item of list) {
                const score = scoreSearchMatch(item, payload, source, keyword);
                if (score < source.priority + 45) continue;
                results.push({
                    sourceId: source.id,
                    vodId: String(item.vod_id),
                    score: score,
                    title: safeText(item.vod_name)
                });
            }
        } catch (error) {
            continue;
        }
    }
    return results;
}

function dedupeCandidates(results, limit) {
    results.sort((a, b) => b.score - a.score);

    const deduped = [];
    const seen = new Set();
    for (const result of results) {
        const key = `${result.sourceId}:${result.vodId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(result);
        if (deduped.length >= limit) break;
    }
    return deduped;
}

async function searchSourcesByIds(sourceIds, payload, keywords, timeout, options) {
    const settled = await Promise.allSettled(
        sourceIds.map(id => searchSource(SOURCE_MAP[id], payload, keywords, timeout, options))
    );
    return settled.flatMap(item => item.status === "fulfilled" ? item.value : []);
}

// Search in phases: fast primary sources first, then aliases/fallback sources only when results are not good enough.
async function searchCandidates(payload, options) {
    const searchOptions = options || {};
    const forceExternalAliases = Boolean(searchOptions.forceExternalAliases);
    const keywords = buildSearchKeywords(payload);
    const fastIds = FAST_SOURCE_IDS.filter(id => PRIMARY_SOURCE_IDS.includes(id));
    const fullIds = PRIMARY_SOURCE_IDS.filter(id => !fastIds.includes(id));
    let results = await searchSourcesByIds(fastIds, payload, keywords.slice(0, 3), 2600);
    let searchPayload = payload;

    if (!searchOptions.fastOnly && fullIds.length && results.length < 8) {
        results = results.concat(await searchSourcesByIds(fullIds, payload, keywords, 3600));
    }

    if (!searchOptions.fastOnly && (forceExternalAliases || results.length < 4 || payload.longAnime || payload.animeSpecialSeason)) {
        const externalAliases = await fetchExternalAliases(payload);
        if (externalAliases.length) {
            searchPayload = Object.assign({}, payload, { aliases: uniq([...(payload.aliases || []), ...externalAliases]) });
            const aliasKeywords = buildSearchKeywords(searchPayload);
            results = results.concat(await searchSourcesByIds(PRIMARY_SOURCE_IDS, searchPayload, aliasKeywords, 3600, { keywordLimit: forceExternalAliases ? 10 : 5 }));
        }
    }

    if (!searchOptions.fastOnly && results.length < 8) {
        results = results.concat(await searchSourcesByIds(FALLBACK_SOURCE_IDS, searchPayload, buildSearchKeywords(searchPayload).slice(0, 3), 3000));
    }

    return {
        candidates: dedupeCandidates(results, searchOptions.fastOnly ? 10 : 16),
        payload: searchPayload
    };
}

// Playback scoring works on CMS vod_play_url groups and picks the episode label that best matches the normalized payload.
function parseEpisodes(playGroup) {
    return splitMultiValue(playGroup, "#")
        .map(part => {
            const splitIndex = part.indexOf("$");
            if (splitIndex <= 0) return null;
            const title = safeText(part.slice(0, splitIndex)) || "正片";
            const videoUrl = safeText(part.slice(splitIndex + 1));
            if (!videoUrl) return null;
            return { title, videoUrl };
        })
        .filter(Boolean);
}

function scorePlayGroup(groupName, groupText, episodes, source) {
    let score = source.priority || 0;
    const sampleUrl = episodes[0] ? episodes[0].videoUrl : "";
    const text = `${groupName} ${groupText} ${sampleUrl}`.toLowerCase();

    if (text.includes(".m3u8")) score += 70;
    if (text.includes(".mp4")) score += 45;
    if (/https?:\/\//.test(text)) score += 18;
    if (text.includes("share/")) score -= 25;
    if (text.includes("quark") || text.includes("aliyun") || text.includes("115") || text.includes("迅雷")) score -= 45;
    if (isAuxiliaryTitle(groupName)) score -= 120;
    score += qualityScore(`${groupName} ${groupText}`);
    score += Math.min(episodes.length, 80);
    return score;
}

function normalizeEpisodeLabel(label) {
    return normalizeText(label)
        .replace(/第/g, "")
        .replace(/集|话|回|期|章/g, "")
        .replace(/episode/g, "e")
        .replace(/ep/g, "e")
        .replace(/正片/g, "");
}

function extractNumbers(text) {
    return (safeText(text).match(/\d+/g) || []).map(number => Number(number)).filter(Boolean);
}

function episodeNumberMatches(label, episodeNumber) {
    const ep = Number(episodeNumber) || 0;
    if (!ep) return false;
    const text = safeText(label);
    const normalized = normalizeEpisodeLabel(text);
    const padded = String(ep).padStart(2, "0");
    return new RegExp(`第0*${ep}(集|期|话|回)`).test(text)
        || new RegExp(`(^|[^0-9])0*${ep}([^0-9]|$)`).test(text)
        || normalized === String(ep)
        || normalized === padded
        || normalized === String(ep).padStart(3, "0")
        || normalized === String(ep).padStart(4, "0")
        || normalized.includes(`e${ep}`)
        || normalized.includes(`e${padded}`);
}

function isVarietyScheduleEpisode(label, payload) {
    const identity = buildEpisodeIdentity(label, payload);
    if (identity.kind === "trailer" || identity.kind === "cut") return false;
    if (identity.kind === "behind") return false;
    if (/回顾|特辑|直播|采访|专访|直拍|彩蛋|花絮|名场面|副本解锁|存档|发布会/.test(safeText(label))) return false;
    return Boolean(identity.dateCodes.length || identity.issueNumber || identity.part || identity.kind === "normal" || identity.kind === "plus" || identity.kind === "early" || identity.kind === "pure" || identity.kind === "member" || identity.kind === "special");
}

function varietyScheduleOrdinalScore(payload, ordinal) {
    const ep = Number(payload.episode) || 0;
    if (!ep || !ordinal) return 0;
    if (payload.episodeName || (payload.episodeIdentity && hasReliableVarietyIdentity(payload.episodeIdentity))) return 0;
    return ordinal === ep ? 210 : -90;
}

function isChineseTvWithoutEpisodeName(payload) {
    return Boolean(
        payload
        && payload.mediaType === "tv"
        && Number(payload.episode) > 0
        && !payload.episodeName
        && /[\u4e00-\u9fa5]/.test([payload.title, payload.seriesName].join(""))
    );
}

function streamLooksLikeVariety(stream, payload) {
    const text = safeText(stream && stream.name).split("·").pop();
    const identity = buildEpisodeIdentity(text, payload || {});
    return Boolean(identity.issueNumber || identity.part || identity.dateCodes.length || identity.kind !== "normal" || /期|先导|加更|纯享|超前|会员|花絮|彩蛋/.test(text));
}

function episodeMatchScore(label, payload, index, item, totalEpisodes, scheduleOrdinal) {
    if (isMoviePayload(payload)) return 0;

    const rawLabel = safeText(label);
    const normalized = normalizeEpisodeLabel(rawLabel);
    const ep = Number(payload.episode) || 0;
    const epText = ep ? String(ep) : "";
    const epPadded = ep ? String(ep).padStart(2, "0") : "";
    const hasRequestedDate = episodeHasRequestedDate(rawLabel, payload);
    const variety = isLikelyVariety(payload, item);
    let score = 0;
    const identityScore = varietyIdentityScore(rawLabel, payload, item, index);

    if (identityScore !== null) {
        if (payload.episodeIdentity && hasReliableVarietyIdentity(payload.episodeIdentity)) return identityScore;
        score += identityScore;
    }
    score += varietyScheduleOrdinalScore(payload, scheduleOrdinal);

    if (payload.seasonNumber && ep) {
        const seText = `s${String(payload.seasonNumber).padStart(2, "0")}e${epPadded}`;
        if (normalized.includes(seText)) score += 180;
    }
    if (ep && (normalized.includes(`e${epText}`) || normalized.includes(`e${epPadded}`))) score += 130;
    if (ep && episodeNumberMatches(rawLabel, ep)) score += payload.longAnime ? 220 : variety ? 8 : 100;
    if (ep && index + 1 === ep && totalEpisodes > 1) score += payload.longAnime ? 8 : variety ? 4 : 55;

    if (hasRequestedDate) score += variety ? 260 : 180;
    if (payload.episodeName) {
        const epName = normalizeText(payload.episodeName);
        if (epName && normalizeText(rawLabel).includes(epName)) score += 120;
    }

    if (variety) {
        if (identityScore === null) score += varietyTagScore(rawLabel, payload);
        if (payload.dateCodes && payload.dateCodes.length && !hasRequestedDate) score -= 260;
        if (/第\d+期|\d{8}/.test(rawLabel)) score += 24;
        if (!ep && !(payload.dateCodes && payload.dateCodes.length) && totalEpisodes && index === totalEpisodes - 1) score += 8;
        score += durationScore(payload.durationMinutes, item);
    }

    const numbers = extractNumbers(rawLabel);
    if (ep && numbers.includes(ep)) score += 18;
    return score;
}

function buildStreamDescription(source, item, totalEpisodes, groupName) {
    const bits = [];
    bits.push(source.name);
    if (safeText(item.vod_name)) bits.push(safeText(item.vod_name));
    if (safeText(item.vod_remarks)) bits.push(safeText(item.vod_remarks));
    if (safeText(groupName)) bits.push(safeText(groupName));
    if (totalEpisodes > 1) bits.push(`共${totalEpisodes}集`);
    return bits.join(" | ");
}

function parseEpisodeCandidates(item, source, payload) {
    const playFromList = splitMultiValue(item.vod_play_from, "$$$");
    const playUrlGroups = splitMultiValue(item.vod_play_url, "$$$");
    const candidates = [];
    const movie = isMoviePayload(payload);

    for (let groupIndex = 0; groupIndex < playUrlGroups.length; groupIndex += 1) {
        const playGroup = playUrlGroups[groupIndex];
        const groupName = playFromList[groupIndex] || `线路${groupIndex + 1}`;
        const episodes = parseEpisodes(playGroup);
        if (!episodes.length) continue;
        const itemEvidenceText = [item.vod_name, item.vod_remarks, item.vod_class, item.type_name, groupName].map(safeText).join(" ");

        if (payload.animeSpecialSeason && isAnimePayload(payload, item) && !hasAnimeSpecialEvidence(itemEvidenceText)) {
            continue;
        }

        if (movie) {
            const firstPlayable = episodes.find(episode => !isAuxiliaryTitle(episode.title)) || episodes[0];
            candidates.push({
                name: `${source.name} · ${groupName}`,
                description: buildStreamDescription(source, item, episodes.length, groupName),
                url: firstPlayable.videoUrl,
                score: scorePlayGroup(groupName, playGroup, episodes, source)
            });
            continue;
        }

        let matchedAny = false;
        let varietyScheduleOrdinal = 0;
        for (let index = 0; index < episodes.length; index += 1) {
            const episode = episodes[index];
            if (isAuxiliaryTitle(episode.title) && extractVarietyKind(payload.episodeName) === "normal") continue;
            const shouldUseScheduleOrdinal = (isLikelyVariety(payload, item) || isChineseTvWithoutEpisodeName(payload)) && isVarietyScheduleEpisode(episode.title, payload);
            const scheduleOrdinal = shouldUseScheduleOrdinal ? ++varietyScheduleOrdinal : 0;
            const matchScore = episodeMatchScore(episode.title, payload, index, item, episodes.length, scheduleOrdinal);
            if (matchScore <= 0) continue;
            matchedAny = true;
            candidates.push({
                name: `${source.name} · ${episode.title}`,
                description: buildStreamDescription(source, item, episodes.length, groupName),
                url: episode.videoUrl,
                score: scorePlayGroup(groupName, playGroup, [episode], source) + matchScore
            });
        }

        if (!matchedAny && isLikelyVariety(payload, item) && payload.seasonNumber && seasonMatchScore(item, payload) > 0 && !(payload.dateCodes && payload.dateCodes.length) && !(payload.episodeIdentity && hasReliableVarietyIdentity(payload.episodeIdentity))) {
            const fallbackEpisode = episodes[episodes.length - 1];
            candidates.push({
                name: `${source.name} · ${fallbackEpisode.title}`,
                description: buildStreamDescription(source, item, episodes.length, groupName),
                url: fallbackEpisode.videoUrl,
                score: scorePlayGroup(groupName, playGroup, [fallbackEpisode], source) + 8
            });
        }
    }

    candidates.sort((a, b) => b.score - a.score);
    return candidates;
}

function derivePayloadForItem(payload, item) {
    const playGroups = splitMultiValue(item && item.vod_play_url, "$$$");
    const maxEpisodes = playGroups.reduce((max, group) => Math.max(max, parseEpisodes(group).length), 0);
    const evidenceText = [item && item.vod_name, item && item.vod_remarks, item && item.vod_class, item && item.type_name].map(safeText).join(" ");
    const totalEpisodes = Math.max(maxEpisodes, extractTotalEpisodes(evidenceText));
    if (totalEpisodes >= 80 && isAnimePayload(payload, item)) {
        return Object.assign({}, payload, {
            isAnime: true,
            longAnime: true,
            aliases: uniq([...(payload.aliases || []), safeText(item && item.vod_name)])
        });
    }
    return payload;
}

async function fetchStreamsByCandidate(candidate, payload) {
    const source = SOURCE_MAP[candidate.sourceId];
    if (!source) return [];

    try {
        const data = await requestCms(source, { ac: "detail", ids: candidate.vodId }, 4600);
        const item = Array.isArray(data.list) ? data.list[0] : null;
        if (!item || isAuxiliaryTitle([item.vod_name, item.vod_remarks, item.vod_class].join(" "))) return [];
        const itemPayload = derivePayloadForItem(payload, item);
        if (itemPayload.animeSpecialSeason && isAnimePayload(itemPayload, item) && !hasAnimeSpecialEvidence([item.vod_name, item.vod_remarks, item.vod_class, item.type_name].join(" "))) return [];
        if (!hasAnimeSpecialEvidence([itemPayload.title, itemPayload.seriesName, itemPayload.episodeName].join(" ")) && /(真人版|真人剧|live\s*action)/i.test([item.vod_name, item.vod_remarks, item.vod_class, item.type_name].join(" "))) return [];
        if (itemPayload.explicitSeason && itemPayload.seasonNumber && seasonMatchScore(item, itemPayload) < 0) return [];
        return parseEpisodeCandidates(item, source, itemPayload);
    } catch (error) {
        return [];
    }
}

function dedupeStreams(streams) {
    const deduped = [];
    const seenUrls = new Set();
    const seenNames = new Set();
    for (const stream of streams) {
        if (!stream || !stream.url || seenUrls.has(stream.url)) continue;
        const nameKey = `${stream.name}:${stream.url}`;
        if (seenNames.has(nameKey)) continue;
        seenUrls.add(stream.url);
        seenNames.add(nameKey);
        deduped.push({
            name: stream.name,
            description: stream.description,
            url: stream.url
        });
        if (deduped.length >= 14) break;
    }
    return deduped;
}

async function resolveCandidateStreams(candidates, payload, limit) {
    const streamGroups = await Promise.allSettled(
        candidates.slice(0, limit).map(candidate => fetchStreamsByCandidate(candidate, payload))
    );
    return streamGroups
        .flatMap(item => item.status === "fulfilled" ? item.value : [])
        .sort((a, b) => b.score - a.score);
}

function hasEnoughStreams(streams, payload) {
    const filtered = filterExactEpisodeStreams(streams, payload);
    if (filtered.length >= 5) return true;
    if ((payload.domesticVariety || payload.isVariety) && payload.episodeIdentity && hasReliableVarietyIdentity(payload.episodeIdentity)) {
        return filtered.length > 0;
    }
    return false;
}

function filterExactEpisodeStreams(streams, payload) {
    if (isMoviePayload(payload)) return streams;
    let filteredStreams = streams;
    const hasReliableIdentity = payload.episodeIdentity && hasReliableVarietyIdentity(payload.episodeIdentity);

    if (payload.domesticVariety || (payload.isVariety && payload.episodeIdentity)) {
        const identityStreams = filteredStreams.filter(stream => varietyIdentityMatchesStream(stream, payload));
        if (identityStreams.length) filteredStreams = identityStreams;
        if (hasReliableIdentity && identityStreams.length) return identityStreams;
    }

    if (!hasReliableIdentity && payload.dateCodes && payload.dateCodes.length) {
        const exactDate = filteredStreams.filter(stream => episodeHasRequestedDate(`${stream.name} ${stream.description}`, payload));
        if (exactDate.length) return exactDate;
    }

    if (payload.isVariety && payload.varietyTags && payload.varietyTags.length) {
        const exactTags = filteredStreams.filter(stream => {
            const tags = extractVarietyTags(`${stream.name} ${stream.description}`);
            return payload.varietyTags.every(tag => tags.includes(tag));
        });
        if (exactTags.length) filteredStreams = exactTags;
    } else if (payload.isVariety) {
        const plainStreams = filteredStreams.filter(stream => !extractVarietyTags(`${stream.name} ${stream.description}`).length);
        if (plainStreams.length) filteredStreams = plainStreams;
    }

    const episodeNumber = Number(payload.episode) || 0;
    if (episodeNumber && isChineseTvWithoutEpisodeName(payload) && filteredStreams.some(stream => streamLooksLikeVariety(stream, payload))) {
        return filteredStreams;
    }

    if (payload.isVariety && episodeNumber) {
        const exactVarietyEpisode = filteredStreams.filter(stream => episodeNumberMatches(stream.name, episodeNumber));
        if (exactVarietyEpisode.length) return exactVarietyEpisode;
        if (payload.varietyTags && payload.varietyTags.length) return [];
    }

    if (episodeNumber) {
        const exactEpisode = filteredStreams.filter(stream => {
            const text = `${stream.name} ${stream.description}`;
            return episodeNumberMatches(text, episodeNumber);
        });
        if (exactEpisode.length) return exactEpisode;
    }

    return filteredStreams;
}

// Forward stream entrypoint. Keep the flow staged so a few slow sources cannot hold back already-good results.
async function loadResource(params) {
    const rawParams = params || {};
    let payload = buildStreamPayload(rawParams);
    const enrichedParams = await enrichParamsFromTmdbEpisode(rawParams, payload);
    if (enrichedParams !== rawParams) payload = buildStreamPayload(enrichedParams);
    if (!payload.title && !payload.seriesName) return [];

    let searchResult = await searchCandidates(payload, { fastOnly: true });
    let candidates = searchResult.candidates;
    let resolvedPayload = searchResult.payload || payload;
    let streams = await resolveCandidateStreams(candidates, resolvedPayload, 6);
    const resolvedCandidateKeys = new Set(candidates.slice(0, 6).map(candidate => `${candidate.sourceId}:${candidate.vodId}`));

    if (!hasEnoughStreams(streams, resolvedPayload)) {
        searchResult = await searchCandidates(payload, { fastOnly: false, forceExternalAliases: filterExactEpisodeStreams(streams, resolvedPayload).length < 5 });
        candidates = searchResult.candidates;
        resolvedPayload = searchResult.payload || payload;
        const remainingCandidates = candidates.filter(candidate => !resolvedCandidateKeys.has(`${candidate.sourceId}:${candidate.vodId}`));
        const moreStreams = await resolveCandidateStreams(remainingCandidates, resolvedPayload, 8);
        streams = streams.concat(moreStreams).sort((a, b) => b.score - a.score);
    }

    return dedupeStreams(filterExactEpisodeStreams(streams, resolvedPayload));
}
