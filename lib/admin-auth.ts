import type {Identity} from './api.ts';
export function isAdministrator(user:Identity|null,adminEmail?:string){return user?.provider!=='local'&&!!user?.email&&!!adminEmail&&user.email.toLowerCase()===adminEmail.toLowerCase();}
