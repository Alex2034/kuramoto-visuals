"use client";

interface AnimationControlsProps {
  currentFrame: number;
  totalFrames: number;
  isPlaying: boolean;
  onFrameChange: (frame: number) => void;
  onPlayPause: () => void;
}

export default function AnimationControls({
  currentFrame,
  totalFrames,
  isPlaying,
  onFrameChange,
  onPlayPause,
}: AnimationControlsProps) {
  if (totalFrames === 0) return null;

  return (
    <div className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <button
        onClick={onPlayPause}
        className="rounded-md bg-gray-200 px-3 py-1 text-sm font-medium hover:bg-gray-300"
      >
        {isPlaying ? "Pause" : "Play"}
      </button>
      <input
        type="range"
        min={0}
        max={totalFrames - 1}
        value={currentFrame}
        onChange={(e) => onFrameChange(parseInt(e.target.value, 10))}
        className="flex-1"
      />
      <span className="text-sm text-gray-600">
        {currentFrame + 1} / {totalFrames}
      </span>
    </div>
  );
}
