/**
 * 阿里云百炼语音转文字服务 (ASR) - Web 适配版
 * 文档: https://help.aliyun.com/zh/dashscope/developer-reference/model-sound-recording
 */

const BAILIAN_BASE_URL = 'https://dashscope.aliyuncs.com/api/v1'
const DEFAULT_MODEL = 'qwen-audio-asr'

export interface BailianASROptions {
  /** 模型名称，默认 qwen-audio-asr */
  model?: string
  /** 采样率，可选 */
  sampleRate?: number
}

export interface BailianASRResult {
  /** 转录文字 */
  text: string
  /** 识别完成时间 */
  timestamp: number
}

export class BailianASRError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly statusCode?: number
  ) {
    super(message)
    this.name = 'BailianASRError'
  }
}

/**
 * 将音频 Blob 转录为文字
 * @param audioBlob 音频文件 Blob
 * @param options 可选配置
 * @returns 转录结果
 */
export async function transcribe(
  audioBlob: Blob,
  options: BailianASROptions = {}
): Promise<BailianASRResult> {
  const apiKey = import.meta.env.VITE_BAILIAN_API_KEY
  if (!apiKey) {
    throw new BailianASRError(
      '缺少百炼 API Key，请在 .env 中设置 VITE_BAILIAN_API_KEY',
      'MISSING_API_KEY'
    )
  }

  const model = options.model || DEFAULT_MODEL

  // 读取音频文件为 base64
  let base64Audio: string
  try {
    base64Audio = await blobToBase64(audioBlob)
  } catch (err: any) {
    throw new BailianASRError(
      `读取音频文件失败: ${err?.message || String(err)}`,
      'FILE_READ_ERROR'
    )
  }

  // 准备请求体 - 使用百炼的 file 字段格式
  const requestBody = {
    model,
    input: {
      file: `data:audio/wav;base64,${base64Audio}`,
    },
  }

  // 发送请求
  let response: Response
  try {
    response = await fetch(`${BAILIAN_BASE_URL}/services/aigc/multimodal-generation/generation`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })
  } catch (err: any) {
    throw new BailianASRError(
      `网络请求失败: ${err?.message || String(err)}`,
      'NETWORK_ERROR'
    )
  }

  // 处理 HTTP 错误
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`
    let errorCode = 'API_ERROR'

    try {
      const errorData = await response.json()
      errorMessage = errorData.message || errorData.error?.message || errorMessage
      errorCode = errorData.code || errorData.error?.code || errorCode
    } catch {
      // 解析失败，使用默认错误信息
      const errorText = await response.text()
      if (errorText) {
        errorMessage += ` - ${errorText}`
      }
    }

    throw new BailianASRError(errorMessage, errorCode, response.status)
  }

  // 解析响应
  let data: any
  try {
    data = await response.json()
  } catch (err: any) {
    throw new BailianASRError(
      `解析响应失败: ${err?.message || String(err)}`,
      'PARSE_ERROR'
    )
  }

  // 检查业务错误
  if (data.code) {
    throw new BailianASRError(
      data.message || '未知错误',
      data.code,
      response.status
    )
  }

  // 提取转录文字
  const text = data.output?.text || data.output?.result || data.text
  if (!text) {
    throw new BailianASRError(
      '响应中缺少转录文字',
      'EMPTY_RESULT'
    )
  }

  return {
    text: text.trim(),
    timestamp: Date.now(),
  }
}

/**
 * 使用 FormData 方式上传音频文件（备用方案）
 */
export async function transcribeWithFormData(
  audioBlob: Blob,
  options: BailianASROptions = {}
): Promise<BailianASRResult> {
  const apiKey = import.meta.env.VITE_BAILIAN_API_KEY
  if (!apiKey) {
    throw new BailianASRError(
      '缺少百炼 API Key，请在 .env 中设置 VITE_BAILIAN_API_KEY',
      'MISSING_API_KEY'
    )
  }

  const model = options.model || DEFAULT_MODEL

  // 构建 FormData
  const formData = new FormData()
  formData.append('model', model)
  formData.append('file', audioBlob, 'audio.wav')

  // 发送请求
  let response: Response
  try {
    response = await fetch(`${BAILIAN_BASE_URL}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    })
  } catch (err: any) {
    throw new BailianASRError(
      `网络请求失败: ${err?.message || String(err)}`,
      'NETWORK_ERROR'
    )
  }

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`
    try {
      const errorData = await response.json()
      errorMessage = errorData.message || errorMessage
    } catch {
      const errorText = await response.text()
      if (errorText) errorMessage += ` - ${errorText}`
    }
    throw new BailianASRError(errorMessage, 'API_ERROR', response.status)
  }

  const data = await response.json()
  const text = data.text || data.output?.text

  if (!text) {
    throw new BailianASRError('响应中缺少转录文字', 'EMPTY_RESULT')
  }

  return {
    text: text.trim(),
    timestamp: Date.now(),
  }
}

/**
 * 检查百炼 ASR 服务是否可用
 */
export async function checkASRAvailability(): Promise<{
  available: boolean
  message: string
}> {
  const apiKey = import.meta.env.VITE_BAILIAN_API_KEY
  if (!apiKey) {
    return {
      available: false,
      message: '未配置百炼 API Key',
    }
  }

  // 简单检查 API Key 格式（百炼 Key 通常以 sk- 开头）
  if (!apiKey.startsWith('sk-')) {
    return {
      available: false,
      message: 'API Key 格式不正确，百炼 Key 应以 sk- 开头',
    }
  }

  return {
    available: true,
    message: '百炼 ASR 服务已配置',
  }
}

// 辅助函数：Blob 转 Base64
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result as string
      // 移除 data:audio/xxx;base64, 前缀
      resolve(base64.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// 默认导出
export default {
  transcribe,
  transcribeWithFormData,
  checkASRAvailability,
}
