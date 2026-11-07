import "server-only";
import { createClient } from "@supabase/supabase-js";
export function serverAuthClient(accessToken?: string) {
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!key)throw new Error("Missing authentication configuration.");
 return createClient(url,key,{
  auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
  global:accessToken?{headers:{Authorization:`Bearer ${accessToken}`}}:undefined
 });
}
