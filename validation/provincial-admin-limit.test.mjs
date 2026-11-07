import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const db=new PGlite();
const names=['events','event_municipalities','attendance','rsvps','certificates','email_notification_deliveries','event_certificate_signatories','event_email_deliveries','event_memos','event_staff_assignments','notifications','participant_verifications','proof_cleanup_queue','reports','staff_email_deliveries','venues'];
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
create schema auth;create schema storage;
create type public.user_role as enum ('participant','municipal_admin','provincial_admin','event_staff');
create type public.verification_status as enum ('pending','approved','rejected');
create table auth.users(id uuid primary key,email text,raw_app_meta_data jsonb default '{}',raw_user_meta_data jsonb default '{}',banned_until timestamptz);
create table auth.mfa_factors(id uuid primary key,user_id uuid references auth.users on delete cascade,status text,factor_type text);
create table public.profiles(id uuid primary key references auth.users on delete cascade,role public.user_role,verification_status public.verification_status,first_name text,middle_name text,last_name text,suffix text,full_name text,email text,municipality text,participant_category text,participant_category_other text);
alter table public.profiles enable row level security;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.uid',true),'')::uuid$$;
create function auth.role() returns text language sql stable as $$select coalesce(nullif(current_setting('request.role',true),''),'service_role')$$;
create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt',true),''),'{}')::jsonb$$;
create table storage.objects(id uuid);alter table storage.objects enable row level security;
${names.map(n=>`create table public.${n}(id uuid);alter table public.${n} enable row level security;create policy base on public.${n} to authenticated using(true) with check(true);`).join('\n')}
create policy own_profile_read on public.profiles for select to authenticated using(id=auth.uid());
create policy broad_profile_update on public.profiles for update to authenticated using(true) with check(true);
grant usage on schema public,auth,storage to authenticated;grant all on all tables in schema public to authenticated;
create function public.get_my_certificate_events() returns table(id uuid) language sql security definer as $$select id from public.certificates;$$;
create function public.get_municipal_attendance() returns table(id uuid) language plpgsql security definer as $$begin return query select a.id from public.attendance a;end;$$;
`);
await db.exec(readFileSync(root+'supabase/migrations/20261031090000_super_admin_role.sql','utf8'));
await db.exec(readFileSync(root+'supabase/migrations/20261031090100_super_admin_management.sql','utf8'));
await db.exec(readFileSync(root+'supabase/migrations/20261031100000_super_admin_portal.sql','utf8'));

const su='00000000-0000-4000-8000-000000000001',p1='00000000-0000-4000-8000-000000000002',p2='00000000-0000-4000-8000-000000000003',p3='00000000-0000-4000-8000-000000000004';
let checks=0;
function pass(label){checks++;console.log('PASS '+label);}
async function add(id,role='provincial_admin'){
 await db.query(`insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data) values($1,$2,$3::jsonb,$4::jsonb)`,[id,`${id}@example.com`,JSON.stringify({provisioned_role:role}),JSON.stringify({full_name:'Test Administrator'})]);
}
async function rejects(sql,label,code){try{await db.exec(sql);}catch(error){if(code&&error.code!==code)throw error;pass(label);return;}throw Error('Expected rejection: '+label);}
async function capacity(expected,label){const row=(await db.query(`select public.super_provincial_capacity() as capacity`)).rows[0].capacity;if(row.activeCount!==expected||row.activeLimit!==2||row.remaining!==2-expected)throw Error(label+JSON.stringify(row));pass(label);}
const migration=readFileSync(root+'supabase/migrations/20261031120000_provincial_admin_limit.sql','utf8');
await add(su,'super_admin');await add(p1);await add(p2);await add(p3);
await rejects(migration,'migration refuses existing over-limit accounts without choosing/deleting any');
await db.exec('rollback;');
if((await db.query(`select count(*)::int as n from profiles where role='provincial_admin'`)).rows[0].n!==3)throw Error('migration deleted existing accounts');
pass('failed migration preserves all existing accounts');
await db.exec(`select public.super_set_provincial_status('${su}','${p2}',false);select public.super_set_provincial_status('${su}','${p3}',false);`);
await db.exec(migration);
await capacity(1,'initial count includes only approved Provincial Admins');
await db.exec(migration);await capacity(1,'migration can safely be re-run');
await db.exec(`select public.super_set_provincial_status('${su}','${p2}',true);`);await capacity(2,'activation consumes second slot');
await rejects(`select public.super_set_provincial_status('${su}','${p3}',true)`,'third activation blocked with capacity conflict','PT409');
if((await db.query(`select verification_status::text as s from profiles where id=$1`,[p3])).rows[0].s!=='rejected')throw Error('failed activation changed account');
pass('rejected activation leaves target inactive');
await db.exec(`select public.super_set_provincial_status('${su}','${p1}',true);update profiles set full_name='Renamed Provincial Admin' where id='${p1}';`);await capacity(2,'idempotent activation and name edit do not consume extra slots');
const fresh='00000000-0000-4000-8000-000000000005';
try{await add(fresh);throw Error('Unexpected creation');}catch(error){if(error.code!=='PT409')throw error;pass('third Auth creation rejected at deferred profile insertion');}
if((await db.query(`select count(*)::int as n from auth.users where id=$1`,[fresh])).rows[0].n!==0)throw Error('orphan auth account');
if((await db.query(`select count(*)::int as n from profiles where id=$1`,[fresh])).rows[0].n!==0)throw Error('orphan profile');
if((await db.query(`select count(*)::int as n from admin_audit_logs where target_id=$1`,[fresh])).rows[0].n!==0)throw Error('orphan audit');
pass('failed creation rolls back Auth user, profile, and creation audit');await capacity(2,'failed creation preserves capacity');
await db.exec(`select public.super_set_provincial_status('${su}','${p2}',false);`);await capacity(1,'deactivation releases a slot');
await add(fresh);await capacity(2,'new admin allowed after deactivation');
await db.exec(`begin;select public.super_set_provincial_status('${su}','${p1}',false);rollback;`);await capacity(2,'rolled-back deactivation does not release a slot');
await db.exec(`delete from auth.users where id='${fresh}';`);await capacity(1,'Auth cascade deletion releases exactly one slot');
await db.exec(`delete from auth.users where id='${p3}';`);await capacity(1,'inactive deletion does not alter active count');
const staff='00000000-0000-4000-8000-000000000006';await add(staff,'event_staff');await capacity(1,'staff and Super Admin are excluded');
await db.exec(`update profiles set role='provincial_admin' where id='${staff}';`);await capacity(2,'role promotion consumes a slot');
await db.exec(`update profiles set role='event_staff' where id='${staff}';`);await capacity(1,'role demotion releases a slot');
await db.exec(`select set_config('request.uid','${su}',false);select set_config('request.role','authenticated',false);set role authenticated;`);
await rejects(`select * from public.provincial_admin_capacity`,'client cannot read private capacity table','42501');
await rejects(`update public.provincial_admin_capacity set active_count=0`,'client cannot tamper with capacity counter','42501');
await rejects(`select public.super_provincial_capacity()`,'client cannot invoke service-only capacity RPC','42501');
await db.exec(`reset role;set role service_role;`);
await rejects(`update public.provincial_admin_capacity set active_count=0`,'service cannot directly overwrite capacity counter','42501');
await capacity(1,'service can read capacity through controlled RPC');
await db.exec('reset role;');
await db.close();console.log(`${checks} capacity checks passed (isolated PostgreSQL, no live project calls).`);
