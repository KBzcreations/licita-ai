export default async function handler(req,res){
  if(req.method!=="POST") return res.status(405).json({error:"Method Not Allowed"});
  const key=process.env.STRIPE_SECRET_KEY;
  const {session_id}=req.body||{};
  if(!key) return res.status(500).json({error:"STRIPE_SECRET_KEY no configurada"});
  if(!session_id||!String(session_id).startsWith("cs_")) return res.status(400).json({error:"Sesión inválida"});
  try{
    const r=await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(session_id)}`,{headers:{Authorization:`Bearer ${key}`}});
    const s=await r.json();
    if(!r.ok) return res.status(401).json({error:"No se pudo verificar el pago"});
    const valid=s.payment_status==="paid" && s.payment_link==="plink_1U65vdDwJ53fjQyszHGTxoLM";
    if(!valid) return res.status(402).json({error:"Pago no confirmado"});
    return res.status(200).json({ok:true,email:s.customer_details?.email||s.customer_email||null});
  }catch(e){return res.status(500).json({error:String(e)})}
}
