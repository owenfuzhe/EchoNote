import React, { useState, useEffect, useRef } from "react";
import HomeView from "./components/HomeView";
import LibraryView from "./components/LibraryView";
import DocumentView from "./components/DocumentView";
import SearchView from "./components/SearchView";
import BottomNav from "./components/BottomNav";
import VoiceCapture from "./components/VoiceCapture";
import AIChat from "./components/AIChat";
import CaptureMenu from "./components/CaptureMenu";
import { useNoteStore } from "./store/note-store";
import { summarizeUrl } from "./services/search";

export default function App() {
  const [currentView, setCurrentView] = useState("home");
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [isVoiceCaptureOpen, setIsVoiceCaptureOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [isCaptureMenuOpen, setIsCaptureMenuOpen] = useState(false);
  const [isCaptureLoading, setIsCaptureLoading] = useState(false);
  const { fetchNotes, createNote } = useNoteStore();

  // 文件和图片输入 ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  // 初始化时加载笔记
  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleNavigate = (view: string, noteId?: string) => {
    if (noteId) {
      setSelectedNoteId(noteId);
    }
    setCurrentView(view);
  };

  // 处理语音转录完成
  const handleTranscriptionComplete = async (text: string) => {
    // 创建新笔记
    const id = await createNote({
      title: text.slice(0, 20) + (text.length > 20 ? "..." : ""),
      content: text,
      type: "voice",
    });

    setIsVoiceCaptureOpen(false);
    handleNavigate("document", id);
  };

  // 处理文件捕获 - 支持 PDF 和音频
  const handleFileCapture = (type?: "pdf" | "audio") => {
    if (type === "audio") {
      audioInputRef.current?.click();
    } else {
      fileInputRef.current?.click();
    }
  };

  // 处理文件选择
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await readFileAsText(file);
      const title = file.name.replace(/\.[^/.]+$/, ""); // 移除扩展名

      const id = await createNote({
        title,
        content: text || "【文件内容为空】",
        type: "text",
        tags: [getFileTypeTag(file.name)],
      });

      handleNavigate("document", id);
    } catch (error) {
      console.error("File read error:", error);
      alert("读取文件失败，请重试");
    }

    // 清空 input 值以允许重复选择同一文件
    e.target.value = "";
  };

  // 处理图片捕获
  const handleImageCapture = () => {
    imageInputRef.current?.click();
  };

  // 处理图片选择
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // 读取图片为 base64
      const imageDataUrl = await readFileAsDataURL(file);

      // Mock OCR - 提取文字（后续接入真实 API）
      const extractedText = await mockOCR(file);

      const id = await createNote({
        title: `图片笔记 - ${new Date().toLocaleDateString()}`,
        content: extractedText
          ? `## 图片内容\n\n![图片](${imageDataUrl})\n\n## 识别的文字\n\n${extractedText}`
          : `## 图片内容\n\n![图片](${imageDataUrl})\n\n> 暂无识别文字`,
        type: "text",
        tags: ["图片"],
      });

      handleNavigate("document", id);
    } catch (error) {
      console.error("Image process error:", error);
      alert("处理图片失败，请重试");
    }

    // 清空 input 值
    e.target.value = "";
  };

  // 处理链接捕获
  const handleLinkCapture = (url?: string) => {
    if (url) {
      // 直接处理 URL
      handleLinkSubmit(url);
    } else {
      // 打开 CaptureMenu，让用户选择网站选项
      setIsCaptureMenuOpen(true);
    }
  };

  // 处理 YouTube 捕获
  const handleYoutubeCapture = async (url: string) => {
    setIsCaptureLoading(true);
    setIsCaptureMenuOpen(false);

    try {
      // 这里可以调用 YouTube 相关的 API
      // 暂时使用链接抓取功能
      const result = await summarizeUrl(url);

      if (result.success && result.data) {
        const id = await createNote({
          title: `YouTube: ${extractTitleFromUrl(url)}`,
          content: result.data,
          type: "link",
          sourceUrl: url,
          tags: ["YouTube"],
        });

        handleNavigate("document", id);
      } else {
        alert(result.error?.message || "抓取 YouTube 内容失败");
      }
    } catch (error) {
      console.error("YouTube capture error:", error);
      alert("抓取 YouTube 内容失败，请检查链接是否有效");
    } finally {
      setIsCaptureLoading(false);
    }
  };

  // 处理文字捕获
  const handleTextCapture = async (text: string) => {
    setIsCaptureMenuOpen(false);

    const title = text.slice(0, 30) + (text.length > 30 ? "..." : "");
    const id = await createNote({
      title,
      content: text,
      type: "text",
    });

    handleNavigate("document", id);
  };

  // 处理链接提交
  const handleLinkSubmit = async (url: string) => {
    setIsCaptureLoading(true);
    setIsCaptureMenuOpen(false);

    try {
      const result = await summarizeUrl(url);

      if (result.success && result.data) {
        const id = await createNote({
          title: extractTitleFromUrl(url),
          content: result.data,
          type: "link",
          sourceUrl: url,
          tags: ["链接收藏"],
        });

        handleNavigate("document", id);
      } else {
        alert(result.error?.message || "抓取网页内容失败");
      }
    } catch (error) {
      console.error("Link capture error:", error);
      alert("抓取网页内容失败，请检查链接是否有效");
    } finally {
      setIsCaptureLoading(false);
    }
  };

  // 辅助函数：读取文件为文本
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  // 辅助函数：读取文件为 DataURL
  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // 辅助函数：根据文件名获取文件类型标签
  const getFileTypeTag = (filename: string): string => {
    const ext = filename.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "pdf":
        return "PDF";
      case "doc":
      case "docx":
        return "Word";
      case "txt":
        return "文本";
      default:
        return "文件";
    }
  };

  // 辅助函数：Mock OCR（后续接入真实 API）
  const mockOCR = async (file: File): Promise<string> => {
    // 模拟 OCR 处理延迟
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Mock 返回一些示例文字
    return `【图片中的文字识别结果】

此处将显示从图片中提取的文字内容。

当前使用 Mock 数据，后续将接入真实 OCR API。

图片信息：
- 文件名：${file.name}
- 大小：${(file.size / 1024).toFixed(2)} KB
- 类型：${file.type || "未知"}
`;
  };

  // 处理音频选择
  const handleAudioSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const title = file.name.replace(/\.[^/.]+$/, "");

      const id = await createNote({
        title,
        content: `【音频文件】\n\n文件名：${file.name}\n大小：${(file.size / 1024 / 1024).toFixed(2)} MB\n类型：${file.type || "未知"}\n\n> 音频内容暂不支持自动转录`,
        type: "text",
        tags: ["音频"],
      });

      handleNavigate("document", id);
    } catch (error) {
      console.error("Audio process error:", error);
      alert("处理音频文件失败，请重试");
    }

    e.target.value = "";
  };
  const extractTitleFromUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.replace(/^www\./, "");
      return `来自 ${hostname} 的收藏`;
    } catch {
      return "链接收藏";
    }
  };

  return (
    <div className="h-[100dvh] bg-gray-100 text-gray-900 font-sans flex justify-center overflow-hidden">
      <div className="w-full max-w-md bg-[#f8f8f9] h-full relative shadow-2xl overflow-hidden flex flex-col">
        {/* Main Content */}
        {currentView === "home" && (
          <HomeView onNavigate={handleNavigate} />
        )}
        {currentView === "library" && (
          <LibraryView onNavigate={handleNavigate} />
        )}
        {currentView === "document" && (
          <DocumentView 
            onNavigate={handleNavigate} 
            noteId={selectedNoteId}
          />
        )}
        {currentView === "search" && (
          <SearchView
            onNavigate={handleNavigate}
            onClose={() => setCurrentView("home")}
          />
        )}

        {/* Bottom Navigation */}
        <BottomNav
          currentView={currentView}
          onNavigate={setCurrentView}
          onAIChat={() => setIsAIChatOpen(true)}
          onVoiceCapture={() => setIsVoiceCaptureOpen(true)}
          onCaptureMenu={() => setIsCaptureMenuOpen(true)}
          onSearch={() => setCurrentView("search")}
        />

        {/* Voice Capture Overlay */}
        <VoiceCapture
          isOpen={isVoiceCaptureOpen}
          onClose={() => setIsVoiceCaptureOpen(false)}
          onTranscriptionComplete={handleTranscriptionComplete}
        />

        {/* AI Chat Modal */}
        <AIChat
          isOpen={isAIChatOpen}
          onClose={() => setIsAIChatOpen(false)}
        />

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Hidden Image Input */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />

        {/* Hidden Audio Input */}
        <input
          ref={audioInputRef}
          type="file"
          accept="audio/*"
          onChange={handleAudioSelect}
          className="hidden"
        />

        {/* Capture Menu */}
        <CaptureMenu
          isOpen={isCaptureMenuOpen}
          onClose={() => setIsCaptureMenuOpen(false)}
          onFileCapture={handleFileCapture}
          onImageCapture={handleImageCapture}
          onLinkCapture={handleLinkCapture}
          onYoutubeCapture={handleYoutubeCapture}
          onTextCapture={handleTextCapture}
          isLoading={isCaptureLoading}
        />
      </div>
    </div>
  );
}
