const { isDbConfigured, query } = require('../../db');

const jobs = new Map();
const artifacts = new Map();
let aiTablesReady = false;
let aiTablesFailed = false;

function genId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function now() {
  return new Date().toISOString();
}

function clone(value) {
  return value ? JSON.parse(JSON.stringify(value)) : value;
}

function mapJobRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    type: row.type,
    provider: row.provider,
    status: row.status,
    input: row.input_json || {},
    artifactId: row.artifact_id || undefined,
    error: row.error_json || undefined,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    startedAt: row.started_at ? new Date(row.started_at).toISOString() : undefined,
    finishedAt: row.finished_at ? new Date(row.finished_at).toISOString() : undefined,
  };
}

function mapArtifactRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    provider: row.provider,
    jobId: row.job_id || null,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    data: row.data_json || {},
    meta: row.meta_json || {},
  };
}

async function ensureAiTables() {
  if (!isDbConfigured() || aiTablesFailed) return false;
  if (aiTablesReady) return true;

  try {
    await query(`
      create table if not exists ai_jobs (
        id text primary key,
        type text not null,
        provider text not null,
        status text not null,
        input_json jsonb not null default '{}'::jsonb,
        artifact_id text,
        error_json jsonb,
        started_at timestamptz,
        finished_at timestamptz,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create table if not exists ai_artifacts (
        id text primary key,
        type text not null,
        title text not null,
        provider text not null,
        job_id text references ai_jobs(id) on delete set null,
        data_json jsonb not null default '{}'::jsonb,
        meta_json jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create index if not exists idx_ai_jobs_type_created_at on ai_jobs(type, created_at desc);
      create index if not exists idx_ai_artifacts_type_created_at on ai_artifacts(type, created_at desc);
      create index if not exists idx_ai_artifacts_job_id on ai_artifacts(job_id);
    `);

    aiTablesReady = true;
    return true;
  } catch (error) {
    aiTablesFailed = true;
    console.error('AI store DB setup failed, falling back to memory:', error.message);
    return false;
  }
}

async function createJob({ type, provider, input }) {
  const job = {
    id: genId('job'),
    type,
    provider,
    status: 'queued',
    input,
    createdAt: now(),
    updatedAt: now(),
  };

  if (await ensureAiTables()) {
    await query(
      `
        insert into ai_jobs (id, type, provider, status, input_json, created_at, updated_at)
        values ($1, $2, $3, $4, $5::jsonb, $6::timestamptz, $7::timestamptz)
      `,
      [job.id, job.type, job.provider, job.status, JSON.stringify(job.input || {}), job.createdAt, job.updatedAt]
    );
    return clone(job);
  }

  jobs.set(job.id, job);
  return clone(job);
}

async function updateJob(id, patch = {}) {
  const nextUpdatedAt = now();

  if (await ensureAiTables()) {
    const existing = await query('select * from ai_jobs where id = $1', [id]);
    const current = existing.rows[0];
    if (!current) return null;

    const merged = {
      ...mapJobRow(current),
      ...patch,
      updatedAt: nextUpdatedAt,
    };

    await query(
      `
        update ai_jobs
        set status = $2,
            artifact_id = $3,
            error_json = $4::jsonb,
            started_at = $5::timestamptz,
            finished_at = $6::timestamptz,
            updated_at = $7::timestamptz
        where id = $1
      `,
      [
        id,
        merged.status,
        merged.artifactId || null,
        JSON.stringify(merged.error || null),
        merged.startedAt || null,
        merged.finishedAt || null,
        merged.updatedAt,
      ]
    );

    return merged;
  }

  const current = jobs.get(id);
  if (!current) return null;
  const next = {
    ...current,
    ...patch,
    updatedAt: nextUpdatedAt,
  };
  jobs.set(id, next);
  return clone(next);
}

async function getJob(id) {
  if (await ensureAiTables()) {
    const result = await query('select * from ai_jobs where id = $1', [id]);
    return mapJobRow(result.rows[0]);
  }

  const job = jobs.get(id);
  return clone(job);
}

async function createArtifact({ type, title, provider, jobId, data, meta }) {
  const artifact = {
    id: genId('artifact'),
    type,
    title,
    provider,
    jobId: jobId || null,
    createdAt: now(),
    updatedAt: now(),
    data,
    meta: meta || {},
  };

  if (await ensureAiTables()) {
    await query(
      `
        insert into ai_artifacts (id, type, title, provider, job_id, data_json, meta_json, created_at, updated_at)
        values ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::timestamptz, $9::timestamptz)
      `,
      [
        artifact.id,
        artifact.type,
        artifact.title,
        artifact.provider,
        artifact.jobId,
        JSON.stringify(artifact.data || {}),
        JSON.stringify(artifact.meta || {}),
        artifact.createdAt,
        artifact.updatedAt,
      ]
    );
    return clone(artifact);
  }

  artifacts.set(artifact.id, artifact);
  return clone(artifact);
}

async function getArtifact(id) {
  if (await ensureAiTables()) {
    const result = await query('select * from ai_artifacts where id = $1', [id]);
    return mapArtifactRow(result.rows[0]);
  }

  const artifact = artifacts.get(id);
  return clone(artifact);
}

async function getLatestArtifactByType(type) {
  if (await ensureAiTables()) {
    const result = await query(
      `
        select *
        from ai_artifacts
        where type = $1
        order by created_at desc
        limit 1
      `,
      [type]
    );
    return mapArtifactRow(result.rows[0]);
  }

  const values = [...artifacts.values()].filter((artifact) => artifact.type === type);
  values.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return values[0] ? clone(values[0]) : null;
}

module.exports = {
  createArtifact,
  createJob,
  getArtifact,
  getJob,
  getLatestArtifactByType,
  updateJob,
};
