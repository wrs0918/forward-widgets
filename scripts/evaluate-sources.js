#!/usr/bin/env node

const DEFAULT_SOURCES = [
    ["dyttzy", "电影天堂资源", "http://caiji.dyttzyapi.com/api.php/provide/vod"],
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
    ["zy360", "360资源", "https://360zy.com/api.php/provide/vod"],
    ["mdzy", "魔都资源", "https://www.mdzyapi.com/api.php/provide/vod"],
    ["huya", "虎牙资源", "https://www.huyaapi.com/api.php/provide/vod"]
];

// 外部候选源只用于准入评估，不会因为出现在这里就进入 VodMax 默认源池。
const CANDIDATE_SOURCES = [
    ["heimuer", "黑木耳", "https://json.heimuer.xyz/api.php/provide/vod"],
    ["huawei", "华为吧", "https://hw8.live/api.php/provide/vod/"],
    ["tiankong", "天空资源", "https://api.tiankongapi.com/api.php/provide/vod/"],
    ["feisu", "飞速资源", "https://www.feisuzyapi.com/api.php/provide/vod/"],
    ["guangsu", "光速资源", "https://api.guangsuapi.com/api.php/provide/vod/"],
    ["bdzy", "百度云资源", "https://api.apibdzy.com/api.php/provide/vod/"],
    ["ckzy", "ck资源", "https://ckzy.me/api.php/provide/vod/"],
    ["kczy", "快播资源", "https://caiji.kczyapi.com/api.php/provide/vod/"],
    ["uku", "U酷资源", "https://api.ukuapi.com/api.php/provide/vod/"],
    ["tyyszy", "天涯资源", "https://tyyszy.com/api.php/provide/vod"],
    ["maotaizy", "茅台资源", "https://caiji.maotaizy.cc/api.php/provide/vod"],
    ["mozhua", "魔爪资源", "https://mozhuazy.com/api.php/provide/vod"],
    ["xiaomaomi", "小猫咪资源", "https://zy.xmm.hk/api.php/provide/vod"],
    ["wolong", "卧龙资源", "https://wolongzyw.com/api.php/provide/vod"],
    ["wolong2", "卧龙资源新", "https://collect.wolongzy.cc/api.php/provide/vod/"],
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
    ["anime", "咒术回战第二季"],
    ["anime", "尖帽子的魔法工坊"],
    ["long-anime", "海贼王"],
    ["long-anime", "名侦探柯南"],
    ["special-anime", "异兽魔都OVA"]
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
    let hdHints = 0;
    let adRisk = 0;
    for (const item of sample) {
        const text = `${item.vod_name || ""} ${item.vod_remarks || ""} ${item.vod_class || ""}`;
        const playText = `${item.vod_play_url || ""}`;
        if (/\.m3u8|\.mp4|https?:\/\//i.test(playText)) playableHints += 1;
        if (/预告|解说|花絮|片花|特辑|reaction|制作/.test(text)) auxiliary += 1;
        if (/1080p|1080|2160p|4k|HD|蓝光|高码|FHD/i.test(`${text} ${playText}`)) hdHints += 1;
        if (/TC|HDTC|CAM|枪版|抢先|网盘|夸克|阿里云|迅雷|百度云|115|share\//i.test(`${text} ${playText}`)) adRisk += 1;
    }
    return { playableHints, auxiliary, hdHints, adRisk, first: sample[0] ? sample[0].vod_name || "" : "" };
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
            auxiliary: inspected.auxiliary,
            hdHints: inspected.hdHints,
            adRisk: inspected.adRisk
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
        hdHints: hitRows.reduce((sum, row) => sum + row.hdHints, 0),
        adRisk: hitRows.reduce((sum, row) => sum + row.adRisk, 0),
        hits: hitRows.slice(0, 5).map(row => `${row.type}:${row.first}`)
    };
}

async function main() {
    const includeCandidates = process.argv.includes("--candidates");
    const sources = includeCandidates ? DEFAULT_SOURCES.concat(CANDIDATE_SOURCES) : DEFAULT_SOURCES;
    const rows = await Promise.all(sources.map(evaluateSource));
    rows.sort((a, b) => b.okCases - a.okCases || b.playableHints - a.playableHints || b.hdHints - a.hdHints || a.adRisk - b.adRisk || a.errors - b.errors || a.avgMs - b.avgMs);
    console.log(`# source-set: ${includeCandidates ? "default+candidates" : "default"}; use --candidates to include external probes`);
    console.log(`name\tok/${SOURCE_EVALUATION_CASES.length}\tplayHint\thdHint\tadRisk\terrors\tavgMs\titems\taux\thits`);
    for (const row of rows) {
        console.log(`${row.name}\t${row.okCases}/${SOURCE_EVALUATION_CASES.length}\t${row.playableHints}\t${row.hdHints}\t${row.adRisk}\t${row.errors}\t${row.avgMs}\t${row.totalItems}\t${row.auxiliary}\t${row.hits.join(" | ")}`);
    }
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
