const { createDemoProvider } = require('./providers/demo');
const { createCozeProvider } = require('./providers/coze');
const { createDashScopeProvider } = require('./providers/dashscope');
const { createToolRegistry } = require('./tools');
const { createArtifact, createJob, getArtifact, getJob, getLatestArtifactByType, updateJob } = require('./stores');

function createAiService(config = {}) {
  const toolRegistry = createToolRegistry();
  const providers = {
    demo: createDemoProvider(),
    coze: createCozeProvider(config.coze || {}),
    dashscope: createDashScopeProvider(config.dashscope || {}),
  };

  function defaultProviderName() {
    if (config.provider && providers[config.provider]) return config.provider;
    if (providers.coze.isConfigured()) return 'coze';
    if (providers.dashscope.isConfigured()) return 'dashscope';
    return 'demo';
  }

  function getProvider(providerName) {
    const resolvedName = providerName || defaultProviderName();
    const provider = providers[resolvedName];
    if (!provider) {
      const error = new Error(`Unsupported AI provider: ${resolvedName}`);
      error.code = 'UNSUPPORTED_PROVIDER';
      throw error;
    }
    if (resolvedName !== 'demo' && !provider.isConfigured()) {
      const error = new Error(`AI provider "${resolvedName}" is not configured`);
      error.code = 'AI_NOT_CONFIGURED';
      throw error;
    }
    return provider;
  }

  async function enqueueJob(type, artifactType, payload = {}) {
    const provider = getProvider(payload.provider);
    const job = await createJob({ type, provider: provider.name, input: payload });

    Promise.resolve()
      .then(async () => {
        await updateJob(job.id, { status: 'running', startedAt: new Date().toISOString() });
        const generator =
          type === 'briefing.generate' ? provider.generateBriefing.bind(provider) : provider.generatePodcast.bind(provider);
        const data = await generator(payload);
        const artifact = await createArtifact({
          type: artifactType,
          title: data.title,
          provider: provider.name,
          jobId: job.id,
          data,
          meta: {
            sourceCount: data.sourceCount || (Array.isArray(payload.items) ? payload.items.length : undefined),
          },
        });

        await updateJob(job.id, {
          status: 'succeeded',
          artifactId: artifact.id,
          finishedAt: new Date().toISOString(),
        });
      })
      .catch(async (error) => {
        await updateJob(job.id, {
          status: 'failed',
          error: {
            code: error.code || 'AI_JOB_FAILED',
            message: error.message || 'AI job failed',
          },
          finishedAt: new Date().toISOString(),
        });
      });

    return {
      jobId: job.id,
      type: job.type,
      status: job.status,
      provider: provider.name,
      estimatedSeconds: type === 'podcast.generate' ? 45 : 20,
    };
  }

  return {
    getHealth() {
      const configuredProviders = Object.entries(providers)
        .filter(([name, provider]) => name !== 'demo' && provider.isConfigured())
        .map(([name]) => name);

      return {
        provider: defaultProviderName(),
        configured: configuredProviders.length > 0,
        configuredProviders,
        availableProviders: Object.keys(providers),
        ttsProvider: config.ttsProvider || 'demo',
        tools: toolRegistry.list().map((tool) => tool.id),
      };
    },
    async chat(payload = {}) {
      const provider = getProvider(payload.provider);
      const result = await provider.chat(payload);
      return {
        ...result,
        provider: provider.name,
      };
    },
    async quickRead(payload = {}) {
      const provider = getProvider(payload.provider);
      return provider.quickRead(payload);
    },
    async exploreQuestions(payload = {}) {
      const provider = getProvider(payload.provider);
      return provider.exploreQuestions(payload);
    },
    async articleToNote(payload = {}) {
      const provider = getProvider(payload.provider);
      return provider.articleToNote(payload);
    },
    async voiceClean(payload = {}) {
      const provider = getProvider(payload.provider);
      return provider.voiceClean(payload);
    },
    async createBriefingJob(payload = {}) {
      return enqueueJob('briefing.generate', 'briefing', payload);
    },
    async createPodcastJob(payload = {}) {
      return enqueueJob('podcast.generate', 'podcast', payload);
    },
    async getJob(jobId) {
      return getJob(jobId);
    },
    async getArtifact(artifactId) {
      return getArtifact(artifactId);
    },
    async getLatestBriefing() {
      return getLatestArtifactByType('briefing');
    },
    async getPodcast(artifactId) {
      const artifact = await getArtifact(artifactId);
      if (!artifact || artifact.type !== 'podcast') return null;
      return artifact;
    },
  };
}

module.exports = {
  createAiService,
};
