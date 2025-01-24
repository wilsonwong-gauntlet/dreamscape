-- Create macros table
create table if not exists macros (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  content text not null,
  description text,
  category text,
  variables jsonb default '[]'::jsonb,
  team_id uuid references teams(id) on delete set null,
  created_by uuid references users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add RLS policies
alter table macros enable row level security;

create policy "Macros are viewable by authenticated users" on macros
  for select using (auth.role() = 'authenticated');

create policy "Macros are insertable by authenticated users" on macros
  for insert with check (auth.role() = 'authenticated');

create policy "Macros are updatable by team members or creator" on macros
  for update using (
    auth.uid() = created_by or
    exists (
      select 1 from agents
      where agents.id = auth.uid()
      and agents.team_id = macros.team_id
    )
  );

create policy "Macros are deletable by team members or creator" on macros
  for delete using (
    auth.uid() = created_by or
    exists (
      select 1 from agents
      where agents.id = auth.uid()
      and agents.team_id = macros.team_id
    )
  );

-- Create function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Create trigger to update updated_at
create trigger update_macros_updated_at
  before update on macros
  for each row
  execute function update_updated_at_column(); 