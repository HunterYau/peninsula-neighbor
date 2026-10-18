'use client';
import {useState} from 'react';
import {photoSchema,type Photo} from '../../lib/photos';
export function readPhotoFields(data:Record<string,unknown>):Photo|undefined{
 if(!String(data.photoUrl||'').trim())return undefined;
 if(data.photoPermission!=='on')throw new Error('Confirm that the image may be shared and credited.');
 const parsed=photoSchema.safeParse({src:data.photoUrl,alt:data.photoAlt,credit:data.photoCredit,source:data.photoSource});
 if(!parsed.success)throw new Error(parsed.error.issues.map(i=>i.message).join(' '));return parsed.data;
}
export default function PhotoFields(){const [url,setUrl]=useState('');return <details className="photo-fields"><summary>Add an image (optional)</summary><p className="fine-print">Link an organizer image or a photo you have permission to share. It will be reviewed with your submission. Use an image URL, not a link to a social-media post.</p><label className="field"><span>Public image URL</span><input name="photoUrl" type="url" maxLength={1600} placeholder="https://…/event-photo.jpg" value={url} onChange={e=>setUrl(e.target.value)}/></label><label className="field"><span>Describe the image</span><input name="photoAlt" required={!!url} minLength={4} maxLength={240} placeholder="What does the image show?"/></label><label className="field"><span>Photographer / organizer credit</span><input name="photoCredit" required={!!url} minLength={2} maxLength={200}/></label><label className="field"><span>Original source page</span><input name="photoSource" required={!!url} type="url" maxLength={1600} placeholder="https://…"/></label><label className="checkbox-label"><input name="photoPermission" required={!!url} type="checkbox"/>I have permission to share this image with the credit provided.</label></details>;}
