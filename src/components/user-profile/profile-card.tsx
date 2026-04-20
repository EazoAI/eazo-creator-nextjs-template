import Image from "next/image";
import type { UserInfo } from "./types";
import { ProfileRow } from "./profile-row";

export function ProfileCard({ user }: { user: UserInfo }) {
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative">
        {user.avatarUrl ? (
          <Image
            src={user.avatarUrl}
            alt={user.nickname ?? "User avatar"}
            width={72}
            height={72}
            className="size-[72px] rounded-full object-cover ring-2 ring-stone-100"
          />
        ) : (
          <div className="flex size-[72px] items-center justify-center rounded-full bg-[#EE5C2A]/10 text-2xl font-semibold text-[#EE5C2A]">
            {(user.nickname ?? user.email ?? "?")[0].toUpperCase()}
          </div>
        )}
        <span className="absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-white bg-green-400" />
      </div>

      <div className="w-full text-center">
        <p className="text-lg font-semibold text-stone-900">
          {user.nickname ?? "—"}
        </p>
        {user.email && (
          <p className="mt-0.5 text-sm text-stone-500">{user.email}</p>
        )}
      </div>

      <div className="w-full divide-y divide-stone-100 rounded-xl border border-stone-100 bg-stone-50">
        <ProfileRow label="User ID" value={user.userId} mono />
        {user.lang && <ProfileRow label="Language" value={user.lang} />}
        {user.region && <ProfileRow label="Region" value={user.region} />}
        {user.createdAt && (
          <ProfileRow
            label="Joined"
            value={new Date(user.createdAt).toLocaleDateString()}
          />
        )}
      </div>
    </div>
  );
}
