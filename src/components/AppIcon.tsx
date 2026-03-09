export default function AppIcon() {
  return (
    <div className="w-8 h-8 rounded-xl bg-teal-500 shadow-sm flex items-center justify-center overflow-hidden relative">
      <svg viewBox="0 0 100 100" className="w-full h-full p-1.5 absolute">
        <path
          d="M20,20 L80,80 M20,80 L80,20"
          stroke="#fcd34d"
          strokeWidth="24"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
