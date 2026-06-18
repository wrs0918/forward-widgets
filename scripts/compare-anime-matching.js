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
            },
            async post(baseUrl, options = {}) {
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), options.timeout || 5000);
                try {
                    const response = await fetch(baseUrl, {
                        method: "POST",
                        signal: controller.signal,
                        headers: options.headers || {},
                        body: JSON.stringify(options.data || {})
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

const CASES = [
    ["新番译名", { type: "tv", title: "尖帽子的魔法工房", seriesName: "尖帽子的魔法工房", season: 1, episode: 1, episodeName: "第1集" }],
    ["英文别名", { type: "tv", title: "Witch Hat Atelier", seriesName: "Witch Hat Atelier", season: 1, episode: 1, episodeName: "Episode 1", originalTitle: "とんがり帽子のアトリエ" }],
    ["长篇全局集数", { type: "tv", title: "航海王", seriesName: "航海王", season: 21, episode: 1000, episodeName: "第1000集" }],
    ["长篇柯南", { type: "tv", title: "名侦探柯南", seriesName: "名侦探柯南", season: 15, episode: 500, episodeName: "第500集" }],
    ["长篇火影", { type: "tv", title: "火影忍者", seriesName: "火影忍者", season: 1, episode: 220, episodeName: "第220集" }],
    ["长篇博人传", { type: "tv", title: "博人传：火影忍者新时代", seriesName: "博人传：火影忍者新时代", season: 1, episode: 293, episodeName: "第293集" }],
    ["第0季OVA", { type: "tv", title: "异兽魔都", seriesName: "异兽魔都", season: 0, episode: 1, episodeName: "第1集", originalTitle: "Dorohedoro" }],
    ["篇章季桥接", { type: "tv", title: "死神", seriesName: "死神", season: 2, episode: 1, episodeName: "血战" }],
    ["全局转本季", { type: "tv", title: "租借女友", seriesName: "租借女友", season: 1, episode: 31, episodeName: "和也与女友" }],
    ["第0季快空", { type: "tv", title: "海贼王", seriesName: "海贼王", season: 0, episode: 1, episodeName: "紧急企画！海贼王完全攻略法" }]
];

function modeSummary(payload) {
    return [
        `anime=${payload.isAnime ? "yes" : "no"}`,
        `long=${payload.longAnime ? "yes" : "no"}`,
        `special=${payload.animeSpecialSeason ? "yes" : "no"}`,
        `season=${payload.season || "-"}`,
        `episode=${payload.episode || "-"}`
    ].join(" ");
}

(async () => {
    for (const [label, params] of CASES) {
        const payload = context.buildStreamPayload(params);
        const startedAt = Date.now();
        const streams = await context.loadResource(params);
        console.log(`\n## ${label}`);
        console.log(`mode\t${modeSummary(payload)}`);
        console.log(`keywords\t${context.buildSearchKeywords(payload).slice(0, 12).join(" | ")}`);
        console.log(`trace\t${Object.keys(context.__VodMaxLastDebug || {}).sort().join(" | ") || "-"}`);
        console.log(`streams\t${streams.length}\t${Date.now() - startedAt}ms`);
        for (const stream of streams.slice(0, 8)) {
            console.log(`${stream.name}\t${stream.description}`);
        }
    }
})().catch(error => {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
});
