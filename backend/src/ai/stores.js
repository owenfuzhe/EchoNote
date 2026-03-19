const jobs = new Map();
const artifacts = new Map();

function genId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function now() {
  return new Date().toISOString();
}

function createJob({ type, provider, input }) {
  const id = genId('job');
  const job = {
    id,
    type,
    provider,
    status: 'queued',
    input,
    createdAt: now(),
    updatedAt: now(),
  };
  jobs.set(id, job);
  return { ...job };
}

function updateJob(id, patch = {}) {
  const current = jobs.get(id);
  if (!current) return null;
  const next = {
    ...current,
    ...patch,
    updatedAt: now(),
  };
  jobs.set(id, next);
  return { ...next };
}

function getJob(id) {
  const job = jobs.get(id);
  return job ? { ...job } : null;
}

function createArtifact({ type, title, provider, jobId, data, meta }) {
  const id = genId('artifact');
  const artifact = {
    id,
    type,
    title,
    provider,
    jobId: jobId || null,
    createdAt: now(),
    updatedAt: now(),
    data,
    meta: meta || {},
  };
  artifacts.set(id, artifact);
  return { ...artifact };
}

function getArtifact(id) {
  const artifact = artifacts.get(id);
  return artifact ? { ...artifact } : null;
}

function getLatestArtifactByType(type) {
  const values = [...artifacts.values()].filter((artifact) => artifact.type === type);
  values.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return values[0] ? { ...values[0] } : null;
}

module.exports = {
  createArtifact,
  createJob,
  getArtifact,
  getJob,
  getLatestArtifactByType,
  updateJob,
};
