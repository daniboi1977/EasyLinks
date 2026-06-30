'use client';

import { useEffect, useState } from 'react';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function SearchBar({ value, onChange }: Props) {
  const [local, setLocal] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => onChange(local), 300);
    return () => clearTimeout(timer);
  }, [local, onChange]);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  return (
    <input
      type="search"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      placeholder="Search bookmarks..."
      className="w-full rounded-lg border border-gray-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-600 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-600"
    />
  );
}
