export default async function handler(req,res){
 if(req.method!=='POST') return res.status(405).json({error:'Method Not Allowed'});
 const {business,city,address}=req.body||{};
 if(!business||!city) return res.status(400).json({error:'Indica nombre y ciudad'});
 const key=process.env.GOOGLE_MAPS_API_KEY||process.env.GOOGLE_PLACES_API_KEY;
 if(!key) return res.status(503).json({error:'BUSINESS_LOOKUP_NOT_CONFIGURED'});
 const textQuery=[business,address,city].filter(Boolean).join(', ');
 try{
  const r=await fetch('https://places.googleapis.com/v1/places:searchText',{method:'POST',headers:{'Content-Type':'application/json','X-Goog-Api-Key':key,'X-Goog-FieldMask':'places.id,places.displayName,places.formattedAddress,places.primaryTypeDisplayName,places.rating,places.userRatingCount,places.websiteUri,places.nationalPhoneNumber,places.googleMapsUri,places.regularOpeningHours,places.businessStatus'},body:JSON.stringify({textQuery,languageCode:'es',regionCode:'ES',maxResultCount:5})});
  const raw=await r.json();
  if(!r.ok) return res.status(r.status).json({error:'No se pudo consultar el directorio de negocios',detalle:raw});
  const places=(raw.places||[]).map(p=>({place_id:p.id,name:p.displayName?.text||'',address:p.formattedAddress||'',category:p.primaryTypeDisplayName?.text||'',rating:p.rating??null,reviews:p.userRatingCount??null,website:p.websiteUri||'',phone:p.nationalPhoneNumber||'',maps_url:p.googleMapsUri||'',hours:p.regularOpeningHours?.weekdayDescriptions||[],status:p.businessStatus||''}));
  return res.status(200).json({ok:true,query:textQuery,places});
 }catch(e){return res.status(500).json({error:'Error localizando el negocio',detalle:String(e)})}
}