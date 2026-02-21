-- 启用 pgvector 扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- 添加 embedding 列到 cells 表
ALTER TABLE cells ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- 创建向量索引（使用 ivfflat）
CREATE INDEX IF NOT EXISTS cells_embedding_idx ON cells 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- 创建函数：计算文本相似度
CREATE OR REPLACE FUNCTION match_cells(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  notebook_id uuid,
  type text,
  content jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.notebook_id,
    c.type,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity
  FROM cells c
  WHERE 1 - (c.embedding <=> query_embedding) > match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 创建函数：查找相似笔记
CREATE OR REPLACE FUNCTION find_related_notebooks(
  query_embedding vector(1536),
  exclude_notebook_id uuid DEFAULT NULL,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  notebook_id uuid,
  notebook_title text,
  similarity float,
  matched_content jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.notebook_id,
    n.title as notebook_title,
    MAX(1 - (c.embedding <=> query_embedding)) as similarity,
    jsonb_agg(c.content) as matched_content
  FROM cells c
  JOIN notebooks n ON n.id = c.notebook_id
  WHERE 
    c.embedding IS NOT NULL
    AND 1 - (c.embedding <=> query_embedding) > match_threshold
    AND (exclude_notebook_id IS NULL OR c.notebook_id != exclude_notebook_id)
  GROUP BY c.notebook_id, n.title
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
