import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create role supabase_auth_admin;create schema auth;create schema storage;create schema extensions;
create table auth.users(id uuid primary key,email text,raw_app_meta_data jsonb default '{}',raw_user_meta_data jsonb default '{}',banned_until timestamptz);
create table auth.mfa_factors(id uuid primary key,user_id uuid references auth.users on delete cascade,status text,factor_type text);
create table storage.objects(id uuid,name text,bucket_id text,owner_id text,created_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.uid',true),'')::uuid$$;
create function auth.role() returns text language sql stable as $$select coalesce(nullif(current_setting('request.role',true),''),'service_role')$$;
create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt',true),''),'{}')::jsonb$$;`);
let schema=readFileSync(root+'supabase/current_public_schema.sql','utf8');
// Local fixture has mock Supabase schemas; production file itself is left unchanged.
await db.exec(schema);
await db.exec('set check_function_bodies=true;set row_security=on;');
await db.exec(readFileSync(root+'supabase/migrations/20261031090000_super_admin_role.sql','utf8'));
await db.exec(readFileSync(root+'supabase/migrations/20261031090100_super_admin_management.sql','utf8'));
await db.exec(readFileSync(root+'supabase/migrations/20261031100000_super_admin_portal.sql','utf8'));
await db.exec(readFileSync(root+'supabase/migrations/20261031120000_provincial_admin_limit.sql','utf8'));
await db.exec(readFileSync(root+'supabase/migrations/20261031130000_delete_inactive_provincial_admin.sql','utf8'));
await db.exec(readFileSync(root+'supabase/migrations/20261101020000_authenticator_recovery_request.sql','utf8'));

const base={full_name:'Mobile Test',participant_category:'farmer',first_name:'Mobile',last_name:'Test',municipality:'Sibalom'};
let sequence=1;
async function add(meta={},role='participant'){
 const id='00000000-0000-4000-9000-'+String(sequence++).padStart(12,'0');
 await db.query('insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data) values($1,$2,$3::jsonb,$4::jsonb)',[id,id+'@example.com',JSON.stringify({provisioned_role:role}),JSON.stringify({...base,...meta})]);return id;
}
const existing=await add();
await db.exec(readFileSync(root+'supabase/migrations/20261101050000_profile_mobile_number.sql','utf8'));
if((await db.query('select mobile_number from public.profiles where id=$1',[existing])).rows[0].mobile_number!==null)throw Error('Old account changed');
console.log('PASS existing participant remains valid without mobile number');
for(const input of ['09171234567','+639171234567','639171234567','0917 123 4567','(+63) 917-123-4567']){
 const id=await add({mobile_number:input});const p=(await db.query('select mobile_number,role::text from public.profiles where id=$1',[id])).rows[0];
 if(p.mobile_number!=='+639171234567'||p.role!=='participant')throw Error('Wrong contact/role');
}
console.log('PASS local, country-code and formatted numbers normalize while preserving participant role');
for(const input of ['123','0917abc4567','+12025550123','091712345678','+639171234567 ext 2']){
 try{await add({mobile_number:input});throw Error('Accepted invalid number')}catch(e){if(e.message==='Accepted invalid number')throw e;}
}
console.log('PASS malformed, foreign, long and extension numbers rejected');
const noPhone=await add({mobile_number:null});
await db.query("update public.profiles set mobile_number='09181234567' where id=$1",[noPhone]);
if((await db.query('select mobile_number from public.profiles where id=$1',[noPhone])).rows[0].mobile_number!=='+639181234567')throw Error('Update not normalized');
await db.query('update public.profiles set mobile_number=null where id=$1',[noPhone]);
if((await db.query('select mobile_number from public.profiles where id=$1',[noPhone])).rows[0].mobile_number!==null)throw Error('Cannot clear optional phone');
await add({},'provincial_admin');
console.log('PASS optional phone can be omitted/updated/cleared; admin provisioning without phone unchanged');
await db.close();
