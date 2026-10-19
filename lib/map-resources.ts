import type {MapFeature} from './map-community.ts';
export const checkedDate='2026-10-19';
export const officialCoyoteReport='https://survey123.arcgis.com/share/20a3860beb1e402193f11bc79cab69a7';
export const officialCoyoteMap='https://cityofrpv.maps.arcgis.com/apps/webappviewer/index.html?id=d41a82b9087448c4ab0ba189c81e9025';
export const mapSources=[
 {name:'RPV · coyote reports & safety',url:'https://www.rpvca.gov/335/Coyotes'},
 {name:'PVE · coyote information & safety',url:'https://www.pvestates.org/services/police-department/coyote-information'},
 {name:'Rolling Hills Estates · coyote management',url:'https://www.rollinghillsestates.gov/departments/public-safety/coyote-management'},
 {name:'Peninsula · official coyote map',url:officialCoyoteMap},
 {name:'RPV · accessibility & accommodation requests',url:'https://www.rpvca.gov/359/Americans-with-Disabilities-Act'},
 {name:'PVPReady · official evacuation zone map',url:'https://www.pvpready.gov/'},
 {name:'Alert SouthBay · emergency notifications',url:'https://www.alertsouthbay.com/'},
 {name:'RPV · land movement updates',url:'https://www.rpvca.gov/1707/Land-Movement-Updates'},
 {name:'RPV · current trail closures',url:'https://www.rpvca.gov/trailalerts'},
 {name:'Red Cross · find an open shelter',url:'https://www.redcross.org/get-help/disaster-relief-and-recovery-services/find-an-open-shelter.html'},
 {name:'RPV · emergency supplies & preparation',url:'https://www.rpvca.gov/234/Emergency-Preparedness-Tips'},
 {name:'PVP CERT · training and volunteering',url:'https://www.pvpcert.org/'},
 {name:'RPV · report a city problem',url:'https://www.rpvca.gov/548/Report'}
];
export const accessFeatures:MapFeature[]=[
 {id:'access:ladera-city',title:'Ladera Linda · documented ramp on site',body:'The city documents a switchback ADA ramp in the park project. This pin locates the facility, not the precise ramp or entrance. Confirm the usable entrance and current conditions with the city.',lat:33.7397137179441,lng:-118.348494977179,area:'Rancho Palos Verdes',category:'Accessible facility',url:'https://rpvca.gov/982/Ladera-Linda-Community-Park-Project',verification:'Official city project source · facility-level pin',checked:checkedDate},
 {id:'access:caninos-city',title:'Rancho Caninos · city-listed accessible facility',body:'The city lists ADA accessibility and a cedar-chip surface. This is a facility pin, not a ramp inspection or a guarantee that every path is usable.',lat:33.7446898542187,lng:-118.403874598808,area:'Rancho Palos Verdes',category:'Accessible facility',url:'https://www.rpvca.gov/facilities/facility/details/Rancho-Caninos-Dog-Park-15',verification:'Official city facility source · facility-level pin',checked:checkedDate}
];
const station=(n:number,lat:number,lng:number,address:string,area:string,path:string):MapFeature=>({id:`emergency:station-${n}`,title:`Fire Station ${n}`,body:`${address}. Official LA County facility location. Not an open-shelter designation. Call 911 for emergencies; do not travel here for an unconfirmed shelter or supplies.`,lat,lng,area,category:'Fire station',url:`https://locator.lacounty.gov/fire/Location/${path}`,verification:'Official LA County directory · facility location',checked:checkedDate});
export const emergencyFeatures:MapFeature[]=[
 station(2,33.79993329,-118.39164296,'340 Palos Verdes Drive West','Palos Verdes Estates','3036131/los-angeles-county-fire-department---station-2'),
 station(53,33.74476547,-118.38457314,'6124 Palos Verdes Drive South','Rancho Palos Verdes','3069620/los-angeles-county-fire-department---station-53'),
 station(83,33.74919484,-118.32512227,'83 Miraleste Plaza','Rancho Palos Verdes','3069637/los-angeles-county-fire-department---station-83'),
 station(106,33.77211238,-118.37633705,'27413 Indian Peak Road','Rolling Hills Estates','3069577/los-angeles-county-fire-department---station-106-battalion-14-headquarters'),
 station(56,33.75669918,-118.35406274,'12 Crest Road West','Rolling Hills','3069621/los-angeles-county-fire-department---station-56')
];
