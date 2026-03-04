'use client'

import { useState } from 'react'
import { Search, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SearchPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Top Tab Bar */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4">
        <div className="flex items-center justify-around h-12">
          <button 
            className="flex-1 text-center text-gray-500 dark:text-gray-400 pb-3 pt-3"
            onClick={() => router.push('/')}
          >
            主页
          </button>
          <button 
            className="flex-1 text-center text-gray-500 dark:text-gray-400 pb-3 pt-3"
            onClick={() => router.push('/notes')}
          >
            资料库
          </button>
          <button className="flex-1 text-center text-gray-500 dark:text-gray-400 pb-3 pt-3">
            待办
          </button>
        </div>
      </div>

      {/* Search Header */}
      <div className="px-4 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-500">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索笔记、标签..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
          </div>
        </div>
      </div>

      {/* Search Results */}
      <div className="px-4 py-4">
        {query ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            搜索 "{query}" 的结果将显示在这里
          </p>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            输入关键词开始搜索
          </p>
        )}
      </div>
    </div>
  )
}