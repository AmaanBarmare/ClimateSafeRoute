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
  const trackOn =
    color === "green"
      ? "bg-emerald-500 dark:bg-emerald-400"
      : "bg-slate-500 dark:bg-slate-400";
  const trackOff = "bg-slate-300 dark:bg-slate-700";
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
          checked ? trackOn : trackOff
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </span>
      <span className="text-sm transition-colors text-slate-700 group-hover:text-slate-900 dark:text-slate-200 dark:group-hover:text-slate-50">
        {label}
      </span>
    </button>
  );
}
