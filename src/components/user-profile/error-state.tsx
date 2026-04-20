import { AlertCircleIcon } from "./icons";

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-4 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-red-50">
        <AlertCircleIcon className="size-6 text-red-400" />
      </div>
      <p className="text-sm font-medium text-stone-700">Failed to load profile</p>
      <p className="text-xs text-stone-400">{message}</p>
    </div>
  );
}
