WidgetMetadata = {
    id: "forward_params_debug_20260617",
    title: "Forward参数调试",
    description: "调试 Forward 详情页传给 stream 资源模块的 params 字段",
    author: "工位划水冠军",
    version: "1.2.0",
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

function compactValue(value, maxLength) {
    const text = safeString(value).replace(/\s+/g, " ");
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength - 1)}…`;
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

function importantNameRows(params) {
    const rows = [];
    const keyGroups = [
        ["type", "mediaType", "season", "episode"],
        ["title"],
        ["seriesName"],
        ["episodeName"],
        ["episodeTitle", "episode_title", "epName", "epTitle"],
        ["subtitle", "subTitle", "name"],
        ["airDate", "premiereDate", "releaseDate"],
        ["runtime", "duration"],
        ["tmdbId", "imdbId"]
    ];

    for (const group of keyGroups) {
        const parts = group
            .filter(key => Object.prototype.hasOwnProperty.call(params || {}, key))
            .map(key => `${key}=${compactValue(params[key], 56)}`);
        if (parts.length) rows.push(parts.join(" | "));
    }

    const allKeys = Object.keys(params || {}).sort();
    rows.unshift(`keys=${allKeys.join(",") || "-"}`);
    return rows;
}

async function loadResource(params = {}) {
    const summary = summarizeParams(params);
    const json = stringifyParams(params);
    console.log("[ForwardParamsDebug] params summary:", summary);
    console.log("[ForwardParamsDebug] params json:", json);

    const baseUrl = "https://example.com/forward-params-debug";
    const streams = importantNameRows(params).map((row, index) => ({
        name: `Forward参数调试 · ${String(index + 1).padStart(2, "0")} · ${row}`,
        description: summary,
        url: `${baseUrl}#row-${index + 1}`
    }));

    const chunks = chunkText(json.replace(/\s+/g, " "), 90);
    for (let index = 0; index < chunks.length; index += 1) {
        streams.push({
            name: `Forward参数调试 · JSON ${index + 1}/${chunks.length} · ${chunks[index]}`,
            description: chunks[index],
            url: `${baseUrl}#json-${index + 1}`
        });
    }
    return streams;
}
