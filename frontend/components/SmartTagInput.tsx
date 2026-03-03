'use client';

import { useState } from 'react';
import { X, Plus, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SmartTagProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  noteContent?: string;
}

export function SmartTagInput({ tags, onTagsChange, noteContent }: SmartTagProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);

  // Add new tag
  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      onTagsChange([...tags, newTag.trim()]);
      setNewTag('');
    }
    setIsAdding(false);
  };

  // Remove tag
  const removeTag = (tagToRemove: string) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove));
  };

  // Generate AI suggested tags
  const generateSuggestedTags = async () => {
    if (!noteContent) return;
    
    setIsGenerating(true);
    try {
      const response = await fetch('http://localhost:8000/api/ai/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: noteContent }),
      });
      
      if (!response.ok) throw new Error('Failed to generate tags');
      
      const result = await response.json();
      const newSuggestions = result.tags.filter((tag: string) => !tags.includes(tag));
      setSuggestedTags(newSuggestions);
    } catch (error) {
      console.error('Tag generation failed:', error);
      // Fallback suggestions
      setSuggestedTags(['工作', '会议', '重要']);
    } finally {
      setIsGenerating(false);
    }
  };

  // Add suggested tag
  const addSuggestedTag = (tag: string) => {
    if (!tags.includes(tag)) {
      onTagsChange([...tags, tag]);
    }
    setSuggestedTags(suggestedTags.filter(t => t !== tag));
  };

  return (
    <div className="space-y-2">
      {/* Current Tags */}
      <div className="flex flex-wrap gap-2">
        {tags.map(tag => (
          <span 
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-sm"
          >
            #{tag}
            <button 
              onClick={() => removeTag(tag)}
              className="hover:text-red-500 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        
        {/* Add Tag Button */}
        {isAdding ? (
          <div className="flex items-center gap-1">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTag()}
              placeholder="标签名"
              className="h-7 w-24 text-sm"
              autoFocus
            />
            <Button size="sm" variant="ghost" onClick={addTag} className="h-7 px-2">
              确定
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)} className="h-7 px-2">
              取消
            </Button>
          </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-1 px-2 py-1 border border-dashed border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 rounded-full text-sm hover:border-indigo-500 hover:text-indigo-500 transition-colors"
          >
            <Plus className="w-3 h-3" />
            添加标签
          </button>
        )}
      </div>

      {/* AI Suggested Tags */}
      <div className="flex items-center gap-2">
        <Button 
          size="sm" 
          variant="outline" 
          onClick={generateSuggestedTags}
          disabled={isGenerating}
          className="text-xs"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <Sparkles className="w-3 h-3 mr-1" />
              AI 推荐标签
            </>
          )}
        </Button>
        
        {suggestedTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {suggestedTags.map(tag => (
              <button
                key={tag}
                onClick={() => addSuggestedTag(tag)}
                className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded text-xs hover:bg-indigo-100 hover:text-indigo-600 transition-colors"
              >
                + {tag}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}