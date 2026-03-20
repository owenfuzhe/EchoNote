# EchoNote Coze Workflow 设计草案

## 目标

这份文档回答 4 个问题：

1. 如果 EchoNote 先接 Coze，哪些能力应该做成 workflow
2. 哪些能力不该做成 workflow，而应该走 bot chat
3. 每个能力建议用什么模型档位
4. 每个能力的 System Prompt 应该怎么写

当前目标仍然是：

`导入内容 -> AI 整理 -> 保存 / 回看 -> 继续探索`

所以 Coze 只应该是后端的一个 `provider`，不能把产品层直接绑死在 Coze 上。

## 核心建议

MVP 阶段不要做一个“大而全”的 Coze workflow。

建议拆成：

1. 一个 `chat bot`
2. 六个 workflow

也就是：

- `chat`
- `quick-read`
- `explore-questions`
- `article-to-note`
- `voice-clean`
- `briefing.generate`
- `podcast.generate`

其中：

- `chat` 走 `Coze Bot Chat`
- 其余 6 个能力走 `Coze Workflow`

## 为什么 chat 不建议做成 workflow

原因很简单：

1. `chat` 天然是多轮对话
2. `chat` 更适合保留 conversation 上下文
3. `chat` 返回的是自然语言，不是固定 JSON 产物
4. EchoNote 当前的其他能力更偏“固定 schema 输出”，更适合 workflow

所以建议：

- `chat`：一个专门的 Coze Bot
- `quick-read / explore / article-to-note / voice-clean / briefing / podcast`：一个能力一个 workflow

## 推荐环境变量

后端后续如果接 Coze，我建议用下面这组配置：

- `AI_PROVIDER=coze`
- `COZE_API_TOKEN`
- `COZE_API_BASE`
- `COZE_BOT_ID_CHAT`
- `COZE_WORKFLOW_QUICK_READ`
- `COZE_WORKFLOW_EXPLORE`
- `COZE_WORKFLOW_ARTICLE_TO_NOTE`
- `COZE_WORKFLOW_VOICE_CLEAN`
- `COZE_WORKFLOW_BRIEFING`
- `COZE_WORKFLOW_PODCAST`

## 你需要提供给我的信息

等你在 Coze 平台上把 bot 和 workflows 配好后，最后只需要把下面这些值给我：

1. `COZE_API_TOKEN`
2. `COZE_API_BASE`
3. `COZE_BOT_ID_CHAT`
4. `COZE_WORKFLOW_QUICK_READ`
5. `COZE_WORKFLOW_EXPLORE`
6. `COZE_WORKFLOW_ARTICLE_TO_NOTE`
7. `COZE_WORKFLOW_VOICE_CLEAN`
8. `COZE_WORKFLOW_BRIEFING`
9. `COZE_WORKFLOW_PODCAST`

如果你不确定 `COZE_API_BASE`：

- 中国区通常用 `COZE_CN_BASE_URL` 对应的地址
- 国际区通常用 `COZE_COM_BASE_URL` 对应的地址

我在代码里已经支持你显式传 `COZE_API_BASE`，所以你只要把控制台对应区域的 base 给我就行。

## Workflow 参数约定

为了让后端直接对接，你在 Coze Workflow 里最好按下面的输入参数名配置：

### quick-read

输入参数：

- `title`
- `content`
- `topic`
- `items`

### explore-questions

输入参数：

- `title`
- `topic`
- `content`
- `items`

### article-to-note

输入参数：

- `title`
- `content`
- `sourceUrl`
- `items`

### voice-clean

输入参数：

- `title`
- `transcript`

### briefing.generate

输入参数：

- `title`
- `items`

### podcast.generate

输入参数：

- `title`
- `voicePreset`
- `items`

其中 `items` 会是一个数组，每项结构是：

```json
{
  "id": "item_1",
  "title": "string",
  "content": "string",
  "url": "string"
}
```

## Workflow 输出约定

每个 workflow 的最终输出节点都建议直接返回一个 JSON object，不要返回 markdown，不要返回解释文本。

## 模型建议

下面的模型建议是基于 EchoNote 当前能力形态做的推断，不是 Coze 官方强制名单。

实际在 Coze 控制台里，模型名称可能会随 workspace、区域和账号权限变化。

如果你在 Coze 中国区能选到豆包系模型，我建议 MVP 先按两档来：

- 高质量主模型：`豆包 1.5 Pro` 同档
- 低成本快模型：`豆包 1.5 Lite` 同档

如果你的控制台里模型名字略有不同，就按这两个档位映射：

- `Pro` 档：用于需要更好结构化、归纳和多源综合的能力
- `Lite` 档：用于清洗、抽取、轻总结

## 能力拆分

### 1. chat

类型：

- `bot`

建议模型：

- 主推：`Pro`

原因：

- 需要更自然的对话体验
- 需要更稳定地基于最近笔记回答
- 需要更好地处理“用户追问”

建议输入：

- `messages`
- `recent_notes_context`
- `current_note_context`（可选）
- `tone`（可选）

System Prompt：

```text
你是 EchoNote 的 AI 助手。

你的任务不是泛泛聊天，而是基于用户最近的笔记、文章摘录和收藏内容，帮助用户：
1. 理解信息
2. 收束观点
3. 提出下一步行动

回答要求：
1. 优先使用提供的上下文，不要编造不存在的来源
2. 如果上下文不足，要明确说信息不够，并建议补什么
3. 默认使用中文
4. 输出尽量短、清晰、可执行
5. 不要暴露模型、平台、供应商细节
```

### 2. quick-read

类型：

- `workflow`

建议模型：

- MVP 推荐：`Lite`
- 如果摘要质量不够，再升到 `Pro`

原因：

- 这是轻摘要能力
- 输入一般是单篇文章或少量材料
- 对速度和成本比对话质感更敏感

建议输入：

- `title`
- `content`
- `items[]`

目标输出：

```json
{
  "headline": "string",
  "summary": "string",
  "bullets": ["string"],
  "readMinutes": 4,
  "sourceCount": 1
}
```

System Prompt：

```text
你是 EchoNote 的快速消化助手。

请把输入内容压缩成一份适合移动端首页展示的快读结果。

要求：
1. 只返回 JSON
2. headline 要像标题，不要超过 24 个汉字
3. summary 用 1 到 2 句话概括最值得知道的判断
4. bullets 返回 3 条以内，每条一句话
5. readMinutes 按普通人阅读所需时间估计
6. sourceCount 返回输入材料数
7. 不要输出 markdown，不要解释
```

### 3. explore-questions

类型：

- `workflow`

建议模型：

- 主推：`Pro`

原因：

- 这个能力的核心不是摘要，而是“提问质量”
- 比起快读，它更依赖模型的抽象和发散能力

建议输入：

- `topic`
- `content`
- `items[]`

目标输出：

```json
{
  "topic": "string",
  "hook": "string",
  "questions": ["string"],
  "nextStep": "string"
}
```

System Prompt：

```text
你是 EchoNote 的探索问题生成助手。

请根据输入内容，为用户提出下一步最值得追问的问题，而不是重复总结原文。

要求：
1. 只返回 JSON
2. topic 是当前主题名
3. hook 用一句话说明“为什么值得继续探索”
4. questions 返回 3 到 4 个真正能推进理解的问题
5. nextStep 只给一个最建议执行的动作
6. 问题要具体，不要空泛
7. 不要输出 markdown，不要解释
```

### 4. article-to-note

类型：

- `workflow`

建议模型：

- 主推：`Pro`

原因：

- 需要同时做结构化、抽重点、给标签和待办
- 质量波动会直接影响用户保存后的笔记体验

建议输入：

- `title`
- `content`
- `sourceUrl`

目标输出：

```json
{
  "title": "string",
  "summary": "string",
  "outline": ["string"],
  "highlights": ["string"],
  "todos": ["string"],
  "tags": ["string"]
}
```

System Prompt：

```text
你是 EchoNote 的文章结构化笔记助手。

请把输入文章整理成一篇适合收藏到知识库里的结构化笔记。

要求：
1. 只返回 JSON
2. title 是整理后的笔记标题
3. summary 用 2 句话内写出核心结论
4. outline 返回 3 到 5 个结构点
5. highlights 返回最值得保留的事实或判断
6. todos 返回后续可执行动作，没有就返回空数组
7. tags 返回 3 到 5 个短标签
8. 不要输出 markdown，不要解释
```

### 5. voice-clean

类型：

- `workflow`

建议模型：

- 主推：`Lite`

原因：

- 主要是清洗口语、补标点、提待办
- 成本应明显低于文章整理和探索

建议输入：

- `transcript`
- `title`（可选）

目标输出：

```json
{
  "title": "string",
  "cleanedText": "string",
  "summary": "string",
  "todos": ["string"],
  "tags": ["string"]
}
```

System Prompt：

```text
你是 EchoNote 的语音整理助手。

请把口语化转写结果整理成可读的笔记内容。

要求：
1. 只返回 JSON
2. cleanedText 要保留原意，但去掉明显口头禅、重复和无意义停顿
3. 不要凭空补充没说过的信息
4. summary 用一句话概括核心意思
5. todos 只提取明确行动项
6. tags 返回 2 到 4 个标签
7. 不要输出 markdown，不要解释
```

### 6. briefing.generate

类型：

- `workflow`

建议模型：

- 两段式更稳
- Node A：`Lite` 做单篇压缩
- Node B：`Pro` 做多源综合

原因：

- 这是典型的多材料聚合任务
- 直接一把梭容易结果发散

建议输入：

- `title`
- `items[]`

目标输出：

```json
{
  "title": "string",
  "summary": "string",
  "oneLiner": "string",
  "bullets": ["string"],
  "sections": [
    {
      "id": "string",
      "title": "string",
      "summary": "string",
      "keyPoint": "string"
    }
  ],
  "sourceCount": 3,
  "readMinutes": 4
}
```

System Prompt：

```text
你是 EchoNote 的深读简报助手。

请把多篇输入材料整理成一份适合“今日简报”页面展示的聚合结果。

要求：
1. 只返回 JSON
2. 不要逐篇复述，要先做综合判断
3. oneLiner 只用一句话说出这组内容最核心的结论
4. bullets 返回 3 到 4 条关键信号
5. sections 最多 4 个，每个 section 都要有 title、summary、keyPoint
6. sourceCount 返回输入材料数
7. readMinutes 估算阅读这份简报所需时间
8. 不要输出 markdown，不要解释
```

### 7. podcast.generate

类型：

- `workflow`

建议模型：

- 两段式更稳
- Node A：`Lite` 生成提纲
- Node B：`Pro` 写成播客脚本

原因：

- 当前 EchoNote 需要的是“播客脚本产物”，不是在 Coze 里直接做音频合成
- 先把脚本 schema 做稳，比直接接 TTS 更重要

建议输入：

- `title`
- `items[]`
- `voicePreset`

目标输出：

```json
{
  "title": "string",
  "summary": "string",
  "voicePreset": "string",
  "script": "string",
  "segments": [
    {
      "heading": "string",
      "text": "string"
    }
  ],
  "durationSeconds": 60,
  "sourceCount": 2
}
```

System Prompt：

```text
你是 EchoNote 的播客脚本助手。

请根据输入材料生成一版适合 1 到 3 分钟收听的中文播客脚本。

要求：
1. 只返回 JSON
2. script 要可直接朗读
3. segments 按自然口播结构拆成若干段
4. summary 用一句话说明这一期在讲什么
5. durationSeconds 估算口播时长
6. sourceCount 返回输入材料数
7. 不要输出 markdown，不要解释
```

## Workflow 结构建议

### 轻能力

适用于：

- `quick-read`
- `explore-questions`
- `article-to-note`
- `voice-clean`

推荐结构：

1. 输入节点
2. 文本归一化节点
3. LLM 节点
4. JSON 校验节点
5. 输出节点

### 重能力

适用于：

- `briefing.generate`
- `podcast.generate`

推荐结构：

1. 输入节点
2. 材料预压缩节点
3. 综合生成节点
4. JSON 校验节点
5. 输出节点

## EchoNote 当前最推荐的落地顺序

如果我们现在真要先接 Coze，我建议顺序是：

1. 先做 `chat bot`
2. 再做 `quick-read`
3. 再做 `article-to-note`
4. 再做 `explore-questions`
5. 再做 `voice-clean`
6. 最后做 `briefing.generate`
7. 最后做 `podcast.generate`

原因：

- `chat` 最容易直接被用户感知
- `quick-read` 和 `article-to-note` 最能体现“读完就有结构化产出”
- `briefing` 和 `podcast` 最重，应该放后面

## 一句话结论

如果 EchoNote 先接 Coze，最稳的做法不是“一个万能 workflow”，而是：

`1 个 chat bot + 6 个固定 schema workflow + 后端统一做 provider 抽象和结果校验`
