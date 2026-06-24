/**
 * 知乎 x-zse-96 签名离线计算工具
 *
 * 纯静态实现，不请求知乎 API，仅生成签名参数供用户手动调用。
 * 适配 GitHub Pages 部署，无跨域问题。
 *
 * 签名流程：
 * 1. 拼接签名原文：{x-zse-93} + {API路径+query参数} + {d_c0}
 * 2. 对原文做 MD5 得到 32 位 hex
 * 3. 将 MD5 hex 转为字节数组，用知乎自定义字母表做 Base64 编码 → x-zse-96
 */

// ==================== MD5 实现（紧凑版） ====================

function safeAdd(x: number, y: number): number {
  const lsw = (x & 0xffff) + (y & 0xffff);
  const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return (msw << 16) | (lsw & 0xffff);
}

function bitRol(num: number, cnt: number): number {
  return (num << cnt) | (num >>> (32 - cnt));
}

function md5cmn(
  q: number,
  a: number,
  b: number,
  x: number,
  s: number,
  t: number
): number {
  return safeAdd(bitRol(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
}

function md5ff(
  a: number,
  b: number,
  c: number,
  d: number,
  x: number,
  s: number,
  t: number
): number {
  return md5cmn((b & c) | (~b & d), a, b, x, s, t);
}

function md5gg(
  a: number,
  b: number,
  c: number,
  d: number,
  x: number,
  s: number,
  t: number
): number {
  return md5cmn((b & d) | (c & ~d), a, b, x, s, t);
}

function md5hh(
  a: number,
  b: number,
  c: number,
  d: number,
  x: number,
  s: number,
  t: number
): number {
  return md5cmn(b ^ c ^ d, a, b, x, s, t);
}

function md5ii(
  a: number,
  b: number,
  c: number,
  d: number,
  x: number,
  s: number,
  t: number
): number {
  return md5cmn(c ^ (b | ~d), a, b, x, s, t);
}

function binlMD5(x: number[], len: number): number[] {
  x[len >> 5] |= 0x80 << len % 32;
  x[(((len + 64) >>> 9) << 4) + 14] = len;

  let a = 1732584193;
  let b = -271733879;
  let c = -1732584194;
  let d = 271733878;

  for (let i = 0; i < x.length; i += 16) {
    const olda = a;
    const oldb = b;
    const oldc = c;
    const oldd = d;

    a = md5ff(a, b, c, d, x[i], 7, -680876936);
    d = md5ff(d, a, b, c, x[i + 1], 12, -389564586);
    c = md5ff(c, d, a, b, x[i + 2], 17, 606105819);
    b = md5ff(b, c, d, a, x[i + 3], 22, -1044525330);
    a = md5ff(a, b, c, d, x[i + 4], 7, -176418897);
    d = md5ff(d, a, b, c, x[i + 5], 12, 1200080426);
    c = md5ff(c, d, a, b, x[i + 6], 17, -1473231341);
    b = md5ff(b, c, d, a, x[i + 7], 22, -45705983);
    a = md5ff(a, b, c, d, x[i + 8], 7, 1770035416);
    d = md5ff(d, a, b, c, x[i + 9], 12, -1958414417);
    c = md5ff(c, d, a, b, x[i + 10], 17, -42063);
    b = md5ff(b, c, d, a, x[i + 11], 22, -1990404162);
    a = md5ff(a, b, c, d, x[i + 12], 7, 1804603682);
    d = md5ff(d, a, b, c, x[i + 13], 12, -40341101);
    c = md5ff(c, d, a, b, x[i + 14], 17, -1502002290);
    b = md5ff(b, c, d, a, x[i + 15], 22, 1236535329);

    a = md5gg(a, b, c, d, x[i + 1], 5, -165796510);
    d = md5gg(d, a, b, c, x[i + 6], 9, -1069501632);
    c = md5gg(c, d, a, b, x[i + 11], 14, 643717713);
    b = md5gg(b, c, d, a, x[i], 20, -373897302);
    a = md5gg(a, b, c, d, x[i + 5], 5, -701558691);
    d = md5gg(d, a, b, c, x[i + 10], 9, 38016083);
    c = md5gg(c, d, a, b, x[i + 15], 14, -660478335);
    b = md5gg(b, c, d, a, x[i + 4], 20, -405537848);
    a = md5gg(a, b, c, d, x[i + 9], 5, 568446438);
    d = md5gg(d, a, b, c, x[i + 14], 9, -1019803690);
    c = md5gg(c, d, a, b, x[i + 3], 14, -187363961);
    b = md5gg(b, c, d, a, x[i + 8], 20, 1163531501);
    a = md5gg(a, b, c, d, x[i + 13], 5, -1444681467);
    d = md5gg(d, a, b, c, x[i + 2], 9, -51403784);
    c = md5gg(c, d, a, b, x[i + 7], 14, 1735328473);
    b = md5gg(b, c, d, a, x[i + 12], 20, -1926607734);

    a = md5hh(a, b, c, d, x[i + 5], 4, -378558);
    d = md5hh(d, a, b, c, x[i + 8], 11, -2022574463);
    c = md5hh(c, d, a, b, x[i + 11], 16, 1839030562);
    b = md5hh(b, c, d, a, x[i + 14], 23, -35309556);
    a = md5hh(a, b, c, d, x[i + 1], 4, -1530992060);
    d = md5hh(d, a, b, c, x[i + 4], 11, 1272893353);
    c = md5hh(c, d, a, b, x[i + 7], 16, -155497632);
    b = md5hh(b, c, d, a, x[i + 10], 23, -1094730640);
    a = md5hh(a, b, c, d, x[i + 13], 4, 681279174);
    d = md5hh(d, a, b, c, x[i], 11, -358537222);
    c = md5hh(c, d, a, b, x[i + 3], 16, -722521979);
    b = md5hh(b, c, d, a, x[i + 6], 23, 76029189);
    a = md5hh(a, b, c, d, x[i + 9], 4, -640364487);
    d = md5hh(d, a, b, c, x[i + 12], 11, -421815835);
    c = md5hh(c, d, a, b, x[i + 15], 16, 530742520);
    b = md5hh(b, c, d, a, x[i + 2], 23, -995338651);

    a = md5ii(a, b, c, d, x[i], 6, -198630844);
    d = md5ii(d, a, b, c, x[i + 7], 10, 1126891415);
    c = md5ii(c, d, a, b, x[i + 14], 15, -1416354905);
    b = md5ii(b, c, d, a, x[i + 5], 21, -57434055);
    a = md5ii(a, b, c, d, x[i + 12], 6, 1700485571);
    d = md5ii(d, a, b, c, x[i + 3], 10, -1894986606);
    c = md5ii(c, d, a, b, x[i + 10], 15, -1051523);
    b = md5ii(b, c, d, a, x[i + 1], 21, -2054922799);
    a = md5ii(a, b, c, d, x[i + 8], 6, 1873313359);
    d = md5ii(d, a, b, c, x[i + 15], 10, -30611744);
    c = md5ii(c, d, a, b, x[i + 6], 15, -1560198380);
    b = md5ii(b, c, d, a, x[i + 13], 21, 1309151649);
    a = md5ii(a, b, c, d, x[i + 4], 6, -145523070);
    d = md5ii(d, a, b, c, x[i + 11], 10, -1120210379);
    c = md5ii(c, d, a, b, x[i + 2], 15, 718787259);
    b = md5ii(b, c, d, a, x[i + 9], 21, -343485551);

    a = safeAdd(a, olda);
    b = safeAdd(b, oldb);
    c = safeAdd(c, oldc);
    d = safeAdd(d, oldd);
  }
  return [a, b, c, d];
}

function binl2hex(binarray: number[]): string {
  const hexTab = "0123456789abcdef";
  let str = "";
  for (let i = 0; i < binarray.length * 4; i++) {
    str +=
      hexTab.charAt((binarray[i >> 2] >> ((i % 4) * 8 + 4)) & 0xf) +
      hexTab.charAt((binarray[i >> 2] >> ((i % 4) * 8)) & 0xf);
  }
  return str;
}

function str2binl(str: string): number[] {
  const bin: number[] = [];
  const mask = (1 << 8) - 1;
  for (let i = 0; i < str.length * 8; i += 8) {
    bin[i >> 5] |= (str.charCodeAt(i / 8) & mask) << i % 32;
  }
  return bin;
}

/** 计算 UTF-8 字符串的 MD5，返回 32 位小写 hex */
export function md5(str: string): string {
  // 处理 UTF-8 编码
  const utf8 = unescape(encodeURIComponent(str));
  return binl2hex(binlMD5(str2binl(utf8), utf8.length * 8));
}

// ==================== 知乎 g_encrypt 实现 ====================

// 知乎自定义 Base64 字母表（与标准 Base64 不同，顺序打乱）
const ZHIHU_BASE64_ALPHABET =
  "6fpLRqJO8M/c3DYO9n4FpXmIwT4z9aQYAKtZkxR5Wf+Vj7uNS0Uy1rB2sEbhH3CgGd";

/**
 * 知乎 g_encrypt 函数
 * 将 MD5 hex 字符串转为字节数组，用知乎自定义字母表做 Base64 编码
 */
export function gEncrypt(md5Hex: string): string {
  // hex string → byte array
  const bytes: number[] = [];
  for (let i = 0; i < md5Hex.length; i += 2) {
    bytes.push(parseInt(md5Hex.substr(i, 2), 16));
  }

  // 自定义 Base64 编码
  let result = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b3 = i + 2 < bytes.length ? bytes[i + 2] : 0;

    result += ZHIHU_BASE64_ALPHABET[(b1 >> 2) & 0x3f];
    result += ZHIHU_BASE64_ALPHABET[((b1 << 4) | (b2 >> 4)) & 0x3f];
    result += i + 1 < bytes.length ? ZHIHU_BASE64_ALPHABET[((b2 << 2) | (b3 >> 6)) & 0x3f] : "=";
    result += i + 2 < bytes.length ? ZHIHU_BASE64_ALPHABET[b3 & 0x3f] : "=";
  }
  return result;
}

// ==================== 签名生成主逻辑 ====================

export interface SignResult {
  url: string;
  apiPath: string;
  xZse93: string;
  xZse96: string;
  signString: string;
  md5Hex: string;
  headers: Record<string, string>;
  curlCommand: string;
}

export interface SignParams {
  query: string;
  d_c0: string;
  offset?: number;
  limit?: number;
}

/**
 * 生成知乎 search_universal 接口的完整签名
 *
 * 接口：GET https://www.zhihu.com/api/v4/search_universal
 * 签名原文：{x-zse-93}+{API路径+query参数}+{d_c0}
 */
export function generateZhihuSign(params: SignParams): SignResult {
  const { query, d_c0 } = params;
  const offset = params.offset ?? 0;
  const limit = Math.min(params.limit ?? 10, 10); // limit 最大 10

  const xZse93 = "101_3_3.0";

  // 关键词只做一次 URL 编码
  const encodedQuery = encodeURIComponent(query);
  const apiPath = `/api/v4/search_universal?q=${encodedQuery}&offset=${offset}&limit=${limit}`;
  const fullUrl = `https://www.zhihu.com${apiPath}`;

  // 拼接签名原文：version + apiPath + d_c0（用 + 分隔，无空格）
  const signString = `${xZse93}+${apiPath}+${d_c0}`;

  // MD5 → g_encrypt
  const md5Hex = md5(signString);
  const xZse96 = gEncrypt(md5Hex);

  // 完整请求头
  const headers: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Referer: "https://www.zhihu.com/search",
    "Content-Type": "application/json;charset=utf-8",
    "x-api-version": "3.0.91",
    "x-zse-93": xZse93,
    "x-zse-96": xZse96,
    Cookie: `d_c0=${d_c0}`,
  };

  // 生成 cURL 命令
  const headerStr = Object.entries(headers)
    .map(([k, v]) => `  -H '${k}: ${v}'`)
    .join(" \\\n");
  const curlCommand = `curl -X GET '${fullUrl}' \\\n${headerStr}`;

  return {
    url: fullUrl,
    apiPath,
    xZse93,
    xZse96,
    signString,
    md5Hex,
    headers,
    curlCommand,
  };
}
