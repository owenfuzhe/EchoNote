-- 添加标签列到 notebooks 表
ALTER TABLE notebooks ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- 创建标签索引
CREATE INDEX IF NOT EXISTS notebooks_tags_idx ON notebooks USING GIN (tags);

-- 创建函数：根据内容自动生成标签
CREATE OR REPLACE FUNCTION auto_tag_notebook(notebook_id uuid)
RETURNS text[]
LANGUAGE plpgsql
AS $$
DECLARE
  content_text text;
  extracted_tags text[];
BEGIN
  SELECT string_agg(
    CASE 
      WHEN c.type = 'text' THEN c.content::text
      WHEN c.type = 'voice' THEN COALESCE(c.content->>'transcription', '')
      WHEN c.type = 'ai_output' THEN COALESCE(c.content->>'content', '')
      WHEN c.type = 'link' THEN COALESCE(c.content->>'title', '') || ' ' || COALESCE(c.content->>'content', '')
      ELSE ''
    END, ' '
  ) INTO content_text
  FROM cells c
  WHERE c.notebook_id = auto_tag_notebook.notebook_id;
  
  extracted_tags := ARRAY[]::text[];
  
  IF content_text ~* 'ai|人工智能|机器学习|深度学习|gpt|llm|chatgpt' THEN
    extracted_tags := array_append(extracted_tags, 'AI');
  END IF;
  
  IF content_text ~* '创业|商业模式|融资|投资|startup' THEN
    extracted_tags := array_append(extracted_tags, '创业');
  END IF;
  
  IF content_text ~* '产品|设计|ux|ui|用户|需求' THEN
    extracted_tags := array_append(extracted_tags, '产品');
  END IF;
  
  IF content_text ~* '技术|代码|开发|编程|api|架构' THEN
    extracted_tags := array_append(extracted_tags, '技术');
  END IF;
  
  IF content_text ~* '读书|阅读|书评|笔记|学习' THEN
    extracted_tags := array_append(extracted_tags, '阅读');
  END IF;
  
  IF content_text ~* '会议|讨论|决策|项目|任务' THEN
    extracted_tags := array_append(extracted_tags, '工作');
  END IF;
  
  IF content_text ~* '想法|灵感|创意|思考' THEN
    extracted_tags := array_append(extracted_tags, '灵感');
  END IF;
  
  IF content_text ~* '生活|日常|记录|日记' THEN
    extracted_tags := array_append(extracted_tags, '生活');
  END IF;
  
  UPDATE notebooks SET tags = extracted_tags WHERE id = notebook_id;
  
  RETURN extracted_tags;
END;
$$;

-- 创建函数：获取所有标签及其使用次数
CREATE OR REPLACE FUNCTION get_all_tags()
RETURNS TABLE (tag text, count bigint)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    unnest(tags) as tag,
    COUNT(*) as count
  FROM notebooks
  WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
  GROUP BY unnest(tags)
  ORDER BY count DESC;
END;
$$;

-- 创建函数：按标签搜索笔记
CREATE OR REPLACE FUNCTION search_by_tag(search_tag text)
RETURNS TABLE (
  id uuid,
  title text,
  cover_color text,
  updated_at timestamptz,
  tags text[]
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.id,
    n.title,
    n.cover_color,
    n.updated_at,
    n.tags
  FROM notebooks n
  WHERE search_tag = ANY(n.tags)
  ORDER BY n.updated_at DESC;
END;
$$;
