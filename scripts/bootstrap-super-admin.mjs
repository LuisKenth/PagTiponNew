// Local maintenance script only. Never expose this through a public route.
import {createClient} from "@supabase/supabase-js";
import {randomInt} from "node:crypto";
const [emailInput,fullName]=process.argv.slice(2);
const email=(emailInput||"").trim().toLowerCase();
if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!fullName?.trim()||fullName.length>100)
 throw new Error('Usage: node --env-file=.env.local scripts/bootstrap-super-admin.mjs "real-email@example.com" "Full Name"');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key)throw new Error("Missing local Supabase configuration.");
if(new URL(url).hostname!=="lggmkirpvtrudsytywed.supabase.co")throw new Error("Wrong project. Review the expected project before running.");
const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const {count,error:checkError}=await admin.from("profiles").select("id",{count:"exact",head:true}).eq("role","super_admin");
if(checkError)throw new Error("Run both Super Admin SQL migrations first.");
if(count!==0)throw new Error("A Super Admin already exists. Bootstrap stopped; no account was changed.");
const alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*?";
let password="";
do{password=Array.from({length:16},()=>alphabet[randomInt(alphabet.length)]).join("");}
while(!/[A-Z]/.test(password)||!/[a-z]/.test(password)||!/[0-9]/.test(password)||!/[!@#$%&*?]/.test(password));
const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true,
 app_metadata:{provisioned_role:"super_admin",must_change_password:true},user_metadata:{full_name:fullName.trim()}});
if(error||!data.user)throw new Error(error?.message||"Account creation failed.");
const {data:profile,error:profileError}=await admin.from("profiles").select("role").eq("id",data.user.id).single();
if(profileError||profile?.role!=="super_admin")throw new Error("Account created but profile could not be verified. Do not rerun; contact the maintainer.");
console.log("Super Admin created. Store these initial credentials privately:");
console.log(`Email: ${email}\nInitial Password: ${password}`);
console.log("Sign in, replace the initial password, then enroll your authenticator. Do not share a screenshot of this output.");
