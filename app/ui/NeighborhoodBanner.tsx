import Photo from './Photo';
import type {Photo as PhotoData} from '../../lib/photos';

/** Place photography provides context without implying a pictured event or activity. */
export default function NeighborhoodBanner({photo,label,title,description,caption}:{photo:PhotoData;label:string;title:string;description:string;caption:string}){
  return <section className="neighborhood-banner">
    <Photo photo={photo}/>
    <div className="neighborhood-banner-copy">
      <span className="eyebrow">{label}</span>
      <h2>{title}</h2>
      <p>{description}</p>
      <span className="neighborhood-caption">{caption}</span>
    </div>
  </section>;
}
