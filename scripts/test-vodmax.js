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
        },
        tmdb: {
            async get(path, options = {}) {
                assert(options && options.params && options.params.language, `tmdb mock: missing language params for ${path}`);
                const fixtures = {
                    "tv/231620/season/3/episode/1": { name: "先导片上：显眼包", air_date: "2025-10-18" },
                    "tv/231620/season/3/episode/4": { name: "第1期下：乱套了！沈腾范丞丞互掐人中", air_date: "2025-10-26" },
                    "tv/231620/season/3/episode/5": { name: "第1 期加更：出发家族加更", air_date: "2025-10-27" },
                    "tv/231620/season/3/episode/6": { name: "第一期还有加更：出发家族还有加更", air_date: "2025-10-28" },
                    "tv/233365/season/6/episode/2": { name: "第1期中：入住桃花坞", air_date: "2026-05-14" }
                };
                return fixtures[path] || {};
            }
        }
    }
};

const contextWithoutTmdbEpisodeNames = {
    console,
    Widget: {
        http: context.Widget.http,
        tmdb: { async get() { return {}; } }
    }
};

vm.createContext(context);
vm.runInContext(code, context);
vm.createContext(contextWithoutTmdbEpisodeNames);
vm.runInContext(code, contextWithoutTmdbEpisodeNames);

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
    ["vod date issue up", "第20260514期上", { dateCode: "20260514", part: "up", kind: "normal" }],
    ["vod date issue down", "第20260514期下", { dateCode: "20260514", part: "down", kind: "normal" }],
    ["vod date numbered issue up", "20260514第1期上", { dateCode: "20260514", issueNumber: 1, part: "up", kind: "normal" }],
    ["tencent plus", "第1期 万事屋加更", { issueNumber: 1, kind: "plus" }],
    ["tencent early up", "超前集结上：全员集合", { part: "up", kind: "early" }],
    ["tencent early egg", "超前彩蛋：爆笑名场面", { kind: "behind" }],
    ["tencent unlock", "副本解锁中第1期", { issueNumber: 1, part: "mid", kind: "behind" }],
    ["youku pure", "第3期纯享版：舞台完整版", { issueNumber: 3, kind: "pure" }],
    ["youku date part", "06-12 第3期: 下", { dateCode: "20260612", issueNumber: 3, part: "down", kind: "normal" }],
    ["mgtv early", "超前营业第5期", { issueNumber: 5, kind: "early" }],
    ["mgtv app member", "APP专享会员版第2期", { issueNumber: 2, kind: "member" }],
    ["mgtv stage pure", "舞台纯享版第6期", { issueNumber: 6, kind: "pure" }],
    ["mgtv fancam", "直拍第3期：舞台直拍", { issueNumber: 3, kind: "behind" }],
    ["mgtv special", "端午特辑", { kind: "special" }],
    ["bilibili part", "第2期（上）", { issueNumber: 2, part: "up", kind: "normal" }],
    ["bilibili plus", "第1期加更", { issueNumber: 1, kind: "plus" }],
    ["vod spaced plus", "第1 期加更：出发家族加更", { issueNumber: 1, kind: "plus" }],
    ["vod chinese more plus", "第一期还有加更：出发家族还有加更", { issueNumber: 1, kind: "plus" }],
    ["vod pilot", "先导片上：显眼包", { part: "up", kind: "special" }],
    ["vod story text does not become mid", "第1期下：乱套了！沈腾范丞丞互掐人中", { issueNumber: 1, part: "down", kind: "normal" }],
    ["vod story text does not become plus", "第1期下：还有加更难度", { issueNumber: 1, part: "down", kind: "normal" }],
    ["vod story text does not become pure", "第1期下：纯享快乐", { issueNumber: 1, part: "down", kind: "normal" }],
    ["vod story text does not become early", "第1期下：超前完成任务", { issueNumber: 1, part: "down", kind: "normal" }],
    ["vod story text does not become trailer", "第1期下：预告未来", { issueNumber: 1, part: "down", kind: "normal" }],
    ["vod story text without colon does not become mid", "第1期下乱套了沈腾范丞丞互掐人中", { issueNumber: 1, part: "down", kind: "normal" }],
    ["vod story text without colon does not become plus", "第1期下还有加更难度", { issueNumber: 1, part: "down", kind: "normal" }],
    ["vod story text without colon does not become pure", "第1期下纯享快乐", { issueNumber: 1, part: "down", kind: "normal" }],
    ["vod story text without colon does not become early", "第1期下超前完成任务", { issueNumber: 1, part: "down", kind: "normal" }],
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
        label: "variety episode title without issue keeps first season",
        params: { type: "tv", title: "花儿与少年", seriesName: "花儿与少年", season: 1, episode: 1, episodeName: "姐弟穷游罗马", airDate: "2014-04-25" },
        validate(streams) {
            assert(streams.length > 0, `${this.label}: expected first season streams`);
            assertAllInclude(streams.slice(0, 6), /花儿与少年第一季|花儿与少年\s*第一季/, this.label);
            assertNoneInclude(streams.slice(0, 6), /丝路季|好友记|露营季|好友季|第0?1期(?!.*第一季)/, this.label);
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
            assertAllInclude(streams, /20260611.*上|20260612.*上|第0?9期.*上|上.*第0?9期/, this.label);
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
        label: "variety pilot title from alternate field",
        params: { type: "tv", title: "现在就出发", seriesName: "现在就出发", season: 3, episode: 1, episodeTitle: "先导片上：显眼包" },
        validate(streams) {
            assert(streams.length > 0, `${this.label}: expected streams`);
            assertAllNamesInclude(streams.slice(0, 8), /先导片上|20251018.*先导片/, this.label);
            assertNoNamesInclude(streams.slice(0, 8), /第0?1期上|第0?1期下|第0?2期|加更|纯享/, this.label);
        }
    },
    {
        label: "variety pilot title from tmdb fallback",
        params: { type: "tv", tmdbId: "231620", imdbId: "tt30461072", seriesName: "现在就出发", season: "3", episode: "1", episodeName: "", airDate: "" },
        validate(streams) {
            assert(streams.length > 0, `${this.label}: expected streams`);
            assertAllNamesInclude(streams.slice(0, 8), /先导片上|20251018/, this.label);
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
        label: "variety issue down from tmdb fallback",
        params: { type: "tv", tmdbId: "231620", seriesName: "现在就出发", season: "3", episode: "4", episodeName: "", airDate: "" },
        validate(streams) {
            assert(streams.length > 0, `${this.label}: expected streams`);
            assertAllNamesInclude(streams.slice(0, 8), /第0?1期.*下|20251026.*下/, this.label);
            assertNoNamesInclude(streams.slice(0, 8), /第0?1期上|第0?4期|加更|纯享/, this.label);
        }
    },
    {
        label: "variety issue down from typed tmdb id",
        params: { type: "tv", tmdbId: "tv.231620", seriesName: "现在就出发", season: "3", episode: "4", episodeName: "", airDate: "" },
        validate(streams) {
            assert(streams.length > 0, `${this.label}: expected streams`);
            assertAllNamesInclude(streams.slice(0, 8), /第0?1期.*下|20251026.*下/, this.label);
            assertNoNamesInclude(streams.slice(0, 8), /第0?1期上|第0?4期|加更|纯享/, this.label);
        }
    },
    {
        label: "variety issue down from schedule fallback without episode name",
        context: contextWithoutTmdbEpisodeNames,
        params: { type: "tv", tmdbId: "231620", seriesName: "现在就出发", season: "3", episode: "4", episodeName: "", airDate: "" },
        validate(streams) {
            assert(streams.length > 0, `${this.label}: expected streams`);
            assertAllNamesInclude(streams.slice(0, 8), /第0?1期.*下|20251026.*下|20251102.*下/, this.label);
            assertNoNamesInclude(streams.slice(0, 8), /第0?4期|加更|纯享|预告|解说/, this.label);
        }
    },
    {
        label: "variety issue down keeps identity when air date drifts",
        params: { type: "tv", title: "现在就出发", seriesName: "现在就出发", season: 3, episode: 4, episodeName: "第1期下：出发家族爆笑闯关", airDate: "2025-10-25" },
        validate(streams) {
            assert(streams.length > 0, `${this.label}: expected streams`);
            assertAllNamesInclude(streams.slice(0, 8), /第0?1期.*下|20251026.*下/, this.label);
            assertNoNamesInclude(streams.slice(0, 8), /第0?4期|第0?1期上|加更|纯享|20251025(?!.*下)/, this.label);
        }
    },
    {
        label: "variety issue down does not become empty when strict identity misses",
        params: { type: "tv", title: "现在就出发", seriesName: "现在就出发", season: 3, episode: 4, episodeName: "第1期下：出发家族爆笑闯关", airDate: "2025-10-24" },
        validate(streams) {
            assert(streams.length > 0, `${this.label}: expected fallback streams`);
            assertNoNamesInclude(streams.slice(0, 8), /第0?4期|加更|纯享|预告|解说/, this.label);
        }
    },
    {
        label: "variety plus issue from tmdb fallback without label issue",
        params: { type: "tv", tmdbId: "231620", seriesName: "现在就出发", season: "3", episode: "5", episodeName: "", airDate: "" },
        validate(streams) {
            assert(streams.length > 0, `${this.label}: expected streams`);
            assertAllNamesInclude(streams.slice(0, 8), /第0?1期.*加更|20251027.*加更/, this.label);
            assertNoNamesInclude(streams.slice(0, 8), /还有加更|20251028|第0?1期上|第0?1期下|第0?2期|纯享/, this.label);
        }
    },
    {
        label: "variety more-plus issue from tmdb fallback without label issue",
        params: { type: "tv", tmdbId: "231620", seriesName: "现在就出发", season: "3", episode: "6", episodeName: "", airDate: "" },
        validate(streams) {
            assert(streams.length > 0, `${this.label}: expected streams`);
            assertAllNamesInclude(streams.slice(0, 8), /还有加更|20251028.*加更/, this.label);
            assertNoNamesInclude(streams.slice(0, 8), /20251027|第0?1期上|第0?1期下|第0?2期|纯享/, this.label);
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
        label: "variety issue part mid from subtitle beats episode number",
        params: { type: "tv", title: "五十公里桃花坞", seriesName: "五十公里桃花坞", season: 6, episode: 2, subTitle: "第1期中：入住桃花坞", duration: 120 },
        validate(streams) {
            assert(streams.length > 0, `${this.label}: expected streams`);
            assertAllNamesInclude(streams.slice(0, 8), /第0?1期.*中|20260514.*中/, this.label);
            assertNoNamesInclude(streams.slice(0, 8), /20260521|第0?2期|第0?1期.*上|第0?1期.*下|加更|纯享/, this.label);
        }
    },
    {
        label: "variety issue part mid from title beats episode number",
        params: { type: "tv", title: "第1期中：入住桃花坞", seriesName: "五十公里桃花坞", season: 6, episode: 2, duration: 120 },
        validate(streams) {
            assert(streams.length > 0, `${this.label}: expected streams`);
            assertAllNamesInclude(streams.slice(0, 8), /第0?1期.*中|20260514.*中/, this.label);
            assertNoNamesInclude(streams.slice(0, 8), /20260521|第0?2期|第0?1期.*上|第0?1期.*下|加更|纯享/, this.label);
        }
    },
    {
        label: "variety issue part mid from tmdb fallback",
        params: { type: "tv", tmdbId: "233365", seriesName: "五十公里桃花坞", season: "6", episode: "2", episodeName: "", airDate: "", duration: 120 },
        validate(streams) {
            assert(streams.length > 0, `${this.label}: expected streams`);
            assertAllNamesInclude(streams.slice(0, 8), /第0?1期.*中|20260514.*中/, this.label);
            assertNoNamesInclude(streams.slice(0, 8), /20260521|第0?2期|第0?1期.*上|第0?1期.*下|加更|纯享/, this.label);
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
        label: "long anime one piece season one avoids side editions",
        params: { type: "tv", title: "航海王", seriesName: "航海王", season: 1, episode: 1, episodeName: "第1集" },
        validate(streams) {
            assertAllInclude(streams.slice(0, 8), /海贼王/, this.label);
            assertAllInclude(streams.slice(0, 8), /第0*1集/, this.label);
            assertNoneInclude(streams.slice(0, 8), /鱼人岛|特别编辑版|真人版|红发歌姬|海贼王女|剧场版|解说|预告/, this.label);
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
        const runner = testCase.context || context;
        const streams = await runner.loadResource(testCase.params);
        testCase.validate(streams);
        console.log(`PASS ${testCase.label}: ${streams.length} streams in ${Date.now() - startedAt}ms`);
        console.log(combinedText(streams.slice(0, 2)));
    }
})().catch(error => {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
});
