'use client';

import { useState } from 'react';
import type { BookmarkWithTopics, AnalyzeResult, ContentType } from '@/types';

interface Props {
  initialValues?: Partial<BookmarkWithTopics>;
  onSubmit: (data: {
    url: string;
    title: string;
    summary: string;
    topics: string[];
    content_type: ContentType;
  }) => Promise<void>;
  onCancel: () => void;
}

type InputMode = 'url' | 'file';

export default function BookmarkForm({ initialValues, onSubmit, onCancel }: Props) {
  const isEditing = !!initialValues?.id;

  const [inputMode, setInputMode] = useState<InputMode>('url');
  const [url, setUrl] = useState(initialValues?.url ?? '');
  const [fileUrl, setFileUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [summary, setSummary] = useState(initialValues?.summary ?? '');
  const [topicsStr, setTopicsStr] = useState((initialValues?.topics ?? []).join(', '));
  const [contentType, setContentType] = useState<ContentType>(initialValues?.content_type ?? 'article');
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState('');
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleAnalyze() {
    setAnalyzing(true);
    setAnalyzeError('');
    try {
      let res: Response;

      if (inputMode === 'file') {
        if (!selectedFile) {
          setAnalyzeError('Please select a file first.');
          return;
        }
        const fd = new FormData();
        fd.append('file', selectedFile);
        res = await fetch('/api/analyze', { method: 'POST', body: fd });
      } else {
        const body = showPasteArea ? { pastedText } : { url };
        res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }

      const data = await res.json();

      if (data.error === 'blocked') {
        setShowPasteArea(true);
        setAnalyzeError('This platform blocks automated fetches. Paste the post text below and click Analyze again.');
        return;
      }

      if (!res.ok) {
        setAnalyzeError(data.message ?? 'Analysis failed');
        return;
      }

      const result = data as AnalyzeResult & { contentType: ContentType; fileUrl?: string };
      setTitle(result.title);
      setSummary(result.summary);
      setTopicsStr(result.topics.join(', '));
      setContentType(result.contentType ?? 'article');
      if (result.fileUrl) setFileUrl(result.fileUrl);
    } catch {
      setAnalyzeError('Network error during analysis');
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const topics = topicsStr.split(',').map((t) => t.trim()).filter(Boolean);
      const submitUrl = inputMode === 'file' ? fileUrl : url;
      await onSubmit({ url: submitUrl, title, summary, topics, content_type: contentType });
    } finally {
      setSubmitting(false);
    }
  }

  const canAnalyze = inputMode === 'file' ? !!selectedFile : !!url;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {!isEditing && (
        <>
          <div className="flex gap-1 rounded-lg border border-gray-200 dark:border-zinc-700 p-1 w-fit">
            <button
              type="button"
              onClick={() => { setInputMode('url'); setAnalyzeError(''); }}
              className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                inputMode === 'url' ? 'bg-gray-900 dark:bg-zinc-200 text-white dark:text-zinc-900' : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
              }`}
            >
              URL
            </button>
            <button
              type="button"
              onClick={() => { setInputMode('file'); setAnalyzeError(''); setShowPasteArea(false); }}
              className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                inputMode === 'file' ? 'bg-gray-900 dark:bg-zinc-200 text-white dark:text-zinc-900' : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
              }`}
            >
              File (PDF / Image)
            </button>
          </div>

          {inputMode === 'url' ? (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-zinc-300">URL</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  required={inputMode === 'url'}
                  className="flex-1 rounded border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                />
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={analyzing || !canAnalyze}
                  className="rounded bg-blue-600 dark:bg-zinc-200 px-3 py-2 text-sm text-white dark:text-zinc-900 hover:bg-blue-700 dark:hover:bg-zinc-100 disabled:opacity-50"
                >
                  {analyzing ? 'Analyzing…' : 'Analyze'}
                </button>
              </div>

              {showPasteArea && (
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste the post text here…"
                  rows={4}
                  className="rounded border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                />
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-zinc-300">File</label>
              <div className="flex gap-2">
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) => {
                    setSelectedFile(e.target.files?.[0] ?? null);
                    setFileUrl('');
                    setTitle('');
                    setSummary('');
                    setTopicsStr('');
                  }}
                  className="flex-1 rounded border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-gray-700 dark:text-zinc-300 file:mr-2 file:rounded file:border-0 file:bg-gray-100 dark:file:bg-zinc-700 dark:file:text-zinc-300 file:px-2 file:py-1 file:text-xs focus:outline-none focus:ring-2 focus:ring-zinc-400"
                />
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={analyzing || !canAnalyze}
                  className="rounded bg-blue-600 dark:bg-zinc-200 px-3 py-2 text-sm text-white dark:text-zinc-900 hover:bg-blue-700 dark:hover:bg-zinc-100 disabled:opacity-50"
                >
                  {analyzing ? 'Analyzing…' : 'Analyze'}
                </button>
              </div>
              {fileUrl && (
                <p className="text-xs text-green-600">File uploaded and analyzed.</p>
              )}
            </div>
          )}

          {analyzeError && <p className="text-xs text-red-600">{analyzeError}</p>}
        </>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700 dark:text-zinc-300">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="rounded border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700 dark:text-zinc-300">Summary</label>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={3}
          className="rounded border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700 dark:text-zinc-300">Topics (comma-separated)</label>
        <input
          type="text"
          value={topicsStr}
          onChange={(e) => setTopicsStr(e.target.value)}
          placeholder="Machine Learning, Climate Change"
          className="rounded border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
        />
      </div>

      {!isEditing && (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-zinc-300">Content type</label>
          <select
            value={contentType}
            onChange={(e) => setContentType(e.target.value as ContentType)}
            className="rounded border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
          >
            <option value="article">Article</option>
            <option value="youtube">YouTube</option>
            <option value="social">Social</option>
            <option value="pdf">PDF</option>
            <option value="image">Image</option>
            <option value="repo">Repo</option>
          </select>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-gray-300 dark:border-zinc-700 dark:text-zinc-300 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-zinc-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || (inputMode === 'file' && !fileUrl && !isEditing)}
          className="rounded bg-blue-600 dark:bg-zinc-200 px-4 py-2 text-sm text-white dark:text-zinc-900 hover:bg-blue-700 dark:hover:bg-zinc-100 disabled:opacity-50"
        >
          {submitting ? 'Saving…' : isEditing ? 'Save changes' : 'Add bookmark'}
        </button>
      </div>
    </form>
  );
}
