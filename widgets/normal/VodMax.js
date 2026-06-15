const SOURCES = [
    { id: "feifan", name: "非凡资源", baseUrl: "http://ffzy5.tv/api.php/provide/vod", priority: 100 },
    { id: "ruyi", name: "如意资源", baseUrl: "https://cj.rycjapi.com/api.php/provide/vod", priority: 98 },
    { id: "jisu", name: "极速资源", baseUrl: "https://jszyapi.com/api.php/provide/vod", priority: 96 },
    { id: "ikun", name: "iKun资源", baseUrl: "https://ikunzyapi.com/api.php/provide/vod", priority: 94 },
    { id: "wujin", name: "无尽资源", baseUrl: "https://api.wujinapi.com/api.php/provide/vod", priority: 92 },
    { id: "piaoling", name: "飘零资源", baseUrl: "https://p2100.net/api.php/provide/vod", priority: 90 },
    { id: "zuida", name: "最大资源", baseUrl: "https://api.zuidapi.com/api.php/provide/vod", priority: 89 },
    { id: "baofeng", name: "暴风资源", baseUrl: "https://bfzyapi.com/api.php/provide/vod", priority: 86 },
    { id: "feifanapi", name: "非凡API", baseUrl: "https://api.ffzyapi.com/api.php/provide/vod", priority: 84 },
    { id: "wujinnet", name: "无尽NET", baseUrl: "https://api.wujinapi.net/api.php/provide/vod", priority: 83 },
    { id: "wujincc", name: "无尽CC", baseUrl: "https://api.wujinapi.cc/api.php/provide/vod", priority: 82 },
    { id: "dbzy", name: "豆瓣资源", baseUrl: "https://dbzy.tv/api.php/provide/vod", priority: 80 },
    { id: "hongniu3", name: "红牛资源3", baseUrl: "https://www.hongniuzy3.com/api.php/provide/vod", priority: 78 },
    { id: "hongniu", name: "红牛资源", baseUrl: "https://www.hongniuzy2.com/api.php/provide/vod", priority: 76 },
    { id: "haihua", name: "海豚资源", baseUrl: "https://hhzyapi.com/api.php/provide/vod", priority: 75 },
    { id: "subo", name: "速博资源", baseUrl: "https://subocaiji.com/api.php/provide/vod", priority: 72 },
    { id: "aidan", name: "爱蛋资源", baseUrl: "https://lovedan.net/api.php/provide/vod", priority: 70 },
    { id: "feifancj2", name: "非凡采集HTTPS", baseUrl: "https://cj.ffzyapi.com/api.php/provide/vod", priority: 68 },
    { id: "guangsu", name: "光速资源", baseUrl: "https://api.guangsuapi.com/api.php/provide/vod", priority: 66 },
    { id: "uku88", name: "U酷资源88", baseUrl: "https://api.ukuapi88.com/api.php/provide/vod", priority: 62 },
    { id: "maotai", name: "茅台资源", baseUrl: "https://caiji.maotaizy.cc/api.php/provide/vod", priority: 50 }
];

const SOURCE_MAP = Object.fromEntries(SOURCES.map(source => [source.id, source]));

const DEFAULT_SOURCE_IDS = SOURCES
    .slice()
    .sort((a, b) => b.priority - a.priority)
    .map(source => source.id);

const DEFAULT_SOURCE_OPTIONS = DEFAULT_SOURCE_IDS.map(id => ({
    title: `${SOURCE_MAP[id].priority >= 90 ? "⭐" : "•"} ${SOURCE_MAP[id].name}`,
    value: id
}));

WidgetMetadata = {
    id: "vod_max_stream_repair_20260615",
    title: "VOD资源聚合 Auto Repair",
    description: "支持首页浏览，也支持详情页自动资源解析",
    author: "OpenAI x Codex",
    version: "4.0.0",
    requiredVersion: "0.0.1",
    site: "https://github.com/wrs0918/forward-widgets",
    detailCacheDuration: 1800,
    modules: [
        {
            id: "loadResource",
            title: "加载资源",
            functionName: "loadResource",
            type: "stream",
            cacheDuration: 300,
            params: []
        },
        {
            title: "VOD 最新更新",
            functionName: "loadVodList",
            type: "list",
            cacheDuration: 180,
            params: [
                {
                    name: "source",
                    title: "默认列表源",
                    type: "enumeration",
                    value: DEFAULT_SOURCE_IDS[0],
                    enumOptions: DEFAULT_SOURCE_OPTIONS
                },
                { name: "page", title: "页码", type: "page", startPage: 1 }
            ]
        }
    ]
};

function buildHeaders() {
    return {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15",
        "Accept": "application/json, text/javascript, */*; q=0.01"
    };
}

function safeText(value) {
    return String(value || "").trim();
}

function parseJson(data) {
    if (typeof data === "string") return JSON.parse(data);
    return data || {};
}

async function requestCms(source, params, timeout) {
    const response = await Widget.http.get(source.baseUrl, {
        params: Object.assign({ out: "json" }, params),
        headers: buildHeaders(),
        timeout: timeout || 7000
    });
    return parseJson(response.data);
}

function normalizeText(value) {
    return safeText(value)
        .replace(/（/g, "(")
        .replace(/）/g, ")")
        .replace(/[·•]/g, "")
        .replace(/\s+/g, "")
        .toLowerCase();
}

function normalizeTitle(title) {
    return normalizeText(title)
        .replace(/粤语版|国语版|普通话版|粤语|国语|普通话/g, "")
        .replace(/完整版|加更版|超前营业|reaction|电影解说|预告|花絮|先导片/g, "")
        .replace(/-普通话版|-粤语版/g, "")
        .replace(/[「」"'`]/g, "");
}

function cleanSearchKeyword(title) {
    return safeText(title)
        .replace(/\s+/g, " ")
        .replace(/[\[\(（【].*?(粤语|国语|普通话|加更|超前营业|reaction|电影解说|预告|花絮).*?[\]\)）】]/gi, "")
        .replace(/第[一二三四五六七八九十百\d]+季/g, "")
        .replace(/season\s*\d+/gi, "")
        .trim();
}

function splitMultiValue(value, separator) {
    return safeText(value)
        .split(separator)
        .map(part => safeText(part))
        .filter(Boolean);
}

function buildLinkPayload(payload) {
    return "vodmax::" + encodeURIComponent(JSON.stringify(payload));
}

function parseLinkPayload(link) {
    if (!safeText(link).startsWith("vodmax::")) return null;
    return JSON.parse(decodeURIComponent(link.slice(8)));
}

function stripHtml(text) {
    return safeText(text).replace(/<[^>]+>/g, "");
}

function isAuxiliaryTitle(title) {
    return /(解说|预告|花絮|reaction|直拍|片花|彩蛋|直播|cut|速看|短剧)/i.test(safeText(title));
}

function seasonEpisodeText(season, episode) {
    if (!season || !episode) return "";
    return `s${String(season).padStart(2, "0")}e${String(episode).padStart(2, "0")}`;
}

function simplifySeriesName(seriesName) {
    return cleanSearchKeyword(seriesName)
        .replace(/[：:]\s*.*$/g, "")
        .trim();
}

function buildListItem(item, source) {
    const payload = {
        sourceId: source.id,
        vodId: String(item.vod_id),
        title: safeText(item.vod_name),
        coverUrl: safeText(item.vod_pic),
        year: safeText(item.vod_year),
        className: safeText(item.vod_class || item.type_name || item.vod_area),
        remarks: safeText(item.vod_remarks),
        searchTitle: cleanSearchKeyword(item.vod_name)
    };
    const link = buildLinkPayload(payload);
    return {
        id: link,
        type: "link",
        title: safeText(item.vod_name),
        description: safeText(item.vod_remarks || item.vod_blurb || "暂无简介"),
        coverUrl: safeText(item.vod_pic),
        link: link,
        subTitle: safeText(item.vod_time || source.name)
    };
}

async function loadVodList(params) {
    const source = SOURCE_MAP[params.source || DEFAULT_SOURCE_IDS[0]] || SOURCES[0];
    const page = params.page || 1;

    try {
        const data = await requestCms(source, { ac: "videolist", pg: page }, 6500);
        const list = Array.isArray(data.list) ? data.list : [];
        if (!list.length) {
            return [{
                id: "empty",
                type: "text",
                title: "当前源没有返回数据",
                description: `${source.name} 第 ${page} 页为空，可以切换其他源`
            }];
        }
        return list.map(item => buildListItem(item, source));
    } catch (error) {
        return [{
            id: "error",
            type: "text",
            title: `请求失败: ${source.name}`,
            description: String(error.message || error)
        }];
    }
}

function buildStreamPayload(params) {
    const seriesName = safeText(params.seriesName);
    const movieTitle = safeText(params.title || params.episodeName || params.id);
    const isTv = safeText(params.type) === "tv";
    const title = isTv ? (seriesName || movieTitle) : (movieTitle || seriesName);

    return {
        title: title,
        searchTitle: isTv ? simplifySeriesName(title) : cleanSearchKeyword(title),
        mediaType: safeText(params.type),
        tmdbId: safeText(params.tmdbId),
        imdbId: safeText(params.imdbId),
        season: safeText(params.season),
        episode: safeText(params.episode),
        seriesName: seriesName,
        episodeName: safeText(params.episodeName),
        link: safeText(params.link)
    };
}

function scoreSearchMatch(item, payload, source) {
    const itemTitle = safeText(item.vod_name);
    const normalizedItemTitle = normalizeTitle(itemTitle);
    const normalizedSearchTitle = normalizeTitle(payload.searchTitle || payload.title);
    const normalizedTitle = normalizeTitle(payload.title);

    let score = source.priority || 0;

    if (normalizedItemTitle === normalizedSearchTitle || normalizedItemTitle === normalizedTitle) {
        score += 130;
    } else if (normalizedItemTitle.startsWith(normalizedSearchTitle)) {
        score += 95;
    } else if (normalizedItemTitle.includes(normalizedSearchTitle)) {
        score += 80;
    } else if (normalizedSearchTitle.includes(normalizedItemTitle) && normalizedItemTitle.length >= 2) {
        score += 40;
    }

    if (payload.mediaType === "tv") {
        const text = [item.vod_class, item.type_name, item.vod_area, item.vod_lang, item.vod_remarks].map(safeText).join(" ");
        if (/香港|粤语|港/.test(payload.title) && /香港|粤语|港/.test(text)) score += 18;
        if (/剧情|电视剧|香港剧/.test(text)) score += 10;
    }

    if (payload.mediaType === "movie") {
        const text = [item.vod_class, item.type_name, item.vod_remarks].map(safeText).join(" ");
        if (/电影/.test(text)) score += 8;
    }

    if (isAuxiliaryTitle(itemTitle)) score -= 140;
    return score;
}

async function searchCandidates(payload) {
    const keyword = cleanSearchKeyword(payload.searchTitle || payload.title);
    const candidateSourceIds = DEFAULT_SOURCE_IDS.slice(0, 20);
    const settled = await Promise.allSettled(
        candidateSourceIds.map(id => requestCms(SOURCE_MAP[id], { ac: "detail", wd: keyword }, 7000))
    );

    const results = [];
    for (let index = 0; index < settled.length; index += 1) {
        const sourceId = candidateSourceIds[index];
        const source = SOURCE_MAP[sourceId];
        const settledItem = settled[index];
        if (settledItem.status !== "fulfilled") continue;

        const list = Array.isArray(settledItem.value.list) ? settledItem.value.list : [];
        for (const item of list) {
            if (!item || !item.vod_id || !item.vod_name) continue;
            const score = scoreSearchMatch(item, payload, source);
            if (score < source.priority + 55) continue;
            results.push({
                sourceId: source.id,
                vodId: String(item.vod_id),
                score: score,
                title: safeText(item.vod_name)
            });
        }
    }

    results.sort((a, b) => b.score - a.score);

    const deduped = [];
    const seen = new Set();
    for (const result of results) {
        const key = `${result.sourceId}:${result.vodId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(result);
        if (deduped.length >= 8) break;
    }
    return deduped;
}

function scorePlayGroup(groupName, groupText, episodes, source) {
    let score = source.priority || 0;
    const sampleUrl = episodes[0] ? episodes[0].videoUrl : "";
    const text = `${groupName} ${groupText} ${sampleUrl}`.toLowerCase();

    if (text.includes(".m3u8")) score += 50;
    if (text.includes(".mp4")) score += 30;
    if (text.includes("share/")) score -= 16;
    if (text.includes("quark") || text.includes("aliyun") || text.includes("115") || text.includes("迅雷")) score -= 30;
    score += episodes.length * 2;
    return score;
}

function normalizeEpisodeLabel(label) {
    return normalizeText(label)
        .replace(/第/g, "")
        .replace(/集|话|回|期/g, "")
        .replace(/episode/g, "e")
        .replace(/ep/g, "e");
}

function episodeMatchScore(label, payload) {
    if (payload.mediaType !== "tv" || !payload.episode) return 0;
    const normalized = normalizeEpisodeLabel(label);
    const epNum = String(Number(payload.episode));
    const epPadded = String(payload.episode).padStart(2, "0");
    const seText = seasonEpisodeText(payload.season, payload.episode);

    let score = 0;
    if (seText && normalized.includes(seText)) score += 120;
    if (normalized.includes(`e${epNum}`) || normalized.includes(`e${epPadded}`)) score += 90;
    if (normalized.includes(epNum) || normalized.includes(epPadded)) score += 35;
    return score;
}

function parseEpisodeCandidates(item, source, payload) {
    const playFromList = splitMultiValue(item.vod_play_from, "$$$");
    const playUrlGroups = splitMultiValue(item.vod_play_url, "$$$");
    const candidates = [];

    for (let index = 0; index < playUrlGroups.length; index += 1) {
        const playGroup = playUrlGroups[index];
        const groupName = playFromList[index] || `线路${index + 1}`;
        const parts = splitMultiValue(playGroup, "#");
        const episodes = [];

        for (const part of parts) {
            const splitIndex = part.indexOf("$");
            if (splitIndex <= 0) continue;
            const episodeTitle = safeText(part.slice(0, splitIndex));
            const videoUrl = safeText(part.slice(splitIndex + 1));
            if (!videoUrl) continue;
            episodes.push({
                title: episodeTitle || "正片",
                videoUrl: videoUrl
            });
        }

        if (!episodes.length) continue;

        if (payload.mediaType === "movie") {
            const streamScore = scorePlayGroup(groupName, playGroup, episodes, source);
            candidates.push({
                name: `${source.name} · ${groupName}`,
                description: buildStreamDescription(source, item, episodes.length, groupName),
                url: episodes[0].videoUrl,
                score: streamScore
            });
            continue;
        }

        for (const episode of episodes) {
            const matchScore = episodeMatchScore(episode.title, payload);
            if (matchScore <= 0) continue;

            const totalScore = scorePlayGroup(groupName, playGroup, [episode], source) + matchScore;
            candidates.push({
                name: `${source.name} · ${episode.title}`,
                description: buildStreamDescription(source, item, episodes.length, groupName),
                url: episode.videoUrl,
                score: totalScore
            });
        }
    }

    candidates.sort((a, b) => b.score - a.score);
    return candidates;
}

function buildStreamDescription(source, item, totalEpisodes, groupName) {
    const bits = [];
    bits.push(source.name);
    if (safeText(item.vod_remarks)) bits.push(safeText(item.vod_remarks));
    if (safeText(groupName)) bits.push(groupName);
    if (totalEpisodes > 1) bits.push(`共${totalEpisodes}集`);
    return bits.join(" | ");
}

async function fetchStreamsByCandidate(candidate, payload) {
    const source = SOURCE_MAP[candidate.sourceId];
    if (!source) return [];

    try {
        const data = await requestCms(source, { ac: "detail", ids: candidate.vodId }, 7000);
        const item = Array.isArray(data.list) ? data.list[0] : null;
        if (!item) return [];
        return parseEpisodeCandidates(item, source, payload);
    } catch (error) {
        return [];
    }
}

async function loadResource(params) {
    const payload = buildStreamPayload(params);
    if (!payload.title) return [];

    const candidates = await searchCandidates(payload);
    const streamGroups = await Promise.all(candidates.slice(0, 6).map(candidate => fetchStreamsByCandidate(candidate, payload)));
    const streams = streamGroups.flat().sort((a, b) => b.score - a.score);

    const deduped = [];
    const seen = new Set();
    for (const stream of streams) {
        if (!stream.url || seen.has(stream.url)) continue;
        seen.add(stream.url);
        deduped.push({
            name: stream.name,
            description: stream.description,
            url: stream.url
        });
        if (deduped.length >= 12) break;
    }

    return deduped;
}

async function loadDetail(link) {
    const payload = parseLinkPayload(link);
    if (!payload) throw new Error("详情参数无效");

    const source = SOURCE_MAP[payload.sourceId];
    if (!source) throw new Error("源配置不存在");

    const data = await requestCms(source, { ac: "detail", ids: payload.vodId }, 7000);
    const item = Array.isArray(data.list) ? data.list[0] : null;
    if (!item) throw new Error("详情不存在");

    const playFromList = splitMultiValue(item.vod_play_from, "$$$");
    const playUrlGroups = splitMultiValue(item.vod_play_url, "$$$");
    const episodeItems = [];

    for (let index = 0; index < playUrlGroups.length; index += 1) {
        const playGroup = playUrlGroups[index];
        const groupName = playFromList[index] || `线路${index + 1}`;
        const parts = splitMultiValue(playGroup, "#");
        for (const part of parts) {
            const splitIndex = part.indexOf("$");
            if (splitIndex <= 0) continue;
            const episodeTitle = safeText(part.slice(0, splitIndex));
            const videoUrl = safeText(part.slice(splitIndex + 1));
            if (!videoUrl) continue;
            episodeItems.push({
                id: `${source.id}:${videoUrl}`,
                type: "url",
                title: `${episodeTitle || "正片"} · ${groupName}`,
                videoUrl: videoUrl
            });
        }
    }

    return [{
        id: link,
        type: "link",
        title: safeText(item.vod_name),
        description: stripHtml(item.vod_content),
        coverUrl: safeText(item.vod_pic),
        genreTitle: `${safeText(item.vod_year)} • ${safeText(item.vod_class || item.vod_area || "VOD")}`,
        episodeItems: episodeItems
    }];
}
