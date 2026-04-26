"use client";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: () => void;
  label: string;
  color?: "slate" | "green";
}

export default function ToggleSwitch({
  checked,
  onChange,
  label,
  color = "slate",
}: ToggleSwitchProps) {
  const trackOn = color === "green" ? "bg-green-500" : "bg-slate-400";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className="flex items-center gap-3 group"
    >
      <span
        className={`relative w-10 h-6 rounded-full transition-colors ${
          checked ? trackOn : "bg-slate-700"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </span>
      <span className="text-sm text-slate-200 group-hover:text-slate-50 transition-colors">
        {label}
      </span>
    </button>
  );
}
