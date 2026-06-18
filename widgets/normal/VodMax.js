// 源池只保留默认启用的稳定源，避免慢源或坏源拖住 Forward 详情页。
const SOURCES = [
    { id: "dyttzy", name: "电影天堂资源", baseUrl: "http://caiji.dyttzyapi.com/api.php/provide/vod", priority: 116, tier: "fastPreferred" },
    { id: "ruyi", name: "如意资源", baseUrl: "https://cj.rycjapi.com/api.php/provide/vod", priority: 114, tier: "fastPreferred" },
    { id: "ikun", name: "iKun资源", baseUrl: "https://ikunzyapi.com/api.php/provide/vod", priority: 112, tier: "fastPreferred" },
    { id: "wujin", name: "无尽资源", baseUrl: "https://api.wujinapi.com/api.php/provide/vod", priority: 110, tier: "fastPreferred" },
    { id: "zuida", name: "最大资源", baseUrl: "https://api.zuidapi.com/api.php/provide/vod", priority: 108, tier: "fastPreferred" },
    { id: "baofeng", name: "暴风资源", baseUrl: "https://bfzyapi.com/api.php/provide/vod", priority: 106, tier: "fastPreferred" },
    { id: "feifan", name: "非凡资源", baseUrl: "http://ffzy5.tv/api.php/provide/vod", priority: 104, tier: "balancedPrimary" },
    { id: "lezi", name: "乐子资源", baseUrl: "https://cj.lziapi.com/api.php/provide/vod", priority: 100, tier: "balancedPrimary" },
    { id: "hongniu", name: "红牛资源", baseUrl: "https://www.hongniuzy2.com/api.php/provide/vod", priority: 98, tier: "balancedPrimary" },
    { id: "haihua", name: "海豚资源", baseUrl: "https://hhzyapi.com/api.php/provide/vod", priority: 96, tier: "balancedPrimary" },
    { id: "jisu", name: "极速资源", baseUrl: "https://jszyapi.com/api.php/provide/vod", priority: 94, tier: "balancedPrimary" },
    { id: "piaoling", name: "飘零资源", baseUrl: "https://p2100.net/api.php/provide/vod", priority: 90, tier: "fallbackProbe" },
    { id: "feifanapi", name: "非凡API", baseUrl: "https://api.ffzyapi.com/api.php/provide/vod", priority: 88, tier: "fallbackProbe" },
    { id: "zy360", name: "360资源", baseUrl: "https://360zy.com/api.php/provide/vod", priority: 82, tier: "fallbackProbe" },
    { id: "mdzy", name: "魔都资源", baseUrl: "https://www.mdzyapi.com/api.php/provide/vod", priority: 80, tier: "fallbackProbe" },
    { id: "huya", name: "虎牙资源", baseUrl: "https://www.huyaapi.com/api.php/provide/vod", priority: 76, tier: "fallbackProbe" }
];

const SOURCE_MAP = Object.fromEntries(SOURCES.map(source => [source.id, source]));
const FAST_SOURCE_IDS = SOURCES.filter(source => source.tier === "fastPreferred").map(source => source.id);
const BALANCED_SOURCE_IDS = SOURCES.filter(source => source.tier === "balancedPrimary").map(source => source.id);
const PRIMARY_SOURCE_IDS = [...FAST_SOURCE_IDS, ...BALANCED_SOURCE_IDS];
const FALLBACK_SOURCE_IDS = SOURCES.filter(source => source.tier === "fallbackProbe").map(source => source.id);
const SPECIAL_ANIME_SOURCE_IDS = ["baofeng", "lezi", "ruyi", "wujin", "huya", "dyttzy"].filter(id => SOURCE_MAP[id]);
const VARIETY_SOURCE_IDS = ["dyttzy", "ruyi", "ikun", "feifan", "jisu", "hongniu", "lezi"].filter(id => SOURCE_MAP[id]);
const MATCH_CACHE = {
    normalizeTitle: new Map(),
    looseTitle: new Map(),
    episodeIdentity: new Map(),
    varietyTags: new Map(),
    episodes: new Map()
};
const SPECIAL_EPISODE_TAGS = ["OVA", "OAD", "SP", "特别篇", "番外", "外传", "总集篇", "特典", "短篇", "休息时间", "先导片", "加更", "纯享", "会员版", "花絮", "幕后", "特辑", "纪录片"];
const SPECIAL_EPISODE_EVIDENCE_RE = /(ova|oad|oav|\bsp\b|special|特别篇|番外|番外篇|外传|总集篇|総集編|特典|剧场版|劇場版|先导片?|前传|短篇|休息时间|小剧场|小劇場|迷你动画|迷你劇|加更|纯享|會員|会员|vip|花絮|幕后|特辑|特別|纪录片|紀錄片|篇：|篇:|篇$|ova版)/i;
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
    version: "5.4.14",
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

// 构造请求苹果 CMS 接口时复用的移动端 JSON 请求头。
function buildHeaders() {
    return {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15",
        "Accept": "application/json, text/javascript, */*; q=0.01"
    };
}

// 把任意输入安全转成去首尾空白的字符串。
function safeText(value) {
    if (value === null || value === undefined) return "";
    return String(value).trim();
}

// 兼容 Widget.http 已解析对象和字符串 JSON 两种返回。
function parseJson(data) {
    if (typeof data === "string") return JSON.parse(data);
    return data || {};
}

// 解开部分 Forward/TMDB 包装在 data 字段里的对象。
function unwrapData(value) {
    if (value && typeof value === "object" && value.data && typeof value.data === "object") return value.data;
    return value || {};
}

// 请求单个苹果 CMS 源，并统一附加 out=json 与超时。
async function requestCms(source, params, timeout) {
    const response = await Widget.http.get(source.baseUrl, {
        params: Object.assign({ out: "json" }, params),
        headers: buildHeaders(),
        timeout: timeout || 4500
    });
    return parseJson(response.data);
}

// 按字符串值去重，同时过滤空值并保留原顺序。
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

// 拆分源字段里的多值字符串，并清理空片段。
function splitMultiValue(value, separator) {
    return safeText(value)
        .split(separator)
        .map(part => safeText(part))
        .filter(Boolean);
}

// 去掉 CMS 文本字段里可能混入的 HTML 标签。
function stripHtml(text) {
    return safeText(text).replace(/<[^>]+>/g, "");
}

// 做基础文本归一化，用于标题、标签和集数比较。
function normalizeText(value) {
    return safeText(value)
        .replace(/&amp;/g, "&")
        .replace(/（/g, "(")
        .replace(/）/g, ")")
        .replace(/[·•・]/g, "")
        .replace(/\s+/g, "")
        .toLowerCase();
}

// 在基础归一化上额外处理罗马数字，便于季数和标题比较。
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
    ["海賊", "海贼"],
    ["航海", "海贼"]
];

// 只处理通用繁简和异体字，不在这里写具体作品别名。
function normalizeCjkVariants(value) {
    let text = safeText(value);
    for (const [from, to] of Object.entries(CJK_VARIANT_CHARS)) {
        text = text.replace(new RegExp(from, "g"), to);
    }
    return text;
}

// 生成宽松标题文本，用于处理繁简、异体字和工房/工坊这类通用写法差异。
function looseTitleText(value) {
    const key = safeText(value);
    if (MATCH_CACHE.looseTitle.has(key)) return MATCH_CACHE.looseTitle.get(key);
    const result = normalizeCjkVariants(normalizeCompactText(value))
        .replace(/工房/g, "工坊")
        .replace(/航海/g, "海贼");
    MATCH_CACHE.looseTitle.set(key, result);
    return result;
}

// 判断候选标题是否只是被前缀嵌入，避免长篇动漫被衍生作品污染。
function hasSeparatedEmbeddedTitle(text, target) {
    if (!text || !target || !text.includes(target)) return false;
    const index = text.indexOf(target);
    if (index <= 0) return false;
    return /[：:之\-_]$/.test(text.slice(0, index));
}

// 标记本次请求的内部路径，供本地脚本观测，不改变 Forward 对外返回。
function markDebugTrace(payload, key) {
    if (payload && payload.debugTrace) payload.debugTrace[key] = true;
}

// 根据 Forward 参数判断是否可能是高集数 TV，从而触发长篇动漫逻辑。
function isHighEpisodeTvPayload(payload) {
    const ep = Number(payload && payload.episode) || extractIssueNumber(payload && payload.episodeName);
    if (ep < 80 || !payload || payload.mediaType !== "tv") return false;
    if (isLikelyVariety(payload, null)) return false;
    const text = [payload.title, payload.seriesName, payload.episodeName, payload.rawParams && payload.rawParams.originalTitle, payload.rawParams && payload.rawParams.originalName].map(safeText).join(" ");
    return ep >= 120 || isAnimeText(text) || /[\u3040-\u30ff]/.test(text);
}

// 判断是否应该查询动漫外部别名源，避免外部动漫数据污染综艺和电影。
function shouldFetchAnimeAliasSources(payload) {
    if (!payload || payload.mediaType === "movie") return false;
    if (isLikelyVariety(payload, null) || payload.domesticVariety || payload.isVariety) return false;
    const text = [payload.title, payload.seriesName, payload.episodeName, payload.rawParams && payload.rawParams.originalTitle, payload.rawParams && payload.rawParams.originalName].map(safeText).join(" ");
    return isAnimeText(text) || /[\u3040-\u30ff]/.test(text) || /[A-Za-z]{3,}/.test(text);
}

// 把中文数字和阿拉伯数字转成整数，供季数、期数解析使用。
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

// 把数字季数转成中文季数字符串，用于生成搜索关键词。
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

// 从标题或备注中解析第几季、Season、S02 等季数。
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

// 解析标题末尾表示续作的数字，例如“罗小黑战记2”。
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

// 移除标题里的季数表达，得到更适合搜索的系列名。
function removeSeasonText(title) {
    return safeText(title)
        .replace(/(?:第\s*)?[一二两三四五六七八九十\d]{1,3}\s*季/g, "")
        .replace(/\bseason\s*\d{1,2}\b/gi, "")
        .replace(/\bs\s*0?\d{1,2}\b/gi, "")
        .replace(/([\u4e00-\u9fa5A-Za-z]{2,})\s*(\d{1,2})(?:$|\s|[（(])/, "$1")
        .trim();
}

// 移除语言、字幕、预告、解说等会干扰搜索的噪声词。
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

// 生成搜索关键词前的清洗入口，可选择保留季数。
function cleanSearchKeyword(title, options) {
    const shouldRemoveSeason = !options || options.removeSeason !== false;
    let value = removeNoiseText(title);
    if (shouldRemoveSeason) value = removeSeasonText(value);
    return value.replace(/[：:]\s*$/g, "").trim();
}

// 标题归一化入口，供相似度、去重和污染判断使用。
function normalizeTitle(title) {
    const key = safeText(title);
    if (MATCH_CACHE.normalizeTitle.has(key)) return MATCH_CACHE.normalizeTitle.get(key);
    const result = normalizeCompactText(cleanSearchKeyword(title));
    MATCH_CACHE.normalizeTitle.set(key, result);
    return result;
}

// 判断标题是否明显是预告、解说、花絮等非正片内容。
function isAuxiliaryTitle(title) {
    return /(解说|预告|花絮|reaction|片花|彩蛋|直播|cut|速看|短剧|制作特辑|幕后|纪录片|trailer|少爷)/i.test(safeText(title));
}

// 判断文本是否包含动漫/动画相关分类或描述。
function isAnimeText(text) {
    return /(动漫|动画|番剧|日韩动漫|日本动漫|国产动漫|欧美动漫|国漫|新番|anime|animation)/i.test(safeText(text));
}

// 综合 Forward 参数和 VOD 条目判断是否按动漫处理。
function isAnimePayload(payload, item) {
    const fields = [payload.title, payload.seriesName, payload.episodeName, item && item.vod_class, item && item.type_name, item && item.vod_area, item && item.vod_remarks, item && item.vod_name];
    const text = fields.map(safeText).join(" ");
    return isAnimeText(text) || isHighEpisodeTvPayload(payload);
}

// 判断请求是否是 TMDB 第 0 季或显式特别季。
function isSpecialSeasonPayload(payload) {
    return safeText(payload.season) === "0" || payload.seasonNumber === 0 && payload.explicitSeason;
}

// 判断文本是否有 OVA、SP、特别篇、剧场版等特别篇证据。
function hasAnimeSpecialEvidence(text) {
    return SPECIAL_EPISODE_EVIDENCE_RE.test(safeText(text));
}

// 提取特别集标题词，第 0 季用它和日期/类型共同守边界。
function extractSpecialTitleTokens(text) {
    const value = safeText(text)
        .replace(SPECIAL_EPISODE_EVIDENCE_RE, " ")
        .replace(/20\d{6}/g, " ")
        .replace(/(?:20\d{2})[-/.年\s]*\d{1,2}[-/.月\s]*\d{1,2}日?/g, " ")
        .replace(/第\s*[一二两三四五六七八九十\d]{1,3}\s*(?:集|话|話|回|期)/g, " ")
        .replace(/[上下中](?:集|期|篇)?/g, " ")
        .replace(/[^\u4e00-\u9fa5A-Za-z0-9]+/g, " ");
    return uniq(value.split(/\s+/).map(part => part.trim()).filter(part => part.length >= 2 && part.length <= 14));
}

// 给所有第 0 季请求派生特别集身份，动漫、综艺和普通剧共用同一条硬边界。
function buildSpecialEpisodeIdentity(payload) {
    const text = [payload.episodeName, payload.title, payload.seriesName, payload.releaseDate].map(safeText).join(" ");
    const varietyIdentity = buildEpisodeIdentity(text, payload || {});
    const evidence = hasAnimeSpecialEvidence(text) || varietyIdentity.kind !== "normal" || varietyIdentity.part || varietyIdentity.dateCodes.length || (payload.episodeName && extractSpecialTitleTokens(payload.episodeName).length);
    const tagMatch = text.match(SPECIAL_EPISODE_EVIDENCE_RE);
    // TMDB 第 0 季的特别集常把真实归属季写进单集标题（如“第四季 超前企划”“第一季 收官特辑”）。
    // 提取归属季后，既能用来扩展搜索关键词，也能避免第 0 季请求误配到别的季的特别集。
    const ownerSeason = extractSeasonNumber([payload.episodeName, payload.title].map(safeText).join(" "));
    return {
        active: Boolean(payload.specialSeason || evidence),
        requestedSeasonZero: Boolean(payload.specialSeason),
        hasEvidence: Boolean(evidence),
        kind: varietyIdentity.kind,
        part: varietyIdentity.part,
        issueNumber: varietyIdentity.issueNumber,
        dateCodes: varietyIdentity.dateCodes || [],
        titleTokens: uniq([...(varietyIdentity.titleTokens || []), ...extractSpecialTitleTokens(payload.episodeName)]),
        tag: safeText(tagMatch && tagMatch[0]).toLowerCase(),
        ownerSeason: ownerSeason,
        episodeNumber: Number(payload.episode) || 0
    };
}

// 判断文本是否符合第 0 季/特别集请求的证据边界。
function specialIdentityEvidenceScore(text, payload) {
    const identity = payload && payload.specialEpisodeIdentity;
    if (!identity || !identity.active) return 0;
    const value = safeText(text);
    const labelIdentity = buildEpisodeIdentity(value, payload || {});
    let score = 0;
    if (hasAnimeSpecialEvidence(value)) score += 170;
    if (identity.dateCodes.length) {
        const matchedDate = identity.dateCodes.some(code => labelIdentity.dateCodes.includes(code));
        if (matchedDate) score += 190;
        else if (labelIdentity.dateCodes.length && !hasNearRequestedDate(identity.dateCodes, labelIdentity.dateCodes, 1)) score -= 180;
    }
    if (identity.kind !== "normal") score += labelIdentity.kind === identity.kind ? 120 : -160;
    if (identity.part) score += labelIdentity.part === identity.part ? 80 : -110;
    if (identity.issueNumber && labelIdentity.issueNumber) score += identity.issueNumber === labelIdentity.issueNumber ? 85 : -140;
    // 归属季一致才加分，候选明确标着不同季时强罚，杜绝“第0季的第四季企划”被第一季资源抢走。
    if (identity.ownerSeason) {
        const labelSeason = extractSeasonNumber(value);
        if (labelSeason && labelSeason === identity.ownerSeason) score += 70;
        else if (labelSeason && labelSeason !== identity.ownerSeason) score -= 150;
        // 特别集若属于某个真实季，候选必须给出该季或特别篇证据；只凭日期命中不分季的主系列
        // 正片是巧合（主系列每集都有日期），按“第 0 季宁缺毋滥”强罚，避免回落到主系列正片。
        else if (!labelSeason && !hasAnimeSpecialEvidence(value) && labelIdentity.kind === "normal" && !labelIdentity.part && !labelIdentity.issueNumber) {
            score -= 200;
        }
    }
    score += titleTokenOverlapScore(identity.titleTokens, uniq([...(labelIdentity.titleTokens || []), ...extractSpecialTitleTokens(value)]));
    return score;
}

// 第 0 季不能退回普通季，必须有特别篇证据、日期/期身份或单集标题强命中。
function specialIdentityMatchesText(text, payload) {
    const identity = payload && payload.specialEpisodeIdentity;
    if (!identity || !identity.active) return true;
    if (hasAnimeSpecialEvidence(text)) return true;
    if (identity.requestedSeasonZero && !identity.hasEvidence) return false;
    return specialIdentityEvidenceScore(text, payload) >= 90;
}

// 从备注或播放信息里提取总集数，用于识别长篇动漫。
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

// 根据请求集数和媒体类型判断是否启用长篇动漫模式。
function isLongAnimePayload(payload) {
    const ep = Number(payload.episode) || extractIssueNumber(payload.episodeName);
    return (isAnimePayload(payload, null) || isHighEpisodeTvPayload(payload)) && ep >= 80;
}

// 根据 VOD 条目播放列表和总集数判断候选是否是长篇动漫。
function isLongAnimeItem(item, episodes) {
    const text = [item && item.vod_name, item && item.vod_remarks, item && item.vod_class, item && item.type_name].map(safeText).join(" ");
    const total = Math.max(extractTotalEpisodes(text), Array.isArray(episodes) ? episodes.length : 0);
    return isAnimePayload({}, item) && total >= 80;
}

// 提取动漫资源站常见的篇章、Part、季数提示，用于桥接 TMDB 季数和源站分季差异。
function extractAnimeArcSignals(text) {
    const value = safeText(text);
    const signals = [];
    if (/[篇章]/.test(value)) signals.push("arc");
    if (/\bpart\s*\d+/i.test(value)) signals.push("part");
    if (/千年|血战|篇|章|編|篇章/.test(value)) signals.push("namedArc");
    if (extractSeasonNumber(value)) signals.push("season");
    if (/(上篇|下篇|前篇|后篇|後篇|第[一二两三四五六七八九十\d]+部)/.test(value)) signals.push("part");
    return uniq(signals);
}

// 判断候选是否像同一部动漫的篇章分季，而不是普通剧跨季。
function animeSeasonBridgeScore(item, payload) {
    if (!payload || payload.specialSeason || payload.longAnime) return 0;
    if (!isAnimePayload(payload, item)) return 0;
    const itemTitle = safeText(item && item.vod_name);
    const itemText = [item && item.vod_name, item && item.vod_remarks, item && item.vod_class, item && item.type_name].map(safeText).join(" ");
    if (/(特别编辑版|剧场版|劇場版|真人版|真人|live\s*action|总集篇|総集編|预告|解说)/i.test(itemText)) return 0;
    const itemBase = normalizeTitle(removeSeasonText(itemTitle));
    const payloadBase = normalizeTitle(removeSeasonText(payload.seriesName || payload.title));
    const aliasBases = (payload.aliases || []).map(alias => normalizeTitle(removeSeasonText(alias))).filter(Boolean);
    const titleRelated = itemBase && (itemBase === payloadBase || itemBase.includes(payloadBase) || payloadBase.includes(itemBase) || aliasBases.some(alias => itemBase === alias || itemBase.includes(alias) || alias.includes(itemBase)));
    if (!titleRelated) return 0;
    const signals = extractAnimeArcSignals(itemText);
    if (!signals.length) return 0;
    const itemSeason = extractSeasonNumber(itemText);
    const requestedEpisode = Number(payload.episode) || 0;
    if (itemSeason && payload.seasonNumber && itemSeason > payload.seasonNumber && requestedEpisode <= 24) return 0;
    let score = 130 + signals.length * 25;
    if (itemSeason && payload.seasonNumber && itemSeason !== payload.seasonNumber) score += 70;
    if (itemTitle && normalizeTitle(itemTitle) !== normalizeTitle(payload.title)) score += 20;
    return score;
}

// 动漫源按季拆分时，尝试把 TMDB 全局/连续集数换算成当前播放列表里的本季集数。
function animeLocalEpisodeNumbers(payload, item, totalEpisodes) {
    const ep = Number(payload && payload.episode) || 0;
    if (!ep || !payload || payload.specialSeason) return [];
    if (!((payload.animeIdentity && payload.animeIdentity.isLikelyAnime) || isAnimePayload(payload, item))) return [];
    const numbers = [ep];
    // 取模除数优先用源站声明的“全N集”，而不是播放列表条目数：播放列表常混入 PV/预告/特典，
    // 会把每一集顶偏一位（如“全13集”却“共14集”时，16%14=2 误配，按 16%13=3 才正确）。
    const declaredTotal = extractTotalEpisodes([item && item.vod_remarks, item && item.vod_name].map(safeText).join(" "));
    const playlistTotal = Number(totalEpisodes) || 0;
    const total = declaredTotal > 1 && (!playlistTotal || declaredTotal < playlistTotal) ? declaredTotal : playlistTotal;
    if (total > 1 && ep > total) {
        const expectedSeason = expectedAnimeSourceSeason(payload, total);
        const itemSeason = extractSeasonNumber([item && item.vod_name, item && item.vod_remarks].join(" "));
        if (expectedSeason && itemSeason && itemSeason !== expectedSeason) return numbers;
        if (expectedSeason && !itemSeason && !extractAnimeArcSignals([item && item.vod_name, item && item.vod_remarks].join(" ")).includes("part")) return numbers;
        const remainder = ep % total;
        numbers.push(remainder || total);
        if (itemSeason > 1) {
            const offsetEpisode = ep - ((itemSeason - 1) * total);
            if (offsetEpisode > 0 && offsetEpisode <= total) numbers.push(offsetEpisode);
        }
    }
    return uniq(numbers.map(String)).map(Number).filter(Boolean);
}

// 按播放列表长度估算 TMDB 连续集数落到源站第几季。
function expectedAnimeSourceSeason(payload, totalEpisodes) {
    const ep = Number(payload && payload.episode) || 0;
    const total = Number(totalEpisodes) || 0;
    if (!ep || !total || ep <= total) return 0;
    return Math.ceil(ep / total);
}

// 生成通用写法变体，只处理繁简/异体字等非具体作品规则。
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

// 拆出标题核心 token，用于别名相关性判断。
function titleCoreTokens(value) {
    const text = normalizeTitle(value)
        .replace(/第?[一二两三四五六七八九十\d]{1,3}季/g, "")
        .replace(/season\d{1,2}|s\d{1,2}/g, "");
    const chunks = text.split(/[：:之\-_\s]+/).filter(part => part.length >= 2);
    return uniq([text, ...chunks]).filter(part => part.length >= 2);
}

// 判断一个标题的核心 token 是否能匹配任一目标标题。
function titleTokenMatchesAny(value, targets) {
    const tokens = titleCoreTokens(value);
    const targetTokens = targets.flatMap(titleCoreTokens);
    if (!tokens.length || !targetTokens.length) return false;
    return tokens.some(token => targetTokens.some(target => token === target || token.includes(target) || target.includes(token)));
}

// 过滤外部别名，避免无关条目扩大搜索范围。
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

// 判断请求或候选是否像综艺，用于进入期身份匹配。
function isLikelyVariety(payload, item) {
    const text = [payload.title, payload.seriesName, payload.episodeName, item && item.vod_class, item && item.type_name, item && item.vod_remarks].map(safeText).join(" ");
    return /(综艺|真人秀|脱口秀|晚会|加更|超前|会员版|演唱会|第\d+期|\d{8}期)/.test(text);
}

// 判断请求是否应当按电影处理。
function isMoviePayload(payload) {
    return payload.mediaType === "movie" || (!payload.season && !payload.episode && payload.mediaType !== "tv");
}

// 取文本里的第一个日期码。
function parseDateCode(text) {
    return parseDateCodes(text)[0] || "";
}

// 解析 YYYYMMDD 和 YYYY-MM-DD 等完整日期。
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

// 把 06-12、6月12日 这类月日格式补全年份。
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

// 汇总完整日期和月日日期，得到统一日期码列表。
function parseAllDateCodes(text, payload) {
    return uniq([
        ...parseDateCodes(text),
        ...parseMonthDayCodes(text, payload || {})
    ]);
}

// 解析分钟、HH:MM:SS 等时长格式为分钟数。
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

// 用时长相近程度做弱排序，避免把它变成硬过滤。
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

// 提取国内综艺常见身份标签，如加更、纯享、超前、上中下等。
function extractVarietyTags(text) {
    const cacheKey = safeText(text);
    if (MATCH_CACHE.varietyTags.has(cacheKey)) return MATCH_CACHE.varietyTags.get(cacheKey);
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
    const result = uniq(tags);
    MATCH_CACHE.varietyTags.set(cacheKey, result);
    return result;
}

// 根据请求标签和候选标签的一致性给综艺候选打分。
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

// 判断播放标签是否包含请求日期。
function episodeHasRequestedDate(label, payload) {
    if (!payload.dateCodes || !payload.dateCodes.length) return false;
    const labelDateCodes = parseAllDateCodes(label, payload);
    return payload.dateCodes.some(code => labelDateCodes.includes(code));
}

// 计算两个 YYYYMMDD 日期相差天数。
function dateCodeDistanceDays(left, right) {
    if (!/^\d{8}$/.test(safeText(left)) || !/^\d{8}$/.test(safeText(right))) return 9999;
    const leftTime = Date.UTC(Number(left.slice(0, 4)), Number(left.slice(4, 6)) - 1, Number(left.slice(6, 8)));
    const rightTime = Date.UTC(Number(right.slice(0, 4)), Number(right.slice(4, 6)) - 1, Number(right.slice(6, 8)));
    return Math.round(Math.abs(leftTime - rightTime) / 86400000);
}

// 判断候选日期是否与请求日期足够接近。
function hasNearRequestedDate(requestedCodes, labelCodes, maxDays) {
    if (!requestedCodes || !requestedCodes.length || !labelCodes || !labelCodes.length) return false;
    return requestedCodes.some(requested => labelCodes.some(label => dateCodeDistanceDays(requested, label) <= maxDays));
}

// 判断日期是否应该作为硬过滤条件，明确期身份时日期只做辅助。
function shouldHardFilterVarietyDate(identity) {
    if (!identity || !identity.dateCodes || !identity.dateCodes.length) return false;
    if (identity.fromEpisodeName && (identity.issueNumber || identity.part || identity.kind !== "normal" || identity.titleTokens.length)) return false;
    return true;
}

// 截取综艺节目单头部身份，避免剧情文案里的“上/中/下/加更”误判。
function varietyIdentityHeadText(text) {
    const value = safeText(text);
    const beforeColon = value.split(/[：:]/)[0];
    // 冒号后的短标签只接受明确身份词，避免剧情简介里的普通文字参与身份判断。
    const colonTag = (value.match(/[：:]\s*((?:上|中|下)(?:集|期|篇)?|加更|还有加更|特别加更|纯享(?:版)?|舞台纯享|超前(?:营业|集结)?|会员版|APP专享|先导片?|预告|花絮|彩蛋|采访|专访|直拍|直播|发布会|特辑|回顾|名场面|副本解锁中|存档中|补给站中)(?:$|[\s)）\],，。！？!?:：-])/) || [])[1] || "";
    // 日期型节目单通常长得像 20260514第1期上 或 第20260514期上。
    const dateIssueMatch = beforeColon.match(/^(?:第)?20\d{6}(?:期)?\s*(?:第\s*[一二两三四五六七八九十\d]{1,3}\s*期)?\s*(?:[(（]?[上中下][)）]?(?:集|期|篇)?)?/);
    // 期号型节目单通常长得像 第1期中、第1期下，不应按 Forward episode=2 误配到第2期。
    const issueMatch = beforeColon.match(/^(?:(?!20\d{6})\d{1,2}[-/.月]\d{1,2}日?)?\s*第\s*[一二两三四五六七八九十\d]{1,3}\s*期\s*(?:[(（]?[上中下][)）]?(?:集|期|篇)?)?/);
    let explicitHead = "";
    if (dateIssueMatch) {
        explicitHead = dateIssueMatch[0];
        const hasPart = /[上中下](?:集|期|篇)?\s*$/.test(explicitHead);
        const rawTail = beforeColon.slice(dateIssueMatch[0].length);
        const tail = rawTail.trimStart();
        const tailTag = (tail.match(/^((?:先导片?|剧情)?纯享(?:版)?|舞台纯享|(?:万事屋|推门|特别|补给站)?加更(?:版)?|还有加更|超前彩蛋|超前(?:营业|集结)?|会员版|APP专享|先导片?|副本解锁中|存档中|补给站中|预告|花絮|彩蛋|采访|专访|迷妹专访|居民采访|直拍|直播|发布会|特辑|回顾|名场面|万事屋)(?=$|[\s)）\],，。！？!?:：-]|[上中下])/) || [])[1] || "";
        // 只有尾部确实像平台标签时才拼回身份，避免“第1期下还有加更难度”被误判为加更。
        if (tailTag && (!hasPart || /^\s+|^[\-·:：()（）]/.test(rawTail) || /^(?:先导片?|剧情)?纯享|舞台纯享|(?:万事屋|推门|特别|补给站)?加更|还有加更|超前|会员版|APP专享|副本解锁|存档|补给站|预告|花絮|彩蛋|采访|专访|迷妹|居民采访|直拍|直播|发布会|特辑|回顾|名场面|万事屋/.test(tail))) explicitHead += tailTag;
        const tailPart = (tail.slice(tailTag.length).match(/^([上中下])(?:集|期|篇)?/) || [])[1] || "";
        if (tailPart && !hasPart) explicitHead += tailPart;
    } else if (issueMatch) {
        explicitHead = issueMatch[0];
        const hasPart = /[上中下](?:集|期|篇)?\s*$/.test(explicitHead);
        const rawTail = beforeColon.slice(issueMatch[0].length);
        const tail = rawTail.trimStart();
        const tailTag = (tail.match(/^((?:万事屋|推门|特别|补给站)?加更(?:版)?|还有加更|纯享(?:版)?|舞台纯享|超前(?:营业|集结)?|会员版|APP专享)(?=$|[\s)）\],，。！？!?:：-])/) || [])[1] || "";
        // 期号后面的“加更/纯享/超前”必须是分隔出的标签，不能从剧情句子里硬抓。
        if (tailTag && (!hasPart || /^\s+|^[\-·:：()（）]/.test(rawTail))) explicitHead += tailTag;
    } else {
        // 没有日期或期号时，只允许平台常见的短身份开头，例如“先导片上”“还有加更”。
        explicitHead = (beforeColon.match(/^(?:20\d{6}|\d{1,2}[-/.月]\d{1,2}日?)?\s*(?:先导片?\s*(?:上|中|下)?|(?:还有|特别)?加更(?:版)?\s*(?:第\s*[一二两三四五六七八九十\d]{1,3}\s*期)?\s*(?:上|中|下)?|纯享(?:版)?\s*(?:第\s*[一二两三四五六七八九十\d]{1,3}\s*期)?\s*(?:上|中|下)?|舞台纯享\s*(?:第\s*[一二两三四五六七八九十\d]{1,3}\s*期)?\s*(?:上|中|下)?|超前彩蛋|超前(?:营业|集结)?\s*(?:第\s*[一二两三四五六七八九十\d]{1,3}\s*期)?\s*(?:上|中|下)?|[上中下](?:集|期|篇)?|会员版|APP专享|副本解锁中|存档中|补给站中|预告|花絮|彩蛋|采访|专访|直拍|直播|发布会|特辑|回顾|名场面)/) || [])[0] || "";
    }
    if (!explicitHead && beforeColon.length <= 12 && /特辑|企划|发布会|直播|回顾|名场面|大赏/.test(beforeColon)) explicitHead = beforeColon;
    return `${explicitHead} ${colonTag}`;
}

// 从综艺头部身份中归类正片、加更、纯享、超前、花絮等类型。
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

// 区分普通加更、特别加更和还有加更，避免加更内部互相串。
function extractPlusSubKind(text) {
    const value = varietyIdentityHeadText(text);
    if (/还有加更/.test(value)) return "more";
    if (/特别加更|推门加更|补给站加更|万事屋/.test(value)) return "special";
    if (/加更|加料/.test(value)) return "plus";
    return "";
}

// 解析综艺上/中/下篇身份。
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

// 从文本中解析第几期或第几集作为弱身份。
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

// 提取去掉日期、期号和标签后的标题词，用于节目单标题相似度。
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

// 把日期、期号、上下篇、类型、标题词合成统一综艺期身份。
function buildEpisodeIdentity(text, payload) {
    const value = safeText(text);
    const payloadKey = payload ? [payload.year, payload.releaseDate].map(safeText).join("|") : "";
    const cacheKey = `${payloadKey}::${value}`;
    if (MATCH_CACHE.episodeIdentity.has(cacheKey)) {
        return Object.assign({}, MATCH_CACHE.episodeIdentity.get(cacheKey));
    }
    const identity = {
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
    MATCH_CACHE.episodeIdentity.set(cacheKey, identity);
    return Object.assign({}, identity);
}

// 判断是否应使用国内综艺专用期身份匹配。
function isDomesticVariety(payload, item) {
    const text = [payload.title, payload.seriesName, payload.episodeName, item && item.vod_class, item && item.type_name, item && item.vod_area, item && item.vod_remarks].map(safeText).join(" ");
    if (/(大陆综艺|内地综艺|国产综艺|大陆|内地|中国)/.test(text) && /(综艺|真人秀|脱口秀|晚会|演唱会|第\d+期|\d{8}|加更|纯享|超前)/.test(text)) return true;
    return /[\u4e00-\u9fa5]/.test(text) && /(综艺|真人秀|脱口秀|晚会|演唱会|第\d+期|\d{8}期|加更|纯享|超前|会员版|先导|花絮|番外|上期|下期)/.test(text);
}

// 判断期身份里是否有明确日期、期号、上下篇或类型标签。
function hasExplicitEpisodeMarker(identity) {
    return Boolean(identity && ((identity.dateCodes && identity.dateCodes.length) || identity.kind !== "normal" || identity.part || identity.issueNumber));
}

// 直接从文本构建身份并判断是否有明确期身份。
function hasExplicitEpisodeMarkerText(text, payload) {
    return hasExplicitEpisodeMarker(buildEpisodeIdentity(text, payload || {}));
}

// 构造请求端期身份，只有缺少可靠身份时才弱使用 episode 数字。
function buildRequestedEpisodeIdentity(payload) {
    const fallbackTitle = hasExplicitEpisodeMarkerText(payload.title, payload) ? payload.title : "";
    const text = [payload.episodeName || fallbackTitle, payload.releaseDate].join(" ");
    const identity = buildEpisodeIdentity(text, payload);
    identity.fromEpisodeName = Boolean(payload.episodeName || fallbackTitle);
    const textLooksVariety = /[\u4e00-\u9fa5]/.test([payload.title, payload.seriesName].join(" ")) && Number(payload.seasonNumber) > 0;
    // 国内综艺的 Forward episode 经常是 TMDB 集序，不等于平台“第几期”，所以中文综艺默认不把它升级为强身份。
    if (!identity.issueNumber && Number(payload.episode) > 0 && !hasReliableVarietyIdentity(identity) && !textLooksVariety) {
        identity.issueNumber = Number(payload.episode);
        identity.usedEpisodeFallback = true;
    }
    return identity;
}

// 判断期身份是否足够可靠，可以作为强过滤依据。
function hasReliableVarietyIdentity(identity) {
    return Boolean(identity && ((identity.dateCodes && identity.dateCodes.length) || identity.kind !== "normal" || identity.part || (identity.titleTokens.length && identity.fromEpisodeName) || (identity.issueNumber && !identity.usedEpisodeFallback)));
}

// 计算请求标题词和候选标题词的重叠分数。
function titleTokenOverlapScore(requestedTokens, labelTokens) {
    if (!requestedTokens.length || !labelTokens.length) return 0;
    let score = 0;
    for (const token of requestedTokens) {
        if (labelTokens.some(labelToken => labelToken.includes(token) || token.includes(labelToken))) score += 18;
    }
    return Math.min(score, 72);
}

// 国内综艺单集评分核心，按期身份优先而不是按 TMDB episode 数字优先。
function varietyIdentityScore(label, payload, item, index) {
    if (!isDomesticVariety(payload, item)) return null;

    const requested = payload.episodeIdentity || buildRequestedEpisodeIdentity(payload);
    const labelIdentity = buildEpisodeIdentity(label, payload);
    const ep = Number(payload.episode) || 0;
    let score = 0;

    const hardFilterDate = shouldHardFilterVarietyDate(requested);
    if (requested.dateCodes.length) {
        // 有明确期身份时日期只弱惩罚，因为 TMDB 日期和平台/VOD 日期可能差一天或分上下篇。
        const dateMatched = requested.dateCodes.some(code => labelIdentity.dateCodes.includes(code));
        if (dateMatched) score += 360;
        else if (labelIdentity.dateCodes.length && requested.issueNumber && !labelIdentity.issueNumber && !hasNearRequestedDate(requested.dateCodes, labelIdentity.dateCodes, 1)) score -= 360;
        else if (labelIdentity.dateCodes.length) score -= hardFilterDate ? 460 : 65;
        else score -= hardFilterDate ? 180 : 18;
    }

    if (requested.kind !== "normal") {
        // 加更、纯享、超前、先导等类型不允许被普通正片抢占。
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
        // 上/中/下是国内综艺最关键的身份之一，必须比 episode 数字更可信。
        score += labelIdentity.part === requested.part ? 90 : -110;
    } else if (labelIdentity.part) {
        score -= 12;
    }

    score += titleTokenOverlapScore(requested.titleTokens, labelIdentity.titleTokens);
    if (requested.titleTokens.length && labelIdentity.titleTokens.length && !titleTokenOverlapScore(requested.titleTokens, labelIdentity.titleTokens)) score -= 84;

    if (requested.issueNumber && labelIdentity.issueNumber) {
        // 只有请求侧真的带第几期时，期号才作为强约束；否则不拿 Forward episode 硬套。
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

// 判断最终返回的资源名是否仍符合请求的综艺期身份。
function varietyIdentityMatchesStream(stream, payload) {
    if (!(payload.isVariety || payload.domesticVariety) || !(payload.episodeIdentity || payload.domesticVariety)) return true;
    const requested = payload.episodeIdentity || buildRequestedEpisodeIdentity(payload);
    const text = safeText(stream.name).split("·").pop();
    const identity = buildEpisodeIdentity(text, payload);

    const exactDateMatched = requested.dateCodes.length && requested.dateCodes.some(code => identity.dateCodes.includes(code));
    // 只有纯日期请求才硬过滤日期；带期号/上下篇/类型时交给身份匹配兜底。
    if (shouldHardFilterVarietyDate(requested) && requested.dateCodes.length && !exactDateMatched) return false;
    if (requested.dateCodes.length && identity.dateCodes.length && !exactDateMatched && requested.issueNumber && !identity.issueNumber) {
        if (!(requested.part && identity.part === requested.part && hasNearRequestedDate(requested.dateCodes, identity.dateCodes, 1))) return false;
    }
    // 类型、上下篇、期号这些明确身份不能在最终返回阶段被放宽。
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

// 解析 Forward 可能传入的 aliases/alternativeTitles 等多标题字段。
function parseTitleList(value) {
    if (Array.isArray(value)) return value.map(safeText).filter(Boolean);
    if (value && typeof value === "object") return Object.values(value).map(safeText).filter(Boolean);
    return splitMultiValue(value, ",")
        .flatMap(part => splitMultiValue(part, "/"))
        .flatMap(part => splitMultiValue(part, "|"))
        .flatMap(part => splitMultiValue(part, ";"))
        .flatMap(part => splitMultiValue(part, "\n"));
}

// 从多种可能字段中挑选当前单集标题。
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

// 请求外部 JSON API，主要用于别名补全。
async function requestJsonUrl(url, params, timeout) {
    const response = await Widget.http.get(url, {
        params: params || {},
        headers: buildHeaders(),
        timeout: timeout || 1600
    });
    return parseJson(response.data);
}

// 可选 POST JSON 请求，Forward 环境不支持 post 时直接跳过对应动态别名源。
async function postJsonUrl(url, body, timeout) {
    if (!Widget.http || typeof Widget.http.post !== "function") return {};
    const response = await Widget.http.post(url, {
        data: body || {},
        headers: Object.assign({}, buildHeaders(), { "Content-Type": "application/json" }),
        timeout: timeout || 1800
    });
    return parseJson(response.data);
}

// 清洗外部别名里的噪声词。
function normalizeAlias(alias) {
    return removeNoiseText(alias)
        .replace(/\s+/g, " ")
        .trim();
}

// 过滤明显无效或容易污染搜索的别名。
function aliasValueAllowed(alias, payload) {
    if (!alias || alias.length < 2 || alias.length > 50) return false;
    // 纯数字别名几乎都是 Wikidata Q-id、TMDB id 等漏出的标识，拿去搜源既无意义又拖慢请求。
    if (/^\d+$/.test(alias)) return false;
    if (/列表|角色|人物|游戏|小說|小说|漫畫|漫画|原聲|原声|soundtrack|volume\s*\d+|vol\.\s*\d+|kitchen/i.test(alias)) return false;
    return true;
}

// 对别名列表做清洗、去重、相关性过滤和数量限制。
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
    return aliases.slice(0, 16);
}

// 推入一组相关别名，要求组内至少有一个别名与当前媒体相关。
function pushRelatedAliasGroup(aliases, values, payload) {
    const cleaned = values.map(normalizeAlias).filter(alias => aliasValueAllowed(alias, payload));
    if (!cleaned.length) return;
    if (cleaned.some(alias => isLikelyRelevantAlias(alias, payload))) aliases.push(...cleaned);
}

// 从搜索命中的外部条目里推入别名，并用搜索词做相关性保护。
function pushAliasGroupFromSearchHit(aliases, values, payload, term) {
    const cleaned = values.map(normalizeAlias).filter(alias => aliasValueAllowed(alias, payload));
    if (!cleaned.length) return;
    const searchTerms = uniq([term, payload.title, payload.seriesName, payload.rawParams && payload.rawParams.originalTitle, payload.rawParams && payload.rawParams.originalName].filter(Boolean));
    if (cleaned.some(alias => isLikelyRelevantAlias(alias, payload)) || searchTerms.some(searchTerm => titleTokenMatchesAny(searchTerm, cleaned))) {
        aliases.push(...cleaned);
    }
}

// 从 Wikidata 搜索标题和别名，作为低成本动态别名来源。
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

// 从 TVMaze 获取剧集别名，主要补英美剧标题差异。
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

// 从 Jikan 获取动漫日英中标题和同义标题。
async function fetchJikanAliases(payload) {
    if (payload.mediaType && payload.mediaType !== "tv") return [];
    if (!shouldFetchAnimeAliasSources(payload)) return [];
    const rawOriginalTerms = [payload.rawParams && payload.rawParams.originalTitle, payload.rawParams && payload.rawParams.originalName].filter(Boolean);
    const terms = uniq([...rawOriginalTerms, payload.title, payload.seriesName].filter(Boolean));
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

// 从 Bangumi 获取动漫中文、日文、英文标题。
async function fetchBangumiAliases(payload) {
    if (payload.mediaType && payload.mediaType !== "tv") return [];
    if (!shouldFetchAnimeAliasSources(payload)) return [];
    const rawOriginalTerms = [payload.rawParams && payload.rawParams.originalTitle, payload.rawParams && payload.rawParams.originalName].filter(Boolean);
    const terms = uniq([...rawOriginalTerms, payload.title, payload.seriesName].filter(Boolean));
    const aliases = [];
    for (const term of terms.slice(0, 3)) {
        try {
            const v0Data = await postJsonUrl("https://api.bgm.tv/v0/search/subjects?limit=5", {
                keyword: term,
                filter: { type: [2] }
            }, 1800);
            const v0Rows = Array.isArray(v0Data.data) ? v0Data.data : [];
            for (const row of v0Rows.slice(0, 5)) {
                pushAliasGroupFromSearchHit(aliases, [
                    row.name_cn,
                    row.name
                ], payload, term);
            }
        } catch (error) {
            // 继续尝试旧接口。
        }
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

// 收集 TMDB 返回对象中常见的标题字段。
function collectTmdbTitleFields(value, aliases) {
    if (!value || typeof value !== "object") return [];
    const values = [value.title, value.name, value.original_title, value.original_name, value.english_name];
    if (value.data && typeof value.data === "object") {
        values.push(value.data.title, value.data.name, value.data.original_title, value.data.original_name);
    }
    if (aliases) aliases.push(...values);
    return values;
}

// 从 TMDB alternative_titles/translations 中补动态标题别名。
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

// 汇总所有外部别名源，失败的源直接跳过。
async function fetchExternalAliases(payload) {
    // 动漫优先 Bangumi/Jikan：二者对东亚动漫的中日英标题与同义名最全，结果排前
    // 让 uniq 保留它们的写法；同时跳过偏英美剧的 TVMaze 和噪声较多的 Wikidata，省一轮慢请求。
    const isAnimeRequest = Boolean(
        payload
        && payload.mediaType !== "movie"
        && !payload.domesticVariety
        && !payload.isVariety
        && (payload.isAnime || payload.longAnime || payload.animeSpecialSeason || (payload.animeIdentity && payload.animeIdentity.isLikelyAnime))
    );
    const tasks = isAnimeRequest
        ? [fetchBangumiAliases(payload), fetchJikanAliases(payload), fetchTmdbTitleAliases(payload)]
        : [fetchTmdbTitleAliases(payload), fetchWikidataAliases(payload), fetchTvmazeAliases(payload), fetchJikanAliases(payload), fetchBangumiAliases(payload)];
    const settled = await Promise.allSettled(tasks);
    const dynamicAliases = settled.flatMap(item => item.status === "fulfilled" ? item.value : []);
    return uniq(dynamicAliases);
}

// 判断是否具备通过 TMDB 单集接口补标题和播出日期的参数。
function hasTmdbEpisodeLookupPayload(payload) {
    return Boolean(payload && payload.mediaType === "tv" && payload.tmdbId && payload.seasonNumber >= 0 && Number(payload.episode) > 0);
}

// 提取 tv.12345、tmdb.12345 或普通数字中的 TMDB 数字 ID。
function normalizeTmdbNumericId(value) {
    const text = safeText(value);
    if (!text) return "";
    const parts = text.split(".");
    const tail = parts[parts.length - 1];
    const match = tail.match(/\d+/);
    return match ? match[0] : "";
}

// 兼容不同包装结构的 TMDB 单集返回。
function normalizeTmdbEpisodeData(data) {
    const unwrapped = unwrapData(data);
    if (Array.isArray(unwrapped)) return unwrapped[0] || {};
    if (unwrapped && typeof unwrapped === "object" && unwrapped.episode && typeof unwrapped.episode === "object") return unwrapped.episode;
    return unwrapped && typeof unwrapped === "object" ? unwrapped : {};
}

// Forward 资源参数可能缺 episodeName，这里用 TMDB 单集接口补齐。
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

// 从 TMDB 单集数据里取标题。
function extractTmdbEpisodeName(data) {
    return safeText(data && (data.name || data.title || data.episodeName || data.episode_title));
}

// 从 TMDB 单集数据里取播出日期。
function extractTmdbEpisodeAirDate(data) {
    return safeText(data && (data.air_date || data.airDate || data.release_date || data.first_air_date));
}

// 统一派生请求身份，让搜索、早停和最终过滤共享同一组类型判断。
function buildRequestIdentity(payload) {
    const text = [payload.title, payload.seriesName, payload.episodeName, payload.releaseDate, ...(payload.aliases || [])].map(safeText).join(" ");
    let mediaKind = "generic";
    if (isMoviePayload(payload)) mediaKind = "movie";
    else if (payload.domesticVariety || payload.isVariety) mediaKind = "variety";
    else if (payload.isAnime || /[\u3040-\u30ff]/.test(text) || isAnimeText(text)) mediaKind = "anime";
    else if (payload.mediaType === "tv") mediaKind = "series";

    let episodeKind = "none";
    if (payload.animeSpecialSeason) episodeKind = "animeSpecial";
    else if (payload.longAnime) episodeKind = "globalEpisode";
    else if (payload.episodeIdentity && hasReliableVarietyIdentity(payload.episodeIdentity)) episodeKind = "varietyIdentity";
    else if (Number(payload.episode) > 0) episodeKind = "numberedEpisode";

    return {
        mediaKind: mediaKind,
        episodeKind: episodeKind,
        seasonNumber: payload.seasonNumber,
        episodeNumber: Number(payload.episode) || 0,
        hasReliableVarietyIdentity: Boolean(payload.episodeIdentity && hasReliableVarietyIdentity(payload.episodeIdentity)),
        hasDateIdentity: Boolean(payload.dateCodes && payload.dateCodes.length),
        titleAliases: uniq([payload.title, payload.seriesName, ...(payload.aliases || [])].filter(Boolean))
    };
}

// 动漫请求单独派生身份，避免英文/日文标题在首轮被当成普通剧集慢慢补救。
function buildAnimeIdentity(payload) {
    const text = [payload.title, payload.seriesName, payload.episodeName, payload.rawParams && payload.rawParams.originalTitle, payload.rawParams && payload.rawParams.originalName, ...(payload.aliases || [])].map(safeText).join(" ");
    const likelyAnime = Boolean(
        payload.isAnime
        || payload.longAnime
        || payload.animeSpecialSeason
        || /[\u3040-\u30ff]/.test(text)
        || isAnimeText(text)
        || (payload.mediaType === "tv" && /[A-Za-z]{3,}/.test(text) && safeText(payload.rawParams && (payload.rawParams.originalTitle || payload.rawParams.originalName)))
    );
    let episodeMode = "season";
    if (payload.animeSpecialSeason) episodeMode = "special";
    else if (payload.longAnime || isHighEpisodeTvPayload(payload)) episodeMode = "global";
    const specialText = [payload.title, payload.seriesName, payload.episodeName].join(" ");
    const specialKind = payload.animeSpecialSeason || hasAnimeSpecialEvidence(specialText)
        ? ((specialText.match(/ova|oad|sp|特别篇|番外|外传|剧场版|劇場版/i) || [])[0] || "special")
        : "";
    return {
        isLikelyAnime: likelyAnime,
        episodeMode: episodeMode,
        specialKind: safeText(specialKind).toLowerCase(),
        titleAliases: uniq([payload.title, payload.seriesName, ...(payload.aliases || [])].filter(Boolean)),
        seasonNumber: payload.seasonNumber,
        episodeNumber: Number(payload.episode) || 0,
        isMainlineRequested: !payload.animeSpecialSeason && !hasAnimeSpecialEvidence(specialText)
    };
}

// 如果 Forward 参数缺少单集标题或日期，则尝试用 TMDB 补全。
async function enrichParamsFromTmdbEpisode(params, payload) {
    if (!hasTmdbEpisodeLookupPayload(payload)) return params || {};
    if (payload.episodeName && payload.releaseDate) return params || {};

    // 只补缺失字段，不覆盖 Forward 已经传来的标题或日期。
    const data = await fetchTmdbEpisodeInfo(payload);
    const episodeName = payload.episodeName || extractTmdbEpisodeName(data);
    const airDate = payload.releaseDate || extractTmdbEpisodeAirDate(data);
    if (!episodeName && !airDate) return params || {};

    return Object.assign({}, params || {}, {
        episodeName: episodeName || safeText((params || {}).episodeName),
        airDate: airDate || safeText((params || {}).airDate)
    });
}

// 把 Forward 参数转换成搜索、评分和过滤共用的标准 payload。
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
        debugTrace: {},
        rawParams: params || {}
    };
    payload.episodeIdentity = buildRequestedEpisodeIdentity(payload);
    // 派生标志必须在 payload 构造后统一生成，后续搜索、评分、过滤都依赖这些边界。
    payload.domesticVariety = isDomesticVariety(payload, null);
    payload.isAnime = isAnimePayload(payload, null);
    payload.longAnime = isLongAnimePayload(payload);
    payload.specialSeason = isSpecialSeasonPayload(payload);
    payload.specialEpisodeIdentity = buildSpecialEpisodeIdentity(payload);
    payload.animeSpecialSeason = payload.specialSeason && !payload.domesticVariety && !payload.isVariety;
    payload.animeIdentity = buildAnimeIdentity(payload);
    if (payload.animeIdentity.isLikelyAnime) payload.isAnime = true;
    if (payload.animeIdentity.episodeMode === "global") payload.longAnime = true;
    payload.requestIdentity = buildRequestIdentity(payload);
    return payload;
}

// 根据标题、别名、季数和特别季状态生成搜索关键词。
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
        if (payload.specialSeason && cleanWithoutSeason) {
            // 第 0 季/特别篇先搜窄关键词，避免回落到普通第一季。
            const identity = payload.specialEpisodeIdentity || {};
            specialKeywords.push(cleanWithoutSeason);
            // 特别集若带真实归属季（如“第四季 超前企划”），补一组带季关键词，
            // 否则平台资源都挂在“XX第四季”名下，纯标题搜不到会出现“暂无资源”。
            if (identity.ownerSeason) {
                const ownerSeasonChinese = seasonNumberText(identity.ownerSeason);
                specialKeywords.push(`${cleanWithoutSeason}第${ownerSeasonChinese}季`);
                specialKeywords.push(`${cleanWithoutSeason}${identity.ownerSeason}`);
                specialKeywords.push(`${cleanWithoutSeason} 第${ownerSeasonChinese}季`);
            }
            const kindKeywords = {
                plus: ["加更", "特别加更"],
                early: ["超前", "超前营业"],
                member: ["会员版", "会员"],
                pure: ["纯享", "纯享版"],
                behind: ["花絮", "幕后", "彩蛋"],
                trailer: ["预告"],
                special: ["特别篇", "特辑", "先导片", "番外"]
            }[identity.kind] || [];
            for (const tag of uniq([identity.tag, ...kindKeywords].filter(Boolean))) {
                specialKeywords.push(`${cleanWithoutSeason}${tag}`);
                specialKeywords.push(`${cleanWithoutSeason} ${tag}`);
            }
            for (const dateCode of identity.dateCodes || []) {
                specialKeywords.push(`${cleanWithoutSeason}${dateCode}`);
                specialKeywords.push(`${cleanWithoutSeason} ${dateCode}`);
            }
            if (payload.episodeName && !/^第\s*\d+\s*(集|话|話|回)$/.test(payload.episodeName)) {
                specialKeywords.push(`${cleanWithoutSeason}${payload.episodeName}`);
                specialKeywords.push(`${cleanWithoutSeason} ${payload.episodeName}`);
            }
            for (const token of identity.titleTokens || []) {
                if (normalizeTitle(token) === normalizeTitle(cleanWithoutSeason)) continue;
                specialKeywords.push(`${cleanWithoutSeason}${token}`);
                specialKeywords.push(`${cleanWithoutSeason} ${token}`);
            }
            for (const suffix of SPECIAL_EPISODE_TAGS) {
                specialKeywords.push(`${cleanWithoutSeason}${suffix}`);
                specialKeywords.push(`${cleanWithoutSeason} ${suffix}`);
            }
        }
        if (season > 1 && cleanWithoutSeason && !payload.longAnime) {
            // 普通季番和剧集加季数关键词；长篇动漫不加，避免海贼王这类全局集数被季数过滤误伤。
            keywords.push(`${cleanWithoutSeason}第${seasonChinese}季`);
            keywords.push(`${cleanWithoutSeason}${season}`);
        }
        keywords.push(cleanWithoutSeason);
    }

    if (isMoviePayload(payload) && payload.title.includes("：")) {
        keywords.push(payload.title.split("：")[0]);
    }

    const orderedKeywords = payload.specialSeason ? [...specialKeywords, ...keywords] : keywords;
    const limit = payload.specialSeason ? 14 : payload.longAnime ? 6 : payload.animeIdentity && payload.animeIdentity.isLikelyAnime ? 10 : payload.requestIdentity && payload.requestIdentity.mediaKind === "variety" ? 5 : 6;
    return uniq(orderedKeywords).slice(0, limit);
}

// 计算候选 VOD 标题与请求关键词/别名的相似度。
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

// 对标题数字、季数和过宽匹配做强惩罚。
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

// 过滤被衍生作、剧场版、真人版、特别编辑版污染的标题。
function isTitlePolluted(item, payload) {
    const itemTitle = normalizeTitle(item.vod_name);
    const rawItemTitle = safeText(item.vod_name);
    const title = normalizeTitle(payload.title);
    const series = normalizeTitle(payload.seriesName || payload.title);
    const targets = uniq([title, series, ...payload.aliases.map(normalizeTitle)]).filter(Boolean);

    const requestedSpecial = payload.specialSeason || hasAnimeSpecialEvidence([payload.title, payload.seriesName, payload.episodeName].join(" "));
    if (/前传|后传|外传|番外|衍生/.test(rawItemTitle) && targets.some(target => itemTitle.includes(target)) && !targets.includes(itemTitle)) return true;
    // 长篇动漫主线优先，剧场版、真人版、特别编辑版必须降出候选，除非请求本身就是特别篇。
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

// 判断电影标题是否严格匹配，避免电影被相近标题抢占。
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

// 长篇动漫常见不同译名/副标题顺序，只要共享足够长的中文核心词即可进入播放集过滤。
function hasMeaningfulCjkOverlap(left, right) {
    const a = looseTitleText(left).replace(/[^\u4e00-\u9fa5A-Za-z0-9]/g, "");
    const b = looseTitleText(right).replace(/[^\u4e00-\u9fa5A-Za-z0-9]/g, "");
    const shorter = a.length <= b.length ? a : b;
    const longer = a.length <= b.length ? b : a;
    for (let length = Math.min(shorter.length, 8); length >= 3; length -= 1) {
        for (let index = 0; index + length <= shorter.length; index += 1) {
            const part = shorter.slice(index, index + length);
            if (/[\u4e00-\u9fa5]{3}/.test(part) && longer.includes(part)) return true;
        }
    }
    return false;
}

// 搜索结果和详情结果可能因源站 id 漂移不一致，详情标题必须重新确认相关性。
function detailTitleMatchesPayload(item, payload) {
    if (!item || !payload) return false;
    if (isMoviePayload(payload)) return isMovieTitleMatch(item, payload);
    if (isTitlePolluted(item, payload)) return false;
    const itemTitle = safeText(item.vod_name);
    const targetTitles = uniq([payload.title, payload.seriesName, ...(payload.aliases || [])].filter(Boolean));
    if (payload.mediaType === "tv") {
        const groups = splitMultiValue(item.vod_play_url, "$$$");
        const maxEpisodes = groups.reduce((max, group) => Math.max(max, parseEpisodes(group).length), 0);
        const itemText = [item.vod_name, item.vod_remarks, item.vod_class, item.type_name].join(" ");
        const looksLikeSideMovie = /电影|剧场版|劇場版|the\s*movie|movie|HD中字|HD国语|正片/i.test(itemText);
        const sideTitle = targetTitles.some(target => {
            const normalizedTarget = normalizeTitle(target);
            const normalizedItem = normalizeTitle(itemTitle);
            if (!normalizedTarget || !normalizedItem.startsWith(normalizedTarget) || normalizedItem === normalizedTarget) return false;
            const suffix = normalizedItem.slice(normalizedTarget.length);
            if (/^第[一二两三四五六七八九十\d]+季$/.test(suffix) || /^\d+$/.test(suffix)) return false;
            return /^(之|大电影|电影|剧场版|劇場版|themovie|movie)/i.test(suffix) || looksLikeSideMovie && maxEpisodes <= 3;
        });
        if (sideTitle) return false;
    }
    if (payload.longAnime || isHighEpisodeTvPayload(payload)) {
        const groups = splitMultiValue(item.vod_play_url, "$$$");
        const maxEpisodes = groups.reduce((max, group) => Math.max(max, parseEpisodes(group).length), 0);
        const totalEpisodes = Math.max(maxEpisodes, extractTotalEpisodes([item.vod_name, item.vod_remarks, item.vod_class, item.type_name].join(" ")));
        if (totalEpisodes >= 80 && targetTitles.some(target => hasMeaningfulCjkOverlap(itemTitle, target))) return true;
        if (totalEpisodes < Math.max(80, Number(payload.episode) || 0)) return false;
    }
    if (animeSeasonBridgeScore(item, payload)) return true;
    return targetTitles.some(target => {
        const normalizedItem = normalizeTitle(itemTitle);
        const normalizedTarget = normalizeTitle(target);
        const looseItem = looseTitleText(itemTitle);
        const looseTarget = looseTitleText(target);
        return normalizedItem === normalizedTarget
            || normalizedItem.includes(normalizedTarget)
            || normalizedTarget.includes(normalizedItem)
            || looseItem === looseTarget
            || looseItem.includes(looseTarget)
            || looseTarget.includes(looseItem);
    });
}

// 给候选条目的季数匹配程度打分。
function seasonMatchScore(item, payload) {
    if (!payload.seasonNumber) return 0;
    const text = [item.vod_name, item.vod_remarks, item.vod_class, item.type_name].map(safeText).join(" ");
    const itemSeason = extractSeasonNumber(text);
    const cleanItem = normalizeTitle(removeSeasonText(item.vod_name));
    const cleanSeries = normalizeTitle(removeSeasonText(payload.seriesName || payload.title));
    const bridgeScore = animeSeasonBridgeScore(item, payload);
    if (bridgeScore && itemSeason && itemSeason !== payload.seasonNumber) return bridgeScore;
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

// 根据 VOD 分类、地区、语言等字段给媒体类型匹配加分。
function mediaTypeScore(item, payload) {
    const text = [item.vod_class, item.type_name, item.vod_area, item.vod_lang, item.vod_remarks, item.vod_name].map(safeText).join(" ");
    let score = 0;
    if (payload.mediaType === "movie" && /电影|动作|科幻|剧情|喜剧|恐怖|动画电影/.test(text)) score += 14;
    if (payload.mediaType === "tv" && /剧|电视剧|欧美|韩国|香港|日本|动漫|动画/.test(text)) score += 12;
    if (/香港|港剧|粤语/.test(payload.title) && /香港|港剧|粤语/.test(text)) score += 18;
    if (isLikelyVariety(payload, item) && /综艺|真人秀|第\d+期|加更/.test(text)) score += 18;
    return score;
}

// 给清晰度和正片提示加分，对抢先、网盘、解说等降权。
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

// 汇总标题、季数、媒体类型、质量和污染过滤，得到搜索候选分数。
function scoreSearchMatch(item, payload, source, keyword) {
    if (!item || !item.vod_id || !item.vod_name) return -999;
    const itemNormalized = normalizeTitle(item.vod_name);
    const titleNormalized = normalizeTitle(payload.title);
    const requestedTitleNumber = extractTrailingTitleNumber(payload.title || payload.seriesName);
    const itemTitleNumber = extractTrailingTitleNumber(item.vod_name);

    // 续作数字、电影严格标题、衍生污染、普通动漫误入 OVA 都是硬过滤，不进入后续加权。
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
    const bridgeScore = animeSeasonBridgeScore(item, payload);
    if (bridgeScore) {
        score += bridgeScore;
        markDebugTrace(payload, "seasonBridge");
    }
    if (payload.specialSeason) {
        const specialScore = specialIdentityEvidenceScore([item.vod_name, item.vod_remarks, item.vod_class, item.type_name].join(" "), payload);
        score += specialScore || -70;
        markDebugTrace(payload, "specialIdentity");
    }
    score += mediaTypeScore(item, payload);
    score += qualityScore([item.vod_name, item.vod_remarks, item.vod_class, item.type_name].join(" "));

    if (isAuxiliaryTitle(item.vod_name)) score -= 220;
    if (isMoviePayload(payload) && isAuxiliaryTitle([item.vod_name, item.vod_remarks, item.vod_class].join(" "))) score -= 260;
    return score;
}

// 在单个源内按关键词搜索候选 VOD 条目。
async function searchSource(source, payload, keywords, timeout, options) {
    const results = [];
    const searchOptions = options || {};
    const keywordLimit = searchOptions.keywordLimit || (payload.specialSeason ? 4 : payload.longAnime ? 5 : timeout <= 2600 ? 3 : 5);
    const keywordBatch = keywords.slice(0, keywordLimit);
    const keywordConcurrency = searchOptions.keywordConcurrency || (timeout <= 2600 ? 2 : 3);
    let cursor = 0;
    async function searchKeyword(keyword) {
        try {
            // 同一请求里多阶段会反复搜到相同的 (源, 关键词)，原始 list 与 payload 无关，
            // 缓存后按需重新评分，省掉重复网络往返（实测能消掉每源每词 2~3 次重复查询）。
            const searchCache = payload.searchListCache instanceof Map ? payload.searchListCache : null;
            const cacheKey = `${source.id}::${keyword}`;
            let list;
            if (searchCache && searchCache.has(cacheKey)) {
                list = searchCache.get(cacheKey);
            } else {
                const data = await requestCms(source, { ac: "detail", wd: keyword }, timeout);
                list = Array.isArray(data.list) ? data.list : [];
                if (searchCache) searchCache.set(cacheKey, list);
            }
            const keywordResults = [];
            for (const item of list) {
                const score = scoreSearchMatch(item, payload, source, keyword);
                if (score < source.priority + 45) continue;
                keywordResults.push({
                    sourceId: source.id,
                    vodId: String(item.vod_id),
                    score: score,
                    title: safeText(item.vod_name)
                });
            }
            results.push(...keywordResults);
        } catch (error) {
            return;
        }
    }
    const workers = Array.from({ length: Math.min(keywordConcurrency, keywordBatch.length) }, async () => {
        while (cursor < keywordBatch.length) {
            const keyword = keywordBatch[cursor];
            cursor += 1;
            await searchKeyword(keyword);
        }
    });
    await Promise.allSettled(workers);
    return results;
}

// 对候选 VOD 条目按源和 vod_id 去重并截断数量。
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

// 并发搜索一组源，单源失败不影响其他源。
async function searchSourcesByIds(sourceIds, payload, keywords, timeout, options) {
    const settled = await Promise.allSettled(
        sourceIds.map(id => searchSource(SOURCE_MAP[id], payload, keywords, timeout, options))
    );
    return settled.flatMap(item => item.status === "fulfilled" ? item.value : []);
}

// 根据请求类型选择首批源，综艺和第 0 季优先查更容易命中的源，避免无效慢查。
function firstStageSourceIds(payload) {
    if (payload.specialSeason && payload.animeSpecialSeason) return SPECIAL_ANIME_SOURCE_IDS;
    if (payload.specialSeason && (payload.domesticVariety || payload.isVariety)) return uniq([...VARIETY_SOURCE_IDS, ...FAST_SOURCE_IDS]);
    if (payload.domesticVariety || payload.isVariety) return uniq([...VARIETY_SOURCE_IDS, ...FAST_SOURCE_IDS]);
    return FAST_SOURCE_IDS;
}

// 候选数量和分数足够时直接停止搜索，避免进入外部别名或 fallback 慢路径。
function hasEnoughCandidates(results, payload, minCount) {
    const candidates = dedupeCandidates(results, minCount || 8);
    if (candidates.length >= (minCount || 8)) return true;
    const strongSources = new Set(candidates.filter(candidate => candidate.score >= (SOURCE_MAP[candidate.sourceId].priority || 0) + 150).map(candidate => candidate.sourceId));
    if ((payload.domesticVariety || payload.isVariety) && payload.episodeIdentity && hasReliableVarietyIdentity(payload.episodeIdentity)) return strongSources.size >= 1;
    if (payload.longAnime || payload.specialSeason) return strongSources.size >= 2 || candidates.length >= 4;
    if (payload.requestIdentity && payload.requestIdentity.mediaKind === "series" && Number(payload.episode) > 0) return strongSources.size >= 2 || candidates.length >= 5;
    return false;
}

// 首轮完全无候选且没有强别名价值时，快速返回空，避免暂无资源页面长时间转圈。
function shouldFastFailAfterFirstStage(payload, results) {
    if (results && results.length) return false;
    if (payload.specialSeason) {
        const identity = payload.specialEpisodeIdentity || {};
        return !identity.hasEvidence && !identity.dateCodes.length && !identity.titleTokens.length;
    }
    if (payload.longAnime || (payload.animeIdentity && payload.animeIdentity.isLikelyAnime)) return false;
    if (payload.domesticVariety || payload.isVariety) return Boolean(payload.episodeIdentity && hasReliableVarietyIdentity(payload.episodeIdentity));
    const text = [payload.title, payload.seriesName, payload.rawParams && payload.rawParams.originalTitle, payload.rawParams && payload.rawParams.originalName].map(safeText).join(" ");
    const foreignNewSeries = payload.mediaType === "tv" && /[A-Za-z]{4,}/.test(text) && !/[\u4e00-\u9fa5]/.test(text) && Number(payload.seasonNumber) <= 1;
    return foreignNewSeries;
}

// 分阶段搜索：先快源精准命中，不足时再查外部别名和 fallback 源。
async function searchCandidates(payload, options) {
    const searchOptions = options || {};
    const forceExternalAliases = Boolean(searchOptions.forceExternalAliases);
    const keywords = buildSearchKeywords(payload);
    const fastIds = firstStageSourceIds(payload).filter(id => PRIMARY_SOURCE_IDS.includes(id) || FALLBACK_SOURCE_IDS.includes(id));
    const fullIds = PRIMARY_SOURCE_IDS.filter(id => !fastIds.includes(id));
    // 第一阶段只查快源和少量精准关键词，用来尽快给 Forward 返回可用资源。
    let results = await searchSourcesByIds(fastIds, payload, keywords.slice(0, 3), 2600);
    let searchPayload = payload;
    let fastFailed = false;

    if (searchOptions.allowFastFail && shouldFastFailAfterFirstStage(payload, results)) {
        markDebugTrace(payload, "fallbackSkipped");
        fastFailed = true;
        return {
            candidates: [],
            payload: searchPayload,
            fastFailed: fastFailed
        };
    }

    if (!searchOptions.fastOnly && fullIds.length) {
        // 第二阶段补齐均衡主源。均衡源是和快源同速的 CMS 接口，不是慢的外部别名 API，
        // 且本阶段只在首轮命中不足时才进入，所以无条件补齐——快源常只有一份正确分卷，
        // 其余正确分卷（如死神千年血战篇第二季）往往只在均衡源里，漏查会丢覆盖。
        results = results.concat(await searchSourcesByIds(fullIds, payload, keywords, 3200));
    }

    const shouldUseExternalAliases = forceExternalAliases || (!hasEnoughCandidates(results, payload, 5) && (results.length < 4 || payload.longAnime || payload.animeSpecialSeason || payload.animeIdentity && payload.animeIdentity.isLikelyAnime));
    if (!searchOptions.fastOnly && shouldUseExternalAliases) {
        // 外部别名只在命中不足、长篇动漫或特别季时启用，避免每次详情页都被外部 API 拖慢。
        markDebugTrace(payload, "externalAlias");
        const externalAliases = await fetchExternalAliases(payload);
        if (externalAliases.length) {
            const expandedExternalAliases = externalAliases.flatMap(alias => titleWritingVariants(alias));
            searchPayload = Object.assign({}, payload, { aliases: uniq([...(payload.aliases || []), ...externalAliases, ...expandedExternalAliases]) });
            searchPayload.animeIdentity = buildAnimeIdentity(searchPayload);
            searchPayload.requestIdentity = buildRequestIdentity(searchPayload);
            const aliasKeywords = buildSearchKeywords(searchPayload);
            const aliasSourceIds = searchPayload.animeSpecialSeason ? SPECIAL_ANIME_SOURCE_IDS : PRIMARY_SOURCE_IDS;
            results = results.concat(await searchSourcesByIds(aliasSourceIds, searchPayload, aliasKeywords, 3200, { keywordLimit: forceExternalAliases ? 8 : 4 }));
        }
    }

    if (!searchOptions.fastOnly && searchPayload.animeIdentity && searchPayload.animeIdentity.isLikelyAnime && !hasEnoughCandidates(results, searchPayload, 4)) {
        const animeFallbackKeywords = uniq([
            ...buildSearchKeywords(searchPayload),
            ...buildSearchKeywords(payload),
            safeText(payload.rawParams && payload.rawParams.originalTitle),
            safeText(payload.rawParams && payload.rawParams.originalName)
        ]).filter(Boolean);
        results = results.concat(await searchSourcesByIds(SPECIAL_ANIME_SOURCE_IDS, searchPayload, animeFallbackKeywords, 3000, { keywordLimit: 6 }));
    }

    if (!searchOptions.fastOnly && !hasEnoughCandidates(results, searchPayload, 8)) {
        // fallback 源只作为补缺，不让慢源参与首屏结果。
        const fallbackIds = searchPayload.animeSpecialSeason ? SPECIAL_ANIME_SOURCE_IDS.filter(id => FALLBACK_SOURCE_IDS.includes(id)) : FALLBACK_SOURCE_IDS;
        results = results.concat(await searchSourcesByIds(fallbackIds, searchPayload, buildSearchKeywords(searchPayload).slice(0, 3), 2800));
    }

    return {
        candidates: dedupeCandidates(results, searchOptions.fastOnly ? 10 : 16),
        payload: searchPayload,
        fastFailed: fastFailed
    };
}

// 解析 CMS vod_play_url 中用 # 和 $ 拼接的播放列表。
function parseEpisodes(playGroup) {
    const cacheKey = safeText(playGroup);
    if (MATCH_CACHE.episodes.has(cacheKey)) return MATCH_CACHE.episodes.get(cacheKey);
    const episodes = splitMultiValue(playGroup, "#")
        .map(part => {
            const splitIndex = part.indexOf("$");
            if (splitIndex <= 0) return null;
            const title = safeText(part.slice(0, splitIndex)) || "正片";
            const videoUrl = safeText(part.slice(splitIndex + 1));
            if (!videoUrl) return null;
            return { title, videoUrl };
        })
        .filter(Boolean);
    MATCH_CACHE.episodes.set(cacheKey, episodes);
    return episodes;
}

// 给播放线路打分，优先 m3u8/mp4/http，降权网盘分享。
function scorePlayGroup(groupName, groupText, episodes, source) {
    let score = source.priority || 0;
    const sampleUrl = episodes[0] ? episodes[0].videoUrl : "";
    const text = `${groupName} ${groupText} ${sampleUrl}`.toLowerCase();

    if (text.includes(".m3u8")) score += 70;
    if (text.includes(".mp4")) score += 45;
    if (text.includes("https://")) score += 12;
    if (/https?:\/\//.test(text)) score += 18;
    if (text.includes("share/")) score -= 25;
    if (text.includes("quark") || text.includes("aliyun") || text.includes("115") || text.includes("迅雷")) score -= 45;
    if (isAuxiliaryTitle(groupName)) score -= 120;
    score += qualityScore(`${groupName} ${groupText}`);
    score += Math.min(episodes.length, 80);
    return score;
}

// 归一化单集标签，便于比较 E01、第01集、01 等写法。
function normalizeEpisodeLabel(label) {
    return normalizeText(label)
        .replace(/第/g, "")
        .replace(/集|话|回|期|章/g, "")
        .replace(/episode/g, "e")
        .replace(/ep/g, "e")
        .replace(/正片/g, "");
}

// 提取文本中所有数字，用于弱匹配集数。
function extractNumbers(text) {
    return (safeText(text).match(/\d+/g) || []).map(number => Number(number)).filter(Boolean);
}

// 判断播放标签是否命中请求集数。
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

// 判断综艺播放标签是否可以参与节目单顺序兜底。
function isVarietyScheduleEpisode(label, payload) {
    const identity = buildEpisodeIdentity(label, payload);
    if (identity.kind === "trailer" || identity.kind === "cut") return false;
    if (identity.kind === "behind") return false;
    if (/回顾|特辑|直播|采访|专访|直拍|彩蛋|花絮|名场面|副本解锁|存档|发布会/.test(safeText(label))) return false;
    return Boolean(identity.dateCodes.length || identity.issueNumber || identity.part || identity.kind === "normal" || identity.kind === "plus" || identity.kind === "early" || identity.kind === "pure" || identity.kind === "member" || identity.kind === "special");
}

// Forward 缺 episodeName 时，用有效节目单顺序弱兜底。
function varietyScheduleOrdinalScore(payload, ordinal) {
    const ep = Number(payload.episode) || 0;
    if (!ep || !ordinal) return 0;
    if (payload.episodeName || (payload.episodeIdentity && hasReliableVarietyIdentity(payload.episodeIdentity))) return 0;
    return ordinal === ep ? 210 : -90;
}

// 判断是否是缺少 episodeName 的中文 TV 请求。
function isChineseTvWithoutEpisodeName(payload) {
    return Boolean(
        payload
        && payload.mediaType === "tv"
        && Number(payload.episode) > 0
        && !payload.episodeName
        && /[\u4e00-\u9fa5]/.test([payload.title, payload.seriesName].join(""))
    );
}

// 判断最终资源名是否看起来像综艺节目单标签。
function streamLooksLikeVariety(stream, payload) {
    const text = safeText(stream && stream.name).split("·").pop();
    const identity = buildEpisodeIdentity(text, payload || {});
    return Boolean(identity.issueNumber || identity.part || identity.dateCodes.length || identity.kind !== "normal" || /期|先导|加更|纯享|超前|会员|花絮|彩蛋/.test(text));
}

// 给单个播放集标签打分，决定哪一集最符合请求。
function episodeMatchScore(label, payload, index, item, totalEpisodes, scheduleOrdinal) {
    if (isMoviePayload(payload)) return 0;

    const rawLabel = safeText(label);
    const normalized = normalizeEpisodeLabel(rawLabel);
    const ep = Number(payload.episode) || 0;
    const epText = ep ? String(ep) : "";
    const epPadded = ep ? String(ep).padStart(2, "0") : "";
    const animeLocalNumbers = animeLocalEpisodeNumbers(payload, item, totalEpisodes);
    const hasRequestedDate = episodeHasRequestedDate(rawLabel, payload);
    const variety = isLikelyVariety(payload, item);
    let score = 0;
    const identityScore = varietyIdentityScore(rawLabel, payload, item, index);

    if (!payload.episodeName && isChineseTvWithoutEpisodeName(payload) && variety && !scheduleOrdinal) return -999;
    if (!payload.episodeName && isChineseTvWithoutEpisodeName(payload) && variety && scheduleOrdinal) {
        const labelIdentity = buildEpisodeIdentity(rawLabel, payload);
        if (labelIdentity.part === "up" && ep >= 2 && !labelIdentity.issueNumber) return -999;
        if (ep && scheduleOrdinal > ep + 4) return -999;
    }

    if (identityScore !== null) {
        if (payload.episodeIdentity && hasReliableVarietyIdentity(payload.episodeIdentity) && payload.episodeIdentity.part) {
            const labelIdentity = buildEpisodeIdentity(rawLabel, payload);
            const hasNearIdentityDate = payload.episodeIdentity.dateCodes.length && labelIdentity.dateCodes.length && hasNearRequestedDate(payload.episodeIdentity.dateCodes, labelIdentity.dateCodes, 1);
            if (labelIdentity.part !== payload.episodeIdentity.part && !hasNearIdentityDate) return -999;
        }
        if (payload.episodeIdentity && hasReliableVarietyIdentity(payload.episodeIdentity)) return identityScore;
        score += identityScore;
    }
    score += varietyScheduleOrdinalScore(payload, scheduleOrdinal);

    if (payload.specialSeason) {
        // 第 0 季/OVA/特别篇：在不放宽证据门槛的前提下，用单集标题证据分、时长相近度和
        // 标题关键词重叠把“对的那一条特别集”排到前面，缓解 OVA、特别篇难命中的问题。
        const evidenceText = `${rawLabel} ${[item && item.vod_name, item && item.vod_remarks].map(safeText).join(" ")}`;
        score += specialIdentityEvidenceScore(evidenceText, payload);
        score += durationScore(payload.durationMinutes, item);
        const identity = payload.specialEpisodeIdentity;
        if (identity && identity.titleTokens && identity.titleTokens.length) {
            score += titleTokenOverlapScore(identity.titleTokens, extractSpecialTitleTokens(rawLabel));
        }
    }

    if (payload.seasonNumber && ep) {
        const seText = `s${String(payload.seasonNumber).padStart(2, "0")}e${epPadded}`;
        if (normalized.includes(seText)) score += 180;
    }
    if (ep && (normalized.includes(`e${epText}`) || normalized.includes(`e${epPadded}`))) score += 130;
    if (ep && episodeNumberMatches(rawLabel, ep)) score += payload.longAnime ? 220 : variety ? 8 : 100;
    if (ep && index + 1 === ep && totalEpisodes > 1) score += payload.longAnime ? 8 : variety ? 4 : 55;
    if (animeLocalNumbers.length > 1) {
        for (const localNumber of animeLocalNumbers) {
            if (localNumber === ep) continue;
            if (episodeNumberMatches(rawLabel, localNumber) || index + 1 === localNumber) {
                score += 145 + animeSeasonBridgeScore(item, payload);
                markDebugTrace(payload, "globalToLocalEpisode");
                break;
            }
        }
    }

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

// 构造资源描述，展示来源、标题、备注、线路和总集数。
function buildStreamDescription(source, item, totalEpisodes, groupName) {
    const bits = [];
    bits.push(source.name);
    if (safeText(item.vod_name)) bits.push(safeText(item.vod_name));
    if (safeText(item.vod_remarks)) bits.push(safeText(item.vod_remarks));
    if (safeText(groupName)) bits.push(safeText(groupName));
    if (totalEpisodes > 1) bits.push(`共${totalEpisodes}集`);
    return bits.join(" | ");
}

// 从 VOD 详情的播放列表中提取可返回给 Forward 的候选资源。
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

        if (movie) {
            // 电影没有集数概念，取第一个非预告/解说的可播项。
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
            if (payload.specialSeason && !specialIdentityMatchesText(`${itemEvidenceText} ${episode.title}`, payload)) continue;
            // 国内综艺缺 episodeName 时只统计有效节目单项，回顾/花絮/直播等不参与顺序兜底。
            const shouldUseScheduleOrdinal = (isLikelyVariety(payload, item) || isChineseTvWithoutEpisodeName(payload)) && isVarietyScheduleEpisode(episode.title, payload);
            const scheduleOrdinal = shouldUseScheduleOrdinal ? ++varietyScheduleOrdinal : 0;
            const matchScore = episodeMatchScore(episode.title, payload, index, item, episodes.length, scheduleOrdinal);
            if (matchScore <= 0) continue;
            matchedAny = true;
            candidates.push({
                name: `${source.name} · ${episode.title}`,
                description: buildStreamDescription(source, item, episodes.length, groupName),
                url: episode.videoUrl,
                score: scorePlayGroup(groupName, playGroup, [episode], source) + matchScore + (Number(payload.itemBridgePenalty) || 0)
            });
        }

        if (!matchedAny && isLikelyVariety(payload, item) && payload.seasonNumber && seasonMatchScore(item, payload) > 0 && !(payload.dateCodes && payload.dateCodes.length) && !(payload.episodeIdentity && hasReliableVarietyIdentity(payload.episodeIdentity))) {
            // 仅在完全没有可靠期身份时，才允许同季综艺兜底到最新节目单。
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

// 根据 VOD 详情播放列表反推长篇动漫状态，并扩展候选标题。
function derivePayloadForItem(payload, item) {
    const playGroups = splitMultiValue(item && item.vod_play_url, "$$$");
    const maxEpisodes = playGroups.reduce((max, group) => Math.max(max, parseEpisodes(group).length), 0);
    const evidenceText = [item && item.vod_name, item && item.vod_remarks, item && item.vod_class, item && item.type_name].map(safeText).join(" ");
    const totalEpisodes = Math.max(maxEpisodes, extractTotalEpisodes(evidenceText));
    const bridgeScore = animeSeasonBridgeScore(item, payload);
    const expectedSeason = expectedAnimeSourceSeason(payload, totalEpisodes);
    const itemSeason = extractSeasonNumber(evidenceText);
    const bridgePenalty = bridgeScore && expectedSeason && itemSeason && itemSeason !== expectedSeason ? -120 : 0;
    if (totalEpisodes >= 80 && isAnimePayload(payload, item)) {
        // 有些长篇动漫只有打开详情后才能知道总集数，这里二次确认 longAnime。
        return Object.assign({}, payload, {
            isAnime: true,
            longAnime: true,
            aliases: uniq([...(payload.aliases || []), safeText(item && item.vod_name)]),
            itemBridgePenalty: bridgePenalty
        });
    }
    if (bridgePenalty) return Object.assign({}, payload, { itemBridgePenalty: bridgePenalty });
    return payload;
}

// 拉取候选 VOD 详情并解析出具体可播放资源。
async function fetchStreamsByCandidate(candidate, payload) {
    const source = SOURCE_MAP[candidate.sourceId];
    if (!source) return [];

    try {
        const data = await requestCms(source, { ac: "detail", ids: candidate.vodId }, 4600);
        const item = Array.isArray(data.list) ? data.list[0] : null;
        if (!item || isAuxiliaryTitle([item.vod_name, item.vod_remarks, item.vod_class].join(" "))) return [];
        if (!detailTitleMatchesPayload(item, payload)) return [];
        const itemPayload = derivePayloadForItem(payload, item);
        // 再次守住特别季、真人版和季数边界，防止搜索候选阶段漏网。
        if (itemPayload.specialSeason && !specialIdentityMatchesText([item.vod_name, item.vod_remarks, item.vod_class, item.type_name, item.vod_play_url].join(" "), itemPayload)) return [];
        if (!hasAnimeSpecialEvidence([itemPayload.title, itemPayload.seriesName, itemPayload.episodeName].join(" ")) && /(真人版|真人剧|live\s*action)/i.test([item.vod_name, item.vod_remarks, item.vod_class, item.type_name].join(" "))) return [];
        if (itemPayload.explicitSeason && itemPayload.seasonNumber && seasonMatchScore(item, itemPayload) < 0 && !animeSeasonBridgeScore(item, itemPayload)) return [];
        return parseEpisodeCandidates(item, source, itemPayload);
    } catch (error) {
        return [];
    }
}

// 按 URL 和名称去重最终资源，并剥离内部 score 字段。
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

// 并发解析候选详情，按播放候选分数排序。
async function resolveCandidateStreams(candidates, payload, limit) {
    const selected = candidates.slice(0, limit);
    const streams = [];
    const batchSize = payload.animeSpecialSeason ? 2 : 3;
    for (let index = 0; index < selected.length; index += batchSize) {
        const streamGroups = await Promise.allSettled(
            selected.slice(index, index + batchSize).map(candidate => fetchStreamsByCandidate(candidate, payload))
        );
        streams.push(...streamGroups.flatMap(item => item.status === "fulfilled" ? item.value : []));
        streams.sort((a, b) => b.score - a.score);
        if (hasEnoughStreams(streams, payload)) break;
    }
    return streams.sort((a, b) => b.score - a.score);
}

// 判断首批结果是否已经足够好，决定是否进入慢速补全阶段。
function hasEnoughStreams(streams, payload) {
    const filtered = filterExactEpisodeStreams(streams, payload);
    const directStreams = filtered.filter(stream => /\.(m3u8|mp4)(?:\?|$)|^https?:\/\//i.test(stream.url));
    const directSourceCount = new Set(directStreams.map(stream => safeText(stream.description).split(" | ")[0] || safeText(stream.name).split("·")[0])).size;
    if (directStreams.length >= 5 && directSourceCount >= 2) return true;
    if (isMoviePayload(payload) && directStreams.length >= 3) return true;
    if ((payload.domesticVariety || payload.isVariety) && payload.episodeIdentity && hasReliableVarietyIdentity(payload.episodeIdentity)) {
        return directStreams.length > 0 || filtered.length > 0;
    }
    if ((payload.longAnime || payload.animeSpecialSeason) && directStreams.length >= 3) return true;
    if (payload.requestIdentity && payload.requestIdentity.mediaKind === "series" && Number(payload.episode) > 0 && directStreams.length >= 4) return true;
    return false;
}

// 最后一层精确过滤，确保返回资源仍符合集数、日期或综艺期身份。
function filterExactEpisodeStreams(streams, payload) {
    if (isMoviePayload(payload)) return streams;
    let filteredStreams = streams;
    const hasReliableIdentity = payload.episodeIdentity && hasReliableVarietyIdentity(payload.episodeIdentity);

    if (payload.specialSeason) {
        const specialStreams = filteredStreams.filter(stream => specialIdentityMatchesText(`${stream.name} ${stream.description}`, payload));
        if (specialStreams.length) filteredStreams = specialStreams;
        else return [];
    }

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
        const scheduleStreams = filteredStreams.filter(stream => {
            const label = safeText(stream.name).split("·").pop();
            const identity = buildEpisodeIdentity(label, payload);
            if (identity.kind === "trailer" || identity.kind === "cut" || identity.kind === "behind") return false;
            if (/回顾|特辑|直播|采访|专访|直拍|彩蛋|花絮|名场面|副本解锁|存档|发布会|加更|纯享|超前|会员版/.test(label)) return false;
            return identity.issueNumber || identity.part || identity.dateCodes.length || episodeNumberMatches(label, episodeNumber);
        });
        const strongScheduleStreams = scheduleStreams.filter(stream => Number(stream.score) >= 100);
        const datedStreams = (strongScheduleStreams.length ? strongScheduleStreams : scheduleStreams).filter(stream => parseDateCode(stream.name));
        if (datedStreams.length) {
            const allowedDates = uniq(datedStreams.map(stream => parseDateCode(stream.name)).sort()).slice(0, 2);
            const nearDatedStreams = datedStreams.filter(stream => allowedDates.includes(parseDateCode(stream.name)));
            if (nearDatedStreams.length) return nearDatedStreams;
        }
        if (strongScheduleStreams.length) return strongScheduleStreams;
        return scheduleStreams.length ? scheduleStreams : filteredStreams;
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
        if (payload.animeIdentity && payload.animeIdentity.isLikelyAnime) {
            const animeLocalEpisode = filteredStreams.filter(stream => {
                const totalMatch = safeText(stream.description).match(/共(\d+)集/);
                const localNumbers = animeLocalEpisodeNumbers(payload, { vod_name: stream.description, vod_remarks: stream.description, vod_class: "动漫" }, totalMatch ? Number(totalMatch[1]) : 0);
                return localNumbers.some(number => number !== episodeNumber && episodeNumberMatches(`${stream.name} ${stream.description}`, number));
            });
            if (animeLocalEpisode.length) return animeLocalEpisode;
        }
    }

    return filteredStreams;
}

// Forward stream 入口：构建 payload、补 TMDB、分阶段搜源并返回可播资源。
async function loadResource(params) {
    const rawParams = params || {};
    let payload = buildStreamPayload(rawParams);
    const enrichedParams = await enrichParamsFromTmdbEpisode(rawParams, payload);
    if (enrichedParams !== rawParams) payload = buildStreamPayload(enrichedParams);
    if (!payload.title && !payload.seriesName) return [];

    // 请求级缓存：分阶段搜源会重复命中相同 (源, 关键词)，缓存原始 list 避免重复网络请求。
    payload.searchListCache = new Map();
    globalThis.__VodMaxLastDebug = payload.debugTrace;
    let searchResult = await searchCandidates(payload, { fastOnly: true, allowFastFail: true });
    let candidates = searchResult.candidates;
    let resolvedPayload = searchResult.payload || payload;
    if (searchResult.fastFailed) return [];
    let streams = await resolveCandidateStreams(candidates, resolvedPayload, 6);
    const resolvedCandidateKeys = new Set(candidates.slice(0, 6).map(candidate => `${candidate.sourceId}:${candidate.vodId}`));
    if (resolvedPayload.specialSeason && !filterExactEpisodeStreams(streams, resolvedPayload).length) {
        markDebugTrace(resolvedPayload, "fallbackSkipped");
        return [];
    }

    if (!hasEnoughStreams(streams, resolvedPayload)) {
        // 外部别名（TVMaze/Wikidata/Jikan/Bangumi）每个约 1.5~1.8s，只有“本地标题压根没匹配上”
        // 时才值得查；已经有任一精确命中时强制外部别名只会徒增延迟，交给第二阶段均衡源补齐即可。
        const exactCount = filterExactEpisodeStreams(streams, resolvedPayload).length;
        searchResult = await searchCandidates(payload, { fastOnly: false, forceExternalAliases: exactCount === 0 });
        candidates = searchResult.candidates;
        resolvedPayload = searchResult.payload || payload;
        const remainingCandidates = candidates.filter(candidate => !resolvedCandidateKeys.has(`${candidate.sourceId}:${candidate.vodId}`));
        const moreStreams = await resolveCandidateStreams(remainingCandidates, resolvedPayload, 8);
        streams = streams.concat(moreStreams).sort((a, b) => b.score - a.score);
    }

    return dedupeStreams(filterExactEpisodeStreams(streams, resolvedPayload));
}
