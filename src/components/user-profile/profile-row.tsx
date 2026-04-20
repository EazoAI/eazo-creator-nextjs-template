type ProfileRowProps = {
  label: string;
  value: string;
  mono?: boolean;
};

export function ProfileRow({ label, value, mono }: ProfileRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5">
      <span className="text-xs text-stone-400">{label}</span>
      <span
        className={`max-w-[60%] truncate text-right text-xs font-medium text-stone-700 ${mono ? "font-mono" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
