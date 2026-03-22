const express = require('express');

function badRequest(res, code, message) {
  return res.status(400).json({ code, message });
}

function extractTextPayload(payload = {}) {
  const text = payload.content || payload.transcript || payload.text || '';
  return String(text || '').trim();
}

function createAiRouter(aiService) {
  const router = express.Router();

  router.post('/chat', async (req, res) => {
    const payload = req.body && typeof req.body === 'object' ? req.body : {};
    const messages = Array.isArray(payload.messages) ? payload.messages : [];

    if (!messages.length) {
      return badRequest(res, 'MISSING_MESSAGES', 'messages is required');
    }

    try {
      const result = await aiService.chat(payload);
      return res.json(result);
    } catch (error) {
      const status = error.code === 'AI_NOT_CONFIGURED' ? 503 : error.code === 'UNSUPPORTED_PROVIDER' ? 400 : 500;
      return res.status(status).json({
        code: error.code || 'AI_CHAT_ERROR',
        message: error.message || 'AI chat failed',
      });
    }
  });

  router.post('/quick-read', async (req, res) => {
    const payload = req.body && typeof req.body === 'object' ? req.body : {};
    if (!extractTextPayload(payload) && !(Array.isArray(payload.items) && payload.items.length)) {
      return badRequest(res, 'MISSING_CONTENT', 'content or items is required');
    }

    try {
      const result = await aiService.quickRead(payload);
      return res.json(result);
    } catch (error) {
      const status = error.code === 'AI_NOT_CONFIGURED' ? 503 : error.code === 'UNSUPPORTED_PROVIDER' ? 400 : 500;
      return res.status(status).json({
        code: error.code || 'QUICK_READ_ERROR',
        message: error.message || 'quick-read failed',
      });
    }
  });

  router.post('/explore-questions', async (req, res) => {
    const payload = req.body && typeof req.body === 'object' ? req.body : {};
    if (!payload.topic && !extractTextPayload(payload) && !(Array.isArray(payload.items) && payload.items.length)) {
      return badRequest(res, 'MISSING_TOPIC', 'topic, content, or items is required');
    }

    try {
      const result = await aiService.exploreQuestions(payload);
      return res.json(result);
    } catch (error) {
      const status = error.code === 'AI_NOT_CONFIGURED' ? 503 : error.code === 'UNSUPPORTED_PROVIDER' ? 400 : 500;
      return res.status(status).json({
        code: error.code || 'EXPLORE_QUESTIONS_ERROR',
        message: error.message || 'explore-questions failed',
      });
    }
  });

  router.post('/article-to-note', async (req, res) => {
    const payload = req.body && typeof req.body === 'object' ? req.body : {};
    if (!extractTextPayload(payload)) {
      return badRequest(res, 'MISSING_CONTENT', 'content is required');
    }

    try {
      const result = await aiService.articleToNote(payload);
      return res.json(result);
    } catch (error) {
      const status = error.code === 'AI_NOT_CONFIGURED' ? 503 : error.code === 'UNSUPPORTED_PROVIDER' ? 400 : 500;
      return res.status(status).json({
        code: error.code || 'ARTICLE_TO_NOTE_ERROR',
        message: error.message || 'article-to-note failed',
      });
    }
  });

  router.post('/voice-clean', async (req, res) => {
    const payload = req.body && typeof req.body === 'object' ? req.body : {};
    if (!extractTextPayload(payload)) {
      return badRequest(res, 'MISSING_TRANSCRIPT', 'transcript or content is required');
    }

    try {
      const result = await aiService.voiceClean(payload);
      return res.json(result);
    } catch (error) {
      const status = error.code === 'AI_NOT_CONFIGURED' ? 503 : error.code === 'UNSUPPORTED_PROVIDER' ? 400 : 500;
      return res.status(status).json({
        code: error.code || 'VOICE_CLEAN_ERROR',
        message: error.message || 'voice-clean failed',
      });
    }
  });

  router.post('/jobs/briefing', async (req, res) => {
    const payload = req.body && typeof req.body === 'object' ? req.body : {};
    if (!extractTextPayload(payload) && !(Array.isArray(payload.items) && payload.items.length)) {
      return badRequest(res, 'MISSING_CONTENT', 'content or items is required');
    }

    try {
      const result = await aiService.createBriefingJob(payload);
      return res.status(202).json(result);
    } catch (error) {
      const status = error.code === 'AI_NOT_CONFIGURED' ? 503 : error.code === 'UNSUPPORTED_PROVIDER' ? 400 : 500;
      return res.status(status).json({
        code: error.code || 'BRIEFING_JOB_ERROR',
        message: error.message || 'briefing job failed',
      });
    }
  });

  router.post('/jobs/podcast', async (req, res) => {
    const payload = req.body && typeof req.body === 'object' ? req.body : {};
    if (!extractTextPayload(payload) && !(Array.isArray(payload.items) && payload.items.length)) {
      return badRequest(res, 'MISSING_CONTENT', 'content or items is required');
    }

    try {
      const result = await aiService.createPodcastJob(payload);
      return res.status(202).json(result);
    } catch (error) {
      const status = error.code === 'AI_NOT_CONFIGURED' ? 503 : error.code === 'UNSUPPORTED_PROVIDER' ? 400 : 500;
      return res.status(status).json({
        code: error.code || 'PODCAST_JOB_ERROR',
        message: error.message || 'podcast job failed',
      });
    }
  });

  router.get('/jobs/:jobId', async (req, res) => {
    try {
      const job = await aiService.getJob(req.params.jobId);
      if (!job) {
        return res.status(404).json({ code: 'JOB_NOT_FOUND', message: 'Job not found' });
      }
      return res.json(job);
    } catch (error) {
      return res.status(500).json({
        code: error.code || 'JOB_READ_ERROR',
        message: error.message || 'Failed to load job',
      });
    }
  });

  router.get('/artifacts/:artifactId', async (req, res) => {
    try {
      const artifact = await aiService.getArtifact(req.params.artifactId);
      if (!artifact) {
        return res.status(404).json({ code: 'ARTIFACT_NOT_FOUND', message: 'Artifact not found' });
      }
      return res.json(artifact);
    } catch (error) {
      return res.status(500).json({
        code: error.code || 'ARTIFACT_READ_ERROR',
        message: error.message || 'Failed to load artifact',
      });
    }
  });

  return router;
}

module.exports = {
  createAiRouter,
};
