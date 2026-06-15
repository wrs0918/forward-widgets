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
