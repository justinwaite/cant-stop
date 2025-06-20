import { useState } from 'react';

interface MenuProps {
  onChangeColor: () => void;
}

export function Menu({ onChangeColor }: MenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 bg-white dark:bg-black border-2 border-gray-700 dark:border-white text-gray-700 dark:text-white rounded-lg p-2 cursor-pointer shadow-lg dark:shadow-white/20 flex items-center justify-center w-10 h-10"
        aria-label="Menu"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Menu dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40"
          />

          {/* Menu content */}
          <div className="fixed top-18 left-4 z-50 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-lg shadow-lg dark:shadow-black/50 min-w-40 overflow-hidden">
            <button
              onClick={() => {
                onChangeColor();
                setIsOpen(false);
              }}
              className="w-full px-4 py-3 bg-none border-none text-left cursor-pointer text-sm text-gray-700 dark:text-gray-200 border-b border-gray-200 dark:border-gray-600 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="13.5" cy="6.5" r=".5" />
                <circle cx="17.5" cy="10.5" r=".5" />
                <circle cx="8.5" cy="7.5" r=".5" />
                <circle cx="6.5" cy="12.5" r=".5" />
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
              </svg>
              Change Color
            </button>
          </div>
        </>
      )}
    </>
  );
}
