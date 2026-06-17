#!/usr/bin/env node

const fs = require("fs");
const vm = require("vm");

const code = fs.readFileSync("widgets/normal/VodMax.js", "utf8");

const context = {
    console,
    Widget: {
        http: {
            async get(baseUrl, options = {}) {
                const url = new URL(baseUrl);
                for (const [key, value] of Object.entries(options.params || {})) {
                    url.searchParams.set(key, value);
                }
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), options.timeout || 5000);
                try {
                    const response = await fetch(url, {
                        signal: controller.signal,
                        headers: options.headers || {}
                    });
                    return { data: await response.text() };
                } finally {
                    clearTimeout(timer);
                }
            }
        }
    }
};

vm.createContext(context);
vm.runInContext(code, context);

const SOURCES = [
    ["非凡资源", "http://ffzy5.tv/api.php/provide/vod"],
    ["如意资源", "https://cj.rycjapi.com/api.php/provide/vod"],
    ["极速资源", "https://jszyapi.com/api.php/provide/vod"],
    ["iKun资源", "https://ikunzyapi.com/api.php/provide/vod"],
    ["乐子资源", "https://cj.lziapi.com/api.php/provide/vod"],
    ["暴风资源", "https://bfzyapi.com/api.php/provide/vod"]
];

const PLATFORM_SAMPLES = [
    ["爱奇艺", "种地吧4", "06-12 第9期: 下", "2026-06-12"],
    ["爱奇艺", "种地吧4", "20260517特别加更上", "2026-05-17"],
    ["爱奇艺", "五十公里桃花坞6", "20260514中", "2026-05-14"],
    ["爱奇艺", "五十公里桃花坞6", "20260518超越目标坞民上", "2026-05-18"],
    ["腾讯视频", "开始推理吧第四季", "第1期 万事屋加更", ""],
    ["腾讯视频", "开始推理吧第四季", "副本解锁中第1期", ""],
    ["优酷", "有歌2026", "06-12 第3期: 下", "2026-06-12"],
    ["优酷", "综艺样式", "外传第2期 游戏特辑", ""],
    ["芒果TV", "歌手2024", "超前营业第5期", ""],
    ["芒果TV", "歌手2024", "纯享版第5期", ""],
    ["芒果TV", "歌手2024", "端午特辑", ""],
    ["B站", "综艺样式", "第2期（上）", ""],
    ["B站", "综艺样式", "第1期加更", ""],
    ["VOD", "现在就出发第三季", "先导片上：显眼包", ""],
    ["VOD", "现在就出发第三季", "空降直播", ""],
    ["VOD", "现在就出发第三季", "还有加更", ""]
];

const VOD_CASES = [
    {
        label: "TMDB-like: 种地吧 S4 第9期上",
        keyword: "种地吧4",
        payload: { type: "tv", title: "种地吧", seriesName: "种地吧", season: 4, episodeName: "第9期上", airDate: "2026-06-11" }
    },
    {
        label: "TMDB-like: 种地吧 special 特别加更上",
        keyword: "种地吧4",
        payload: { type: "tv", title: "种地吧", seriesName: "种地吧", season: 0, episodeName: "特别加更上", airDate: "2026-05-17" }
    },
    {
        label: "TMDB-like: 开始推理吧 S4 日期期",
        keyword: "开始推理吧第四季",
        payload: { type: "tv", title: "开始推理吧", seriesName: "开始推理吧", season: 4, episodeName: "第20260614期", airDate: "2026-06-14" }
    },
    {
        label: "TMDB-like: 歌手2024 纯享第5期",
        keyword: "歌手2024",
        payload: { type: "tv", title: "歌手2024", seriesName: "歌手2024", episodeName: "纯享版第5期" }
    },
    {
        label: "TMDB-like: 现在就出发 S3 先导片上",
        keyword: "现在就出发第三季",
        payload: { type: "tv", title: "现在就出发", seriesName: "现在就出发", season: 3, episode: 1, episodeName: "先导片上：显眼包" }
    },
    {
        label: "TMDB-like: 现在就出发 S3 先导片下",
        keyword: "现在就出发第三季",
        payload: { type: "tv", title: "现在就出发", seriesName: "现在就出发", season: 3, episode: 2, episodeName: "先导片下：显眼包" }
    },
    {
        label: "TMDB-like: 桃花坞 S6 第1期中",
        keyword: "五十公里桃花坞6",
        payload: { type: "tv", title: "五十公里桃花坞", seriesName: "五十公里桃花坞", season: 6, episode: 2, episodeName: "第1期中：入住桃花坞", duration: 120 }
    }
];

function styleName(identity) {
    if (identity.dateCodes.length && identity.part) return "date-part";
    if (identity.kind !== "normal" && identity.issueNumber) return `${identity.kind}-issue`;
    if (identity.kind !== "normal") return identity.kind;
    if (identity.issueNumber && identity.part) return "issue-part";
    if (identity.issueNumber) return "issue";
    if (identity.part) return "part-only";
    return "plain";
}

function identitySummary(text, payload, presetIdentity) {
    const identity = presetIdentity || context.buildEpisodeIdentity(text, payload || {});
    return [
        `date=${identity.dateCodes.join("/") || "-"}`,
        `issue=${identity.issueNumber || "-"}`,
        `part=${identity.part || "-"}`,
        `kind=${identity.kind}`,
        `style=${styleName(identity)}`,
        `fallback=${identity.usedEpisodeFallback ? "yes" : "no"}`,
        `duration=${context.parseDurationMinutes(payload && (payload.duration || payload.runtime || payload.episodeDuration)) || "-"}`
    ].join(" ");
}

async function fetchJson(baseUrl, keyword) {
    const response = await context.Widget.http.get(baseUrl, {
        params: { ac: "detail", wd: keyword, out: "json" },
        headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json,*/*" },
        timeout: 4200
    });
    return JSON.parse(response.data);
}

function parseEpisodeLabels(playUrl) {
    return String(playUrl || "")
        .split("$$$")[0]
        .split("#")
        .map(part => part.split("$")[0].trim())
        .filter(Boolean)
        .slice(0, 18);
}

async function printVodCase(testCase) {
    const payload = context.buildStreamPayload(testCase.payload);
    console.log(`\n## ${testCase.label}`);
    console.log(`requested\t${testCase.payload.episodeName || "-"}\t${identitySummary([testCase.payload.episodeName, testCase.payload.airDate].join(" "), payload, payload.episodeIdentity)}`);

    for (const [sourceName, baseUrl] of SOURCES) {
        try {
            const data = await fetchJson(baseUrl, testCase.keyword);
            const item = Array.isArray(data.list) ? data.list[0] : null;
            if (!item) {
                console.log(`${sourceName}\t(no hit)`);
                continue;
            }
            const labels = parseEpisodeLabels(item.vod_play_url);
            const summary = labels
                .slice(0, 8)
                .map(label => `${label} [${identitySummary(label, payload)}]`)
                .join(" | ");
            console.log(`${sourceName}\t${item.vod_name || ""}\t${summary}`);
        } catch (error) {
            console.log(`${sourceName}\t(error: ${error.name || error.message})`);
        }
    }
}

(async () => {
    console.log("# 官方平台命名样式");
    for (const [platform, program, label, airDate] of PLATFORM_SAMPLES) {
        const payload = { year: airDate.slice(0, 4) || "2026", releaseDate: airDate };
        console.log(`${platform}\t${program}\t${label}\t${identitySummary(label, payload)}`);
    }

    console.log("\n# VOD 源播放列表对照");
    for (const testCase of VOD_CASES) {
        await printVodCase(testCase);
    }
})().catch(error => {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
});
