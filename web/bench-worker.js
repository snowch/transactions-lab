import {evaluateImplementation} from './benchmarks.js';
self.onmessage=({data})=>{
  try{self.postMessage({results:evaluateImplementation(data.id,data.source)});}
  catch(error){self.postMessage({error:error.message});}
};
