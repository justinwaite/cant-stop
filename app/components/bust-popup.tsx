export function BustPopup() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className="px-8 py-6 rounded-lg shadow-lg text-4xl font-bold animate-pulse"
        style={{ background: '#DF4A2B', color: '#FBF0E3' }}
      >
        BUST!
      </div>
    </div>
  );
}
