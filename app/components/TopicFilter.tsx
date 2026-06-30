'use client';

interface Props {
  topics: string[];
  selected: string | null;
  onSelect: (topic: string | null) => void;
}

export default function TopicFilter({ topics, selected, onSelect }: Props) {
  return (
    <aside className="w-full md:w-56 shrink-0">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-500">Topics</h2>
      <ul className="space-y-1">
        <li>
          <button
            onClick={() => onSelect(null)}
            className={`w-full rounded px-3 py-1.5 text-left text-sm ${
              selected === null ? 'bg-gray-200 dark:bg-zinc-800 font-medium text-gray-900 dark:text-white' : 'text-gray-700 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
            }`}
          >
            All bookmarks
          </button>
        </li>
        {topics.map((topic) => (
          <li key={topic}>
            <button
              onClick={() => onSelect(selected === topic ? null : topic)}
              className={`w-full rounded px-3 py-1.5 text-left text-sm ${
                selected === topic ? 'bg-gray-200 dark:bg-zinc-800 font-medium text-gray-900 dark:text-white' : 'text-gray-700 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
              }`}
            >
              {topic}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
