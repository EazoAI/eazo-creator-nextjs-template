import { TodoListPage } from "@/components/todo-list";
import { UserBadge } from "@/components/user-profile/user-badge";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-background">
      {/* Top-right user badge */}
      <header className="absolute right-4 top-4 z-10">
        <UserBadge />
      </header>

      {/* Main content */}
      <main>
        <TodoListPage />
      </main>
    </div>
  );
}
