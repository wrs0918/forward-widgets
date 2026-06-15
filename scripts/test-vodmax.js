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

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function combinedText(streams) {
    return streams.map(stream => `${stream.name} ${stream.description}`).join("\n");
}

function assertAllInclude(streams, pattern, label) {
    assert(streams.length > 0, `${label}: expected streams`);
    const failed = streams.filter(stream => !pattern.test(`${stream.name} ${stream.description}`));
    assert(!failed.length, `${label}: unexpected streams:\n${failed.map(stream => `${stream.name} | ${stream.description}`).join("\n")}`);
}

function assertNoneInclude(streams, pattern, label) {
    const failed = streams.filter(stream => pattern.test(`${stream.name} ${stream.description}`));
    assert(!failed.length, `${label}: forbidden streams:\n${failed.map(stream => `${stream.name} | ${stream.description}`).join("\n")}`);
}

const CASES = [
    {
        label: "movie exact title",
        params: { type: "movie", title: "阿凡达：火与烬", premiereDate: "2025-12-19" },
        validate(streams) {
            assertAllInclude(streams.slice(0, 8), /阿凡达：火与烬/, this.label);
            assertNoneInclude(streams.slice(0, 8), /阿凡达(?!：火与烬)/, this.label);
        }
    },
    {
        label: "movie spaced sequel number",
        params: { type: "movie", title: "罗小黑战记 2", premiereDate: "2025-07-18" },
        validate(streams) {
            assertAllInclude(streams.slice(0, 8), /罗小黑战记2/, this.label);
        }
    },
    {
        label: "tv season one does not drift",
        params: { type: "tv", title: "权力的游戏", seriesName: "权力的游戏", season: 1, episode: 1 },
        validate(streams) {
            assertAllInclude(streams.slice(0, 8), /权力的游戏\s*第一季/, this.label);
            assertNoneInclude(streams.slice(0, 8), /第二季|第三季|第四季|第五季|第六季|第七季|第八季|前传|龙族/, this.label);
        }
    },
    {
        label: "tv season two stays season two",
        params: { type: "tv", title: "权力的游戏", seriesName: "权力的游戏", season: 2, episode: 1 },
        validate(streams) {
            assertAllInclude(streams.slice(0, 8), /权力的游戏\s*第二季/, this.label);
            assertNoneInclude(streams.slice(0, 8), /第一季|第三季|第四季|第五季|第六季|第七季|第八季|前传|龙族/, this.label);
        }
    },
    {
        label: "variety date episode",
        params: { type: "tv", title: "开始推理吧", seriesName: "开始推理吧", season: 4, episodeName: "第20260614期", airDate: "2026-06-14" },
        validate(streams) {
            assertAllInclude(streams, /20260614/, this.label);
        }
    },
    {
        label: "variety normal episode",
        params: { type: "tv", title: "种地吧", seriesName: "种地吧", season: 2, episode: 5, episodeName: "第5期" },
        validate(streams) {
            assertAllInclude(streams, /种地吧\s*第二季/, this.label);
            assertAllInclude(streams, /第0?5期/, this.label);
            assertNoneInclude(streams, /加更|超前|纯享|会员|番外/, this.label);
        }
    },
    {
        label: "variety plus episode",
        params: { type: "tv", title: "种地吧", seriesName: "种地吧", season: 2, episode: 5, episodeName: "加更版第5期" },
        validate(streams) {
            if (!streams.length) return;
            assertAllInclude(streams, /种地吧\s*第二季/, this.label);
            assertAllInclude(streams, /加更.*第0?5期|第0?5期.*加更/, this.label);
            assertNoneInclude(streams, /加更.*第(?!0?5期)\d+期/, this.label);
        }
    },
    {
        label: "us drama unaffected",
        params: { type: "tv", title: "最后生还者", seriesName: "最后生还者", season: 2, episode: 2 },
        validate(streams) {
            assertAllInclude(streams.slice(0, 8), /最后生还者\s*第二季/, this.label);
            assertAllInclude(streams.slice(0, 8), /第0?2集/, this.label);
        }
    },
    {
        label: "anime unaffected",
        params: { type: "tv", title: "咒术回战", seriesName: "咒术回战", season: 2, episode: 1 },
        validate(streams) {
            assertAllInclude(streams.slice(0, 8), /咒术回战\s*第二季|咒術迴戰\s*第二季/, this.label);
            assertAllInclude(streams.slice(0, 8), /第0?1集/, this.label);
        }
    }
];

(async () => {
    for (const testCase of CASES) {
        const startedAt = Date.now();
        const streams = await context.loadResource(testCase.params);
        testCase.validate(streams);
        console.log(`PASS ${testCase.label}: ${streams.length} streams in ${Date.now() - startedAt}ms`);
        console.log(combinedText(streams.slice(0, 2)));
    }
})().catch(error => {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
});
