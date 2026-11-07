import {createClient} from "https://esm.sh/@supabase/supabase-js@2";
// Disabled by default. No schedule is created by the migration.
Deno.serve(async (request:Request)=>{
 if(request.method!=="POST")return new Response("Method not allowed",{status:405});
 const secret=Deno.env.get("PROOF_CLEANUP_SECRET");
 if(!secret || request.headers.get("Authorization")!==`Bearer ${secret}`)
  return new Response("Unauthorized",{status:401});
 const configured=Deno.env.get("PROOF_RETENTION_DAYS");
 const days=Number(configured);
 if(!configured || !Number.isInteger(days)||days<1||days>3650)
  return Response.json({error:"Set an approved retention period before running cleanup."},{status:400});
 const enabled=Deno.env.get("PROOF_CLEANUP_ENABLED")==="true";
 const client=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  {auth:{persistSession:false,autoRefreshToken:false}});
 try {
  const {data,error}=await client.rpc(enabled?"claim_proof_cleanup":"proof_cleanup_candidates",{p_retention_days:days});
  if(error)throw error;
  if(!enabled)return Response.json({dry_run:true,candidate_count:data.length});
  let removed=0;
  for(const row of data){
   const {error:deleteError}=await client.storage.from("participant-proofs").remove([row.document_path]);
   if(deleteError)throw deleteError;
   const {error:markError}=await client.from("participant_verifications").update({document_deleted_at:new Date().toISOString()})
     .eq("document_path",row.document_path);
   if(markError)throw markError;
   const {error:queueError}=await client.from("proof_cleanup_queue").delete().eq("document_path",row.document_path);
   if(queueError)throw queueError;
   removed++;
  }
  return Response.json({dry_run:false,removed});
 }catch{return Response.json({error:"Cleanup failed; inspect the configured service and retry."},{status:500});}
});
