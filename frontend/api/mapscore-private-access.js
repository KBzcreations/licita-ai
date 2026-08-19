import crypto from 'crypto';

function sign(payload, secret){return crypto.createHmac('sha256',secret).update(payload).digest('hex')}

export default async function handler(req,res){
  if(req.method!=="POST") return res.status(405).json({error:"Method Not Allowed"});
  const secret=process.env.STRIPE_SECRET_KEY;
  if(!secret) return res.status(500).json({error:"Servidor no configurado"});
  const code=String(req.body?.code||'').trim().toUpperCase();
  if(code!=="NEXUS7K") return res.status(401).json({error:"Código no válido"});
  const payload=Buffer.from(JSON.stringify({scope:'mapscore',exp:Date.now()+60*60*1000})).toString('base64url');
  const sig=sign(payload,secret);
  return res.status(200).json({ok:true,token:`${payload}.${sig}`});
}
