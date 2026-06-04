-- カテゴリテーブル
create table categories (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null,
  name text not null,
  color text default '#6366f1',
  order_index integer default 0
);

-- タスクテーブル
create table todos (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null,
  category_id uuid,
  text text not null,
  done boolean default false,
  done_at timestamptz,
  order_index integer default 0,
  created_at timestamptz default now()
);

-- RLS（Row Level Security）を有効化
alter table categories enable row level security;
alter table todos enable row level security;

-- 全員に読み書きを許可（URLが「パスワード」の役割）
create policy "Allow all" on categories for all using (true) with check (true);
create policy "Allow all" on todos for all using (true) with check (true);

-- リアルタイム同期を有効化
alter publication supabase_realtime add table todos;
alter publication supabase_realtime add table categories;
