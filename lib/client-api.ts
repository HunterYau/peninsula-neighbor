export async function requestApi<T=any>(path:string,method='GET',body?:unknown,signal?:AbortSignal):Promise<T>{
  const response=await fetch(`/api/${path}`,{method,headers:body!==undefined?{'Content-Type':'application/json'}:undefined,body:body!==undefined?JSON.stringify(body):undefined,signal});
  let data:any;try{data=await response.json();}catch{throw new Error('The service returned an unexpected response. Please try again.');}
  if(!response.ok)throw new Error(data.error||'Could not complete this request.');return data;
}
