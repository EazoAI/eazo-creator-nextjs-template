export function LoadingState() {
  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <div className="size-14 animate-pulse rounded-full bg-stone-100" />
      <div className="h-4 w-32 animate-pulse rounded-md bg-stone-100" />
      <div className="h-3 w-48 animate-pulse rounded-md bg-stone-100" />
    </div>
  );
}
