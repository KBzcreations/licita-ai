export default async function handler(req,res){
  if(req.method!=="POST") return res.status(405).json({error:"Method Not Allowed"});
  const key=process.env.STRIPE_SECRET_KEY;
  const {session_id}=req.body||{};
  if(!key) return res.status(500).json({error:"STRIPE_SECRET_KEY no configurada"});
  if(!session_id||!String(session_id).startsWith("cs_")) return res.status(400).json({error:"Sesión inválida"});
  try{
    const r=await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(session_id)}`,{headers:{Authorization:`Bearer ${key}`}});
    const s=await r.json();
    if(!r.ok) return res.status(401).json({error:"No se pudo verificar la compra"});
    const correctLink=s.payment_link==="plink_1U65vdDwJ53fjQyszHGTxoLM";
    const completed=s.status==="complete";
    const settled=s.payment_status==="paid" || s.payment_status==="no_payment_required" || Number(s.amount_total)===0;
    const valid=correctLink && completed && settled;
    if(!valid) return res.status(402).json({error:"Compra no confirmada"});
    return res.status(200).json({ok:true,email:s.customer_details?.email||s.customer_email||null,amount_total:s.amount_total,payment_status:s.payment_status});
  }catch(e){return res.status(500).json({error:String(e)})}
}
