const axios = require('axios');
const path = require('path');

function createRemoteParserClient(baseUrl) {
  return {
    describe() {
      return baseUrl;
    },

    async request(endpoint, payload) {
      const response = await axios.post(`${baseUrl}${endpoint}`, payload, {
        timeout: 45000,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.data || response.data.success === false) {
        const message = response.data?.error || response.data?.message || 'Parser service error';
        throw new Error(String(message || 'Parser service error'));
      }

      return response.data;
    },
  };
}

function createLocalParserClient() {
  let loaded = null;

  function loadParserModule() {
    if (loaded) return loaded;

    const entryPath = path.resolve(__dirname, '../../../packages/web-parser/dist');

    try {
      const parserModule = require(entryPath);
      loaded = {
        detectPlatform: parserModule.detectPlatform,
        parseResultToLegacyShape: parserModule.parseResultToLegacyShape,
        service: new parserModule.ReadLaterService(),
      };
      return loaded;
    } catch (error) {
      const wrapped = new Error(
        `Embedded parser is unavailable. Run "npm --prefix packages/web-parser ci && npm --prefix packages/web-parser run build" before starting the backend. Original error: ${error.message}`,
      );
      wrapped.cause = error;
      throw wrapped;
    }
  }

  function unwrapResult(result, fallbackMessage) {
    if (result?.success && result.data) return result.data;

    const error = new Error(String(result?.error || fallbackMessage || 'Parser service error'));
    error.code = 'PARSER_ERROR';
    throw error;
  }

  return {
    describe() {
      return 'embedded';
    },

    async request(endpoint, payload) {
      const { service, detectPlatform, parseResultToLegacyShape } = loadParserModule();

      if (endpoint === '/api/parser/extract') {
        const result = await service.parseUrl(payload?.url, {
          forcePlatform: payload?.forcePlatform,
          includeRawHTML: payload?.includeRawHTML === true,
        });

        return { success: true, data: unwrapResult(result, 'Parse failed') };
      }

      if (endpoint === '/api/parser/wechat') {
        const result = await service.parseWechat(payload?.url, { includeRawHTML: true });
        const data = unwrapResult(result, 'Parse failed');
        return { success: true, ...parseResultToLegacyShape('wechat', data) };
      }

      if (endpoint === '/api/parser/xiaohongshu') {
        const result = await service.parseXiaohongshu(payload?.url, { includeRawHTML: true });
        const data = unwrapResult(result, 'Parse failed');
        return { success: true, ...parseResultToLegacyShape('xiaohongshu', data) };
      }

      if (endpoint === '/api/parser/legacy-fetch') {
        const platform = detectPlatform(payload?.url);
        const result = await service.parseUrl(payload?.url, {
          forcePlatform: platform,
          includeRawHTML: true,
        });
        const data = unwrapResult(result, 'Parse failed');
        return {
          success: true,
          data: parseResultToLegacyShape(platform, data),
          platform,
        };
      }

      const error = new Error(`Unsupported embedded parser endpoint: ${endpoint}`);
      error.code = 'UNSUPPORTED_PARSER_ENDPOINT';
      throw error;
    },
  };
}

function createParserClient({ url, hostport }) {
  const baseUrl = url || (hostport ? `http://${hostport}` : '');
  return baseUrl ? createRemoteParserClient(baseUrl) : createLocalParserClient();
}

module.exports = {
  createParserClient,
};
