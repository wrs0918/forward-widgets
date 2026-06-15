#!/usr/bin/env node

const SOURCES = [
    ["feifan", "非凡资源", "http://ffzy5.tv/api.php/provide/vod"],
    ["ruyi", "如意资源", "https://cj.rycjapi.com/api.php/provide/vod"],
    ["jisu", "极速资源", "https://jszyapi.com/api.php/provide/vod"],
    ["ikun", "iKun资源", "https://ikunzyapi.com/api.php/provide/vod"],
    ["hongniu", "红牛资源", "https://www.hongniuzy2.com/api.php/provide/vod"],
    ["lezi", "乐子资源", "https://cj.lziapi.com/api.php/provide/vod"],
    ["haihua", "海豚资源", "https://hhzyapi.com/api.php/provide/vod"],
    ["baofeng", "暴风资源", "https://bfzyapi.com/api.php/provide/vod"],
    ["zuida", "最大资源", "https://api.zuidapi.com/api.php/provide/vod"],
    ["piaoling", "飘零资源", "https://p2100.net/api.php/provide/vod"],
    ["feifanapi", "非凡API", "https://api.ffzyapi.com/api.php/provide/vod"],
    ["wujin", "无尽资源", "https://api.wujinapi.com/api.php/provide/vod"],
    ["wolong", "卧龙资源", "https://wolongzyw.com/api.php/provide/vod"],
    ["yinghua", "樱花资源", "https://m3u8.apiyhzy.com/api.php/provide/vod"],
    ["suoni", "索尼资源", "https://suoniapi.com/api.php/provide/vod"],
    ["shandian", "闪电资源", "https://sdzyapi.com/api.php/provide/vod"],
    ["fox", "FOX资源", "https://api.foxzyapi.com/api.php/provide/vod"],
    ["sszy", "神速资源", "https://api.sszyapi.com/api.php/provide/vod"],
    ["xiangkan", "想看资源", "https://m3u8.xiangkanapi.com/api.php/provide/vod"]
];

// These are source-quality smoke samples only. Forward runtime matching stays dynamic in widgets/normal/VodMax.js.
const SOURCE_EVALUATION_CASES = [
    ["movie", "阿凡达：火与烬"],
    ["variety", "开始推理吧第四季"],
    ["variety", "种地吧第二季"],
    ["hk", "新闻女王2"],
    ["us", "最后生还者第二季"],
    ["uk", "神探夏洛克第二季"],
    ["kr", "苦尽柑来遇见你"],
    ["anime", "咒术回战第二季"]
];

function timeoutSignal(ms) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    return { controller, timer };
}

async function fetchJson(baseUrl, keyword, timeoutMs) {
    const { controller, timer } = timeoutSignal(timeoutMs);
    const startedAt = Date.now();
    try {
        const url = new URL(baseUrl);
        url.searchParams.set("ac", "detail");
        url.searchParams.set("wd", keyword);
        url.searchParams.set("out", "json");
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
                "Accept": "application/json, text/javascript, */*; q=0.01"
            }
        });
        const text = await response.text();
        return { ok: true, ms: Date.now() - startedAt, data: JSON.parse(text) };
    } catch (error) {
        return { ok: false, ms: Date.now() - startedAt, error: error.name || error.message };
    } finally {
        clearTimeout(timer);
    }
}

function inspectList(list) {
    const sample = Array.isArray(list) ? list.slice(0, 5) : [];
    let playableHints = 0;
    let auxiliary = 0;
    for (const item of sample) {
        const text = `${item.vod_name || ""} ${item.vod_remarks || ""} ${item.vod_class || ""}`;
        const playText = `${item.vod_play_url || ""}`;
        if (/\.m3u8|\.mp4|https?:\/\//i.test(playText)) playableHints += 1;
        if (/预告|解说|花絮|片花|特辑|reaction|制作/.test(text)) auxiliary += 1;
    }
    return { playableHints, auxiliary, first: sample[0] ? sample[0].vod_name || "" : "" };
}

async function evaluateSource(source) {
    const [id, name, baseUrl] = source;
    const results = await Promise.all(SOURCE_EVALUATION_CASES.map(async ([type, keyword]) => {
        const result = await fetchJson(baseUrl, keyword, 4200);
        if (!result.ok) return { type, keyword, ok: false, ms: result.ms, error: result.error };
        const list = Array.isArray(result.data.list) ? result.data.list : [];
        const inspected = inspectList(list);
        return {
            type,
            keyword,
            ok: true,
            ms: result.ms,
            count: list.length,
            first: inspected.first,
            playableHints: inspected.playableHints,
            auxiliary: inspected.auxiliary
        };
    }));

    const hitRows = results.filter(row => row.ok && row.count > 0);
    const totalMs = results.reduce((sum, row) => sum + row.ms, 0);
    return {
        id,
        name,
        okCases: hitRows.length,
        errors: results.filter(row => !row.ok).length,
        avgMs: Math.round(totalMs / results.length),
        totalItems: hitRows.reduce((sum, row) => sum + row.count, 0),
        playableHints: hitRows.reduce((sum, row) => sum + row.playableHints, 0),
        auxiliary: hitRows.reduce((sum, row) => sum + row.auxiliary, 0),
        hits: hitRows.slice(0, 5).map(row => `${row.type}:${row.first}`)
    };
}

async function main() {
    const rows = await Promise.all(SOURCES.map(evaluateSource));
    rows.sort((a, b) => b.okCases - a.okCases || b.playableHints - a.playableHints || a.errors - b.errors || a.avgMs - b.avgMs);
    console.log("name\tok/8\tplayHint\terrors\tavgMs\titems\taux\thits");
    for (const row of rows) {
        console.log(`${row.name}\t${row.okCases}/8\t${row.playableHints}\t${row.errors}\t${row.avgMs}\t${row.totalItems}\t${row.auxiliary}\t${row.hits.join(" | ")}`);
    }
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
