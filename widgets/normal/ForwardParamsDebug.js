WidgetMetadata = {
    id: "forward_params_debug_20260617",
    title: "Forward参数调试",
    description: "调试 Forward 详情页传给 stream 资源模块的 params 字段",
    author: "工位划水冠军",
    version: "1.0.0",
    requiredVersion: "0.0.1",
    site: "https://github.com/wrs0918/forward-widgets",
    detailCacheDuration: 0,
    modules: [
        {
            id: "loadResource",
            title: "查看传入参数",
            functionName: "loadResource",
            type: "stream",
            cacheDuration: 0,
            params: []
        }
    ]
};

function safeString(value) {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (typeof value === "string") return value;
    try {
        return JSON.stringify(value);
    } catch (error) {
        return String(value);
    }
}

function stringifyParams(params) {
    const seen = [];
    return JSON.stringify(params || {}, function replacer(key, value) {
        if (typeof value === "function") return `[Function ${value.name || "anonymous"}]`;
        if (value && typeof value === "object") {
            if (seen.includes(value)) return "[Circular]";
            seen.push(value);
        }
        return value;
    }, 2);
}

function chunkText(text, size) {
    const chunks = [];
    for (let index = 0; index < text.length; index += size) {
        chunks.push(text.slice(index, index + size));
    }
    return chunks.length ? chunks : [""];
}

function summarizeParams(params) {
    const keys = Object.keys(params || {}).sort();
    const importantKeys = [
        "type",
        "mediaType",
        "title",
        "seriesName",
        "name",
        "episodeName",
        "episodeTitle",
        "episode_title",
        "epName",
        "epTitle",
        "subtitle",
        "subTitle",
        "season",
        "episode",
        "airDate",
        "premiereDate",
        "releaseDate",
        "runtime",
        "duration",
        "tmdbId",
        "imdbId",
        "link",
        "videoUrl"
    ];
    const important = importantKeys
        .filter(key => Object.prototype.hasOwnProperty.call(params || {}, key))
        .map(key => `${key}=${safeString(params[key])}`);
    return [
        `keys(${keys.length})=${keys.join(", ") || "-"}`,
        important.length ? important.join("\n") : "no known important keys"
    ].join("\n");
}

async function loadResource(params = {}) {
    const summary = summarizeParams(params);
    const json = stringifyParams(params);
    console.log("[ForwardParamsDebug] params summary:", summary);
    console.log("[ForwardParamsDebug] params json:", json);

    const streams = [{
        name: "Forward参数调试 · 字段摘要",
        description: summary,
        url: params.videoUrl || params.link || "https://example.com/forward-params-debug"
    }];

    const chunks = chunkText(json, 900);
    for (let index = 0; index < chunks.length; index += 1) {
        streams.push({
            name: `Forward参数调试 · JSON ${index + 1}/${chunks.length}`,
            description: chunks[index],
            url: params.videoUrl || params.link || "https://example.com/forward-params-debug"
        });
    }
    return streams;
}
