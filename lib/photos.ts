import {z} from 'zod';
export function publicImageLink(value:string){
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&u.hostname.includes('.')&&!/^(localhost|.*\.localhost|.*\.local|.*\.internal)$/.test(u.hostname)&&!/^\d+\.\d+\.\d+\.\d+$/.test(u.hostname)&&!u.hostname.includes(':');}catch{return false;}
}
const publicLink=z.string().trim().max(1600).refine(publicImageLink,'Use a public https URL.');
export const photoSchema=z.object({src:z.string().trim().max(1600).refine(s=>publicImageLink(s)||/^\/photos\/[a-z0-9-]+\.jpg$/.test(s),'Use a public https image URL.'),alt:z.string().trim().min(4).max(240),credit:z.string().trim().min(2).max(200),source:publicLink,license:z.string().trim().max(80).optional(),licenseUrl:publicLink.optional()}).refine(p=>!!p.license===!!p.licenseUrl,'Include both a license label and its link, or neither.');
export type Photo=z.infer<typeof photoSchema>;
export function decodePhoto(value:unknown):Photo|null{try{const parsed=photoSchema.safeParse(typeof value==='string'?JSON.parse(value):value);return parsed.success?parsed.data:null;}catch{return null;}}
export const localPhotos={
 coast:{src:'/photos/point-vicente-coast.jpg',alt:'Point Vicente Lighthouse above sunlit coastal cliffs and the Pacific Ocean.',credit:'Nhostetler',source:'https://commons.wikimedia.org/wiki/File:Point_Vicente_Lighthouse_on_Cliff.jpeg',license:'CC BY-SA 3.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/3.0/'},
 malaga:{src:'/photos/malaga-cove.jpg',alt:'Homes and trees on the hillsides of Malaga Cove in Palos Verdes Estates.',credit:'Cardinalngold',source:'https://commons.wikimedia.org/wiki/File:Malaga_cove.jpg',license:'Public domain',licenseUrl:'https://commons.wikimedia.org/wiki/Template:PD-self'},
 library:{src:'/photos/malaga-cove-library.jpg',alt:'Reading tables, bookshelves, and the wood circulation desk inside Malaga Cove Library.',credit:'Sgerbic',source:'https://commons.wikimedia.org/wiki/File:Malaga_Cove_Library.jpg',license:'Public domain',licenseUrl:'https://commons.wikimedia.org/wiki/Template:PD-self'},
 abalone:{src:'/photos/abalone-cove.jpg',alt:'A long-exposure sunset view over the ocean at Abalone Cove.',credit:'n4rwhals',source:'https://commons.wikimedia.org/wiki/File:Abalone_Cove_-_D600_Long_Exposure_(8061975568).jpg',license:'CC BY-SA 2.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/2.0/'}
} satisfies Record<string,Photo>;
export function placePhoto(id:string):Photo|null{return id==='malaga-library'?localPhotos.library:['point-vicente','vicente-bluffs'].includes(id)?localPhotos.coast:id==='abalone'?localPhotos.abalone:null;}
export function listingPhoto(item:{photo?:Photo|null;id:string;title:string;kind:string}){return item.photo||(!['event','volunteer'].includes(item.kind)?placePhoto(item.id):null);}
