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

function assertAllNamesInclude(streams, pattern, label) {
    assert(streams.length > 0, `${label}: expected streams`);
    const failed = streams.filter(stream => !pattern.test(stream.name));
    assert(!failed.length, `${label}: unexpected stream names:\n${failed.map(stream => `${stream.name} | ${stream.description}`).join("\n")}`);
}

function assertNoNamesInclude(streams, pattern, label) {
    const failed = streams.filter(stream => pattern.test(stream.name));
    assert(!failed.length, `${label}: forbidden stream names:\n${failed.map(stream => `${stream.name} | ${stream.description}`).join("\n")}`);
}

function assertIdentity(text, expected, label) {
    const identity = context.buildEpisodeIdentity(text, { year: "2026", releaseDate: "2026-06-12" });
    for (const [key, value] of Object.entries(expected)) {
        if (key === "dateCode") {
            assert(identity.dateCodes.includes(value), `${label}: expected date ${value}, got ${identity.dateCodes.join(",")}`);
            continue;
        }
        assert(identity[key] === value, `${label}: expected ${key}=${value}, got ${identity[key]}`);
    }
}

const OFFICIAL_STYLE_CASES = [
    ["iqiyi normal part", "06-12 第9期: 下", { dateCode: "20260612", issueNumber: 9, part: "down", kind: "normal" }],
    ["iqiyi special plus", "20260517特别加更上", { dateCode: "20260517", part: "up", kind: "plus" }],
    ["tencent plus", "第1期 万事屋加更", { issueNumber: 1, kind: "plus" }],
    ["tencent unlock", "副本解锁中第1期", { issueNumber: 1, part: "mid", kind: "behind" }],
    ["youku pure", "第3期纯享版：舞台完整版", { issueNumber: 3, kind: "pure" }],
    ["youku date part", "06-12 第3期: 下", { dateCode: "20260612", issueNumber: 3, part: "down", kind: "normal" }],
    ["mgtv early", "超前营业第5期", { issueNumber: 5, kind: "early" }],
    ["mgtv special", "端午特辑", { kind: "special" }],
    ["bilibili part", "第2期（上）", { issueNumber: 2, part: "up", kind: "normal" }],
    ["bilibili plus", "第1期加更", { issueNumber: 1, kind: "plus" }],
    ["vod pilot", "先导片上：显眼包", { part: "up", kind: "special" }],
    ["vod live", "空降直播", { kind: "special" }]
];

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
            assertAllInclude(streams, /种地吧\s*第二季|种地吧2/, this.label);
            assertAllInclude(streams, /第0?5[期集]/, this.label);
            assertNoneInclude(streams, /加更|超前|纯享|会员|番外/, this.label);
        }
    },
    {
        label: "variety plus episode",
        params: { type: "tv", title: "种地吧", seriesName: "种地吧", season: 2, episode: 5, episodeName: "加更版第5期" },
        validate(streams) {
            assert(streams.length > 0, `${this.label}: expected plus streams`);
            assertAllInclude(streams, /种地吧\s*第二季|种地吧2/, this.label);
            assertAllInclude(streams, /加更.*第0?5期|第0?5期.*加更/, this.label);
            assertNoneInclude(streams, /加更.*第(?!0?5期)\d+期/, this.label);
        }
    },
    {
        label: "domestic variety date and part",
        params: { type: "tv", title: "种地吧", seriesName: "种地吧", season: 4, episodeName: "第9期上", airDate: "2026-06-11" },
        validate(streams) {
            assert(streams.length > 0, `${this.label}: expected streams`);
            assertAllInclude(streams, /20260611|第0?9期.*上|上.*第0?9期/, this.label);
            assertNoneInclude(streams.map(stream => ({ name: stream.name, description: "" })), /加更|纯享|花絮|预告|解说|短视频/, this.label);
        }
    },
    {
        label: "domestic variety special season plus",
        params: { type: "tv", title: "种地吧", seriesName: "种地吧", season: 0, episodeName: "特别加更上", airDate: "2026-05-17" },
        validate(streams) {
            assert(streams.length > 0, `${this.label}: expected streams`);
            assertAllInclude(streams, /20260517|特别加更|加更/, this.label);
            assertNoneInclude(streams, /第0?1期上|第0?2期上|纯享|预告|解说/, this.label);
        }
    },
    {
        label: "domestic variety pure episode",
        params: { type: "tv", title: "歌手2024", seriesName: "歌手2024", episodeName: "纯享版第5期" },
        validate(streams) {
            assert(streams.length > 0, `${this.label}: expected streams`);
            assertAllInclude(streams, /纯享.*第0?5期|第0?5期.*纯享/, this.label);
            assertNoneInclude(streams, /超前|加更|花絮|预告|解说/, this.label);
        }
    },
    {
        label: "variety pilot title beats episode number",
        params: { type: "tv", title: "现在就出发", seriesName: "现在就出发", season: 3, episode: 1, episodeName: "先导片上：显眼包" },
        validate(streams) {
            assert(streams.length > 0, `${this.label}: expected streams`);
            assertAllNamesInclude(streams.slice(0, 8), /先导片上|20251018.*先导片/, this.label);
            assertNoNamesInclude(streams.slice(0, 8), /第0?1期上|第0?1期下|第0?2期|加更|纯享/, this.label);
        }
    },
    {
        label: "variety pilot down beats episode number",
        params: { type: "tv", title: "现在就出发", seriesName: "现在就出发", season: 3, episode: 2, episodeName: "先导片下：显眼包" },
        validate(streams) {
            assert(streams.length > 0, `${this.label}: expected streams`);
            assertAllNamesInclude(streams.slice(0, 8), /先导片下|20251019.*先导片/, this.label);
            assertNoNamesInclude(streams.slice(0, 8), /第0?2期|第0?1期上|加更|纯享/, this.label);
        }
    },
    {
        label: "variety issue part up",
        params: { type: "tv", title: "五十公里桃花坞", seriesName: "五十公里桃花坞", season: 6, episode: 1, episodeName: "第1期上：入住桃花坞", duration: 120 },
        validate(streams) {
            assert(streams.length > 0, `${this.label}: expected streams`);
            assertAllNamesInclude(streams.slice(0, 8), /第0?1期.*上|20260514.*上/, this.label);
            assertNoNamesInclude(streams.slice(0, 8), /第0?2期|第0?1期.*中|第0?1期.*下|加更|纯享/, this.label);
        }
    },
    {
        label: "variety issue part mid beats episode number",
        params: { type: "tv", title: "五十公里桃花坞", seriesName: "五十公里桃花坞", season: 6, episode: 2, episodeName: "第1期中：入住桃花坞", duration: 120 },
        validate(streams) {
            assert(streams.length > 0, `${this.label}: expected streams`);
            assertAllNamesInclude(streams.slice(0, 8), /第0?1期.*中|20260514.*中/, this.label);
            assertNoNamesInclude(streams.slice(0, 8), /第0?2期|第0?1期.*上|第0?1期.*下|加更|纯享/, this.label);
        }
    },
    {
        label: "variety issue part down beats episode number",
        params: { type: "tv", title: "五十公里桃花坞", seriesName: "五十公里桃花坞", season: 6, episode: 3, episodeName: "第1期下：入住桃花坞", duration: 120 },
        validate(streams) {
            assert(streams.length > 0, `${this.label}: expected streams`);
            assertAllNamesInclude(streams.slice(0, 8), /第0?1期.*下|20260515.*下/, this.label);
            assertNoNamesInclude(streams.slice(0, 8), /第0?3期|第0?2期|第0?1期.*上|第0?1期.*中|加更|纯享/, this.label);
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
    },
    {
        label: "anime alias variant",
        params: { type: "tv", title: "尖帽子的魔法工房", seriesName: "尖帽子的魔法工房", season: 1, episode: 1, episodeName: "第1集" },
        validate(streams) {
            assertAllInclude(streams.slice(0, 8), /尖帽子的魔法工坊/, this.label);
            assertAllInclude(streams.slice(0, 8), /第0?1集/, this.label);
        }
    },
    {
        label: "anime english alias",
        params: { type: "tv", title: "Witch Hat Atelier", seriesName: "Witch Hat Atelier", season: 1, episode: 1, episodeName: "Episode 1", originalTitle: "とんがり帽子のアトリエ" },
        validate(streams) {
            assertAllInclude(streams.slice(0, 8), /尖帽子的魔法工坊/, this.label);
            assertAllInclude(streams.slice(0, 8), /第0?1集/, this.label);
        }
    },
    {
        label: "long anime one piece global episode",
        params: { type: "tv", title: "航海王", seriesName: "航海王", season: 21, episode: 1000, episodeName: "第1000集" },
        validate(streams) {
            assertAllInclude(streams.slice(0, 8), /海贼王/, this.label);
            assertAllInclude(streams.slice(0, 8), /第0*1000集/, this.label);
            assertNoneInclude(streams.slice(0, 8), /鱼人岛|特别编辑版|红发歌姬|海贼王女|剧场版|解说|预告/, this.label);
        }
    },
    {
        label: "long anime conan global episode",
        params: { type: "tv", title: "名侦探柯南", seriesName: "名侦探柯南", season: 15, episode: 500, episodeName: "第500集" },
        validate(streams) {
            assertAllInclude(streams.slice(0, 8), /名侦探柯南/, this.label);
            assertAllInclude(streams.slice(0, 8), /第0*500集/, this.label);
        }
    },
    {
        label: "long anime naruto excludes boruto",
        params: { type: "tv", title: "火影忍者", seriesName: "火影忍者", season: 1, episode: 220, episodeName: "第220集" },
        validate(streams) {
            assertAllInclude(streams.slice(0, 8), /火影忍者/, this.label);
            assertAllInclude(streams.slice(0, 8), /第0*220集/, this.label);
            assertNoneInclude(streams.slice(0, 8), /博人传|次世代|新时代/, this.label);
        }
    },
    {
        label: "long anime boruto global episode",
        params: { type: "tv", title: "博人传：火影忍者新时代", seriesName: "博人传：火影忍者新时代", season: 1, episode: 293, episodeName: "第293集" },
        validate(streams) {
            assertAllInclude(streams.slice(0, 8), /博人传|次世代|新时代/, this.label);
            assertAllInclude(streams.slice(0, 8), /第0*293集/, this.label);
        }
    },
    {
        label: "anime special season ova",
        params: { type: "tv", title: "异兽魔都", seriesName: "异兽魔都", season: 0, episode: 1, episodeName: "第1集", originalTitle: "Dorohedoro" },
        validate(streams) {
            assert(streams.length > 0, `${this.label}: expected OVA streams`);
            assertAllInclude(streams, /OVA|OAD|SP|特别篇|番外|外传|特典/, this.label);
            assertNoneInclude(streams, /异兽魔都第二季|第12集完结/, this.label);
        }
    },
    {
        label: "anime normal season excludes ova",
        params: { type: "tv", title: "异兽魔都", seriesName: "异兽魔都", season: 1, episode: 1, episodeName: "第1集" },
        validate(streams) {
            assertAllInclude(streams.slice(0, 8), /异兽魔都/, this.label);
            assertNoneInclude(streams.slice(0, 8), /OVA|OAD|SP|特别篇|番外|外传|异兽魔都第二季/, this.label);
        }
    }
];

(async () => {
    for (const [label, text, expected] of OFFICIAL_STYLE_CASES) {
        assertIdentity(text, expected, label);
        console.log(`PASS official style ${label}`);
    }

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
