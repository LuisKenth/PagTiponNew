import {supabase} from "@/lib/supabase";
type SignupInput={email:string;password:string;options:{data:Record<string,unknown>}};
export async function signupParticipant(input:SignupInput) {
 try {
  const response=await fetch("/api/auth/signup",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(input)});
  const result=await response.json();
  if(!response.ok)return {error:{message:result.error||"Unable to create account."}};
  if(result.session){const {error}=await supabase.auth.setSession(result.session);if(error)return {error:{message:error.message}};}
  return {error:null};
 }catch{return {error:{message:"Unable to reach signup service. Please try again."}};}
}
export async function updateAccountPassword(input:{password:string;nonce?:string}) {
 try {
  const {data:{session},error}=await supabase.auth.getSession();
  if(error||!session)return {error:{message:"Please sign in again."}};
  const response=await fetch("/api/auth/password",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${session.access_token}`},body:JSON.stringify(input)});
  const result=await response.json();
  return {error:response.ok?null:{message:result.error||"Unable to update password."}};
 }catch{return {error:{message:"Unable to reach password service. Please try again."}};}
}
