create type public.app_role as enum ('admin','employer','student');
create type public.vacancy_status as enum ('pending','approved','rejected','closed');
create type public.vacancy_type as enum ('internship','job','graduate');
create type public.application_status as enum ('submitted','shortlisted','rejected','accepted');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "Users read own roles" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "Admins manage roles" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  phone text,
  student_number text,
  programme text,
  year_of_study text,
  bio text,
  skills text,
  cv_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique,
  name text not null,
  industry text,
  location text,
  website text,
  description text,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);
grant select on public.companies to anon;
grant select, insert, update on public.companies to authenticated;
grant all on public.companies to service_role;
alter table public.companies enable row level security;
create policy "Companies public" on public.companies for select to anon, authenticated using (true);
create policy "Employer creates own company" on public.companies for insert to authenticated
  with check (owner_id = auth.uid() and public.has_role(auth.uid(),'employer'));
create policy "Owner or admin updates company" on public.companies for update to authenticated
  using (owner_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create or replace function public.protect_company_verified()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.verified is distinct from old.verified and not public.has_role(auth.uid(),'admin') then
    new.verified := old.verified;
  end if;
  return new;
end $$;
create trigger trg_protect_company_verified before update on public.companies
  for each row execute function public.protect_company_verified();

create table public.vacancies (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employer_id uuid not null,
  title text not null,
  type vacancy_type not null default 'internship',
  industry text not null,
  location text not null,
  qualification text,
  description text not null,
  requirements text,
  deadline date,
  status vacancy_status not null default 'pending',
  created_at timestamptz not null default now()
);
grant select on public.vacancies to anon;
grant select, insert, update, delete on public.vacancies to authenticated;
grant all on public.vacancies to service_role;
alter table public.vacancies enable row level security;
create policy "Approved vacancies public" on public.vacancies for select to anon, authenticated
  using (status = 'approved');
create policy "Owner sees own vacancies" on public.vacancies for select to authenticated
  using (employer_id = auth.uid());
create policy "Admin sees all vacancies" on public.vacancies for select to authenticated
  using (public.has_role(auth.uid(),'admin'));
create policy "Employer posts vacancy" on public.vacancies for insert to authenticated
  with check (employer_id = auth.uid() and public.has_role(auth.uid(),'employer')
    and exists (select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid()));
create policy "Owner or admin updates vacancy" on public.vacancies for update to authenticated
  using (employer_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "Owner or admin deletes vacancy" on public.vacancies for delete to authenticated
  using (employer_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create or replace function public.protect_vacancy_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.has_role(auth.uid(),'admin') then return new; end if;
  if tg_op = 'INSERT' then
    new.status := 'pending';
  elsif new.status is distinct from old.status and new.status in ('approved','rejected') then
    new.status := old.status;
  end if;
  return new;
end $$;
create trigger trg_protect_vacancy_status before insert or update on public.vacancies
  for each row execute function public.protect_vacancy_status();

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  vacancy_id uuid not null references public.vacancies(id) on delete cascade,
  student_id uuid not null,
  cover_letter text,
  cv_path text,
  status application_status not null default 'submitted',
  employer_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vacancy_id, student_id)
);
grant select, insert, update, delete on public.applications to authenticated;
grant all on public.applications to service_role;
alter table public.applications enable row level security;
create policy "Student reads own applications" on public.applications for select to authenticated
  using (student_id = auth.uid());
create policy "Employer reads applications to own vacancies" on public.applications for select to authenticated
  using (exists (select 1 from public.vacancies v where v.id = vacancy_id and v.employer_id = auth.uid()));
create policy "Admin reads applications" on public.applications for select to authenticated
  using (public.has_role(auth.uid(),'admin'));
create policy "Student applies" on public.applications for insert to authenticated
  with check (student_id = auth.uid() and public.has_role(auth.uid(),'student')
    and exists (select 1 from public.vacancies v where v.id = vacancy_id and v.status = 'approved'));
create policy "Employer updates status" on public.applications for update to authenticated
  using (exists (select 1 from public.vacancies v where v.id = vacancy_id and v.employer_id = auth.uid()));
create policy "Student withdraws" on public.applications for delete to authenticated
  using (student_id = auth.uid());

-- profile policies (need applications table)
create policy "Read own profile" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(),'admin')
    or exists (select 1 from public.applications a join public.vacancies v on v.id = a.vacancy_id
               where a.student_id = profiles.id and v.employer_id = auth.uid()));
create policy "Insert own profile" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "Update own profile" on public.profiles for update to authenticated using (id = auth.uid());

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  message text not null,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, update, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "Own notifications read" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "Own notifications update" on public.notifications for update to authenticated using (user_id = auth.uid());
create policy "Own notifications delete" on public.notifications for delete to authenticated using (user_id = auth.uid());

-- signup trigger
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare r app_role;
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''), new.email);
  r := case when new.raw_user_meta_data->>'account_type' = 'employer' then 'employer'::app_role else 'student'::app_role end;
  insert into public.user_roles (user_id, role) values (new.id, r);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- notifications
create or replace function public.notify_on_application()
returns trigger language plpgsql security definer set search_path = public as $$
declare v record;
begin
  select * into v from public.vacancies where id = coalesce(new.vacancy_id, old.vacancy_id);
  if tg_op = 'INSERT' then
    insert into public.notifications (user_id, message, link)
    values (v.employer_id, 'New application received for "' || v.title || '"', '/employer/vacancies/' || v.id);
  elsif new.status is distinct from old.status then
    new.updated_at := now();
    insert into public.notifications (user_id, message, link)
    values (new.student_id, 'Your application for "' || v.title || '" is now ' || new.status, '/student/applications');
  end if;
  return new;
end $$;
create trigger trg_notify_application_ins after insert on public.applications
  for each row execute function public.notify_on_application();
create trigger trg_notify_application_upd before update on public.applications
  for each row execute function public.notify_on_application();

create or replace function public.notify_on_vacancy()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status and new.status in ('approved','rejected') then
    insert into public.notifications (user_id, message, link)
    values (new.employer_id, 'Your vacancy "' || new.title || '" was ' || new.status, '/employer');
    if new.status = 'approved' then
      insert into public.notifications (user_id, message, link)
      select ur.user_id, 'New opportunity: ' || new.title, '/jobs/' || new.id
      from public.user_roles ur where ur.role = 'student';
    end if;
  end if;
  return new;
end $$;
create trigger trg_notify_vacancy after update on public.vacancies
  for each row execute function public.notify_on_vacancy();

-- storage policies for cvs bucket
create policy "Students upload own CV" on storage.objects for insert to authenticated
  with check (bucket_id = 'cvs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Students update own CV" on storage.objects for update to authenticated
  using (bucket_id = 'cvs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Students delete own CV" on storage.objects for delete to authenticated
  using (bucket_id = 'cvs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Read CVs: owner, employer of applicant, admin" on storage.objects for select to authenticated
  using (bucket_id = 'cvs' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.has_role(auth.uid(),'admin')
    or exists (select 1 from public.applications a join public.vacancies v on v.id = a.vacancy_id
               where a.student_id::text = (storage.foldername(name))[1] and v.employer_id = auth.uid())
  ));