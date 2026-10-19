// Excel template + bulk import for passages (needs the SheetJS global: XLSX)
(function(root){
const COLS=['Passage Title','Level','Status','Passage Text','Question','Option A','Option B','Option C','Option D','Correct Answer','Explanation'];
const P1='Amina woke up early on Saturday morning. Her mother had promised to take her to Wuse Market. First, they bought fresh tomatoes and peppers from Mama Ngozi. Then they walked to the cloth section, where Amina chose a bright blue ribbon. Before going home, her mother bought two oranges, and they ate them under a big tree. Amina said it was the best Saturday ever.';
const P2='Plants need water to live. Roots take in water from the soil and carry it up the stem to the leaves. The leaves use the water, sunlight and air to make food. This process is called photosynthesis. When a plant does not get enough water, its leaves droop and turn yellow. A farmer who waters crops regularly will usually harvest more food.';
const SAMPLE=[
['A Day at the Market','Primary 4','published',P1,'Where did Amina and her mother go on Saturday?','A school','Wuse Market','A hospital','A church','B','The passage says her mother had promised to take her to Wuse Market.'],
['A Day at the Market','','','','What did Amina choose in the cloth section?','Tomatoes','Oranges','A blue ribbon','Peppers','C','In the cloth section, Amina chose a bright blue ribbon.'],
['A Day at the Market','','','','What did they do before going home?','Ate oranges under a tree','Cooked rice','Played football','','A','Her mother bought two oranges, and they ate them under a big tree.'],
['Why Plants Need Water','Primary 5','published',P2,'What do roots do?','Make food from sunlight','Take in water from the soil','Drop the leaves','Colour the flowers','B','Roots take in water from the soil and carry it up the stem.'],
['Why Plants Need Water','','','','What is the process of making food called?','Photosynthesis','Harvesting','Drooping','','A','The passage says this process is called photosynthesis.'],
['Why Plants Need Water','','','','What happens when a plant gets too little water?','It grows taller','Its leaves droop and turn yellow','Its roots disappear','It makes more food','B','The passage says the leaves droop and turn yellow.']];
const INSTR=[
'HOW TO USE THIS TEMPLATE',
'1. Use the "Passages" sheet. Each ROW is ONE QUESTION. A passage with 5 questions uses 5 rows.',
'2. Passage Title: type it on the first row of a passage. On the next rows of the same passage you may leave Title, Level, Status and Passage Text empty, or repeat the same title.',
'3. Level: for example "Primary 5". Status: published (students can see it) or draft (hidden). If empty, published is used.',
'4. Passage Text: write complete sentences with correct punctuation so the voice reads it naturally. Only needed once per passage.',
'5. Option A and Option B are required. Option C and Option D are optional.',
'6. Correct Answer: a single letter A, B, C or D, and it must be one of the options you filled in.',
'7. Explanation: tell the student why the answer is correct, using the passage. The coach reads this aloud.',
'8. To add MANY passages, simply keep adding rows with a new Passage Title.',
'9. Delete the two sample passages (rows 2 to 7) before uploading your own, or keep them to practise.',
'10. If a passage with the same title already exists in the system, it is UPDATED (replaced) by the upload. Use "Export my passages" to edit existing ones safely.',
'11. Upload the saved file on the Admin page: Passages & questions > Upload Excel. You will see a preview before anything is saved.'];
const norm=h=>String(h==null?'':h).toLowerCase().replace(/[^a-z0-9]/g,'');
const ALIAS={title:['passagetitle','title','passage'],level:['level','class','levelclass','classlevel','grade'],status:['status'],text:['passagetext','text','passagebody','body'],q:['question','questiontext'],A:['optiona','a','choicea'],B:['optionb','b','choiceb'],C:['optionc','c','choicec'],D:['optiond','d','choiced'],answer:['correctanswer','answer','key','answerkey','correct'],explanation:['explanation','explanationshowntothestudent','reason']};
function workbook(rows){const wb=XLSX.utils.book_new();
 const ws=XLSX.utils.aoa_to_sheet([COLS,...rows]);ws['!cols']=[{wch:28},{wch:12},{wch:11},{wch:80},{wch:42},{wch:26},{wch:26},{wch:26},{wch:26},{wch:15},{wch:60}];ws['!freeze']={xSplit:0,ySplit:1};
 XLSX.utils.book_append_sheet(wb,ws,'Passages');
 const ins=XLSX.utils.aoa_to_sheet(INSTR.map(x=>[x]));ins['!cols']=[{wch:140}];XLSX.utils.book_append_sheet(wb,ins,'Instructions');return wb;}
function fromPassages(obj){const rows=[];Object.values(obj||{}).forEach(p=>{const qs=Array.isArray(p.questions)?p.questions.filter(Boolean):Object.values(p.questions||{});
 if(!qs.length)rows.push([p.title||'',p.level||'',p.status||'published',p.text||'','','','','','','','']);
 qs.forEach((q,i)=>{const o=q.options||{};rows.push([p.title||'',i?'':(p.level||''),i?'':(p.status||'published'),i?'':(p.text||''),q.q||'',o.A||'',o.B||'',o.C||'',o.D||'',q.answer||'',q.explanation||'']);});});
 return rows;}
function parse(wb){
 const name=wb.SheetNames.find(n=>norm(n)==='passages')||wb.SheetNames.find(n=>norm(n)!=='instructions')||wb.SheetNames[0];
 const data=XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,defval:'',raw:false,blankrows:false});
 const out={groups:[],problems:[],rowCount:0};
 if(!data.length){out.problems.push('The sheet is empty.');return out;}
 const head=data[0].map(norm),ix={};
 Object.entries(ALIAS).forEach(([k,list])=>{ix[k]=head.findIndex(h=>list.includes(h));});
 const missing=['title','text','q','A','B','answer'].filter(k=>ix[k]<0);
 if(missing.length){out.problems.push('Missing column(s): '+missing.map(k=>({title:'Passage Title',text:'Passage Text',q:'Question',A:'Option A',B:'Option B',answer:'Correct Answer'}[k])).join(', ')+'. Download the sample file and keep its first row.');return out;}
 const get=(r,k)=>ix[k]<0?'':String(r[ix[k]]==null?'':r[ix[k]]).trim();
 const map=new Map();let last=null;
 data.slice(1).forEach((r,n)=>{const rowNo=n+2;if(!r.some(c=>String(c).trim()))return;out.rowCount++;
  const t=get(r,'title');let g;
  if(t){const key=t.toLowerCase();g=map.get(key);if(!g){g={title:t,level:'',status:'',text:'',questions:[],errors:[],firstRow:rowNo};map.set(key,g);}last=g;}
  else{g=last;if(!g){out.problems.push(`Row ${rowNo}: no Passage Title above this row.`);return;}}
  if(!g.level&&get(r,'level'))g.level=get(r,'level');
  if(!g.status&&get(r,'status'))g.status=get(r,'status').toLowerCase();
  if(!g.text&&get(r,'text'))g.text=get(r,'text');
  const q=get(r,'q'),opts={};['A','B','C','D'].forEach(k=>{const v=get(r,k);if(v)opts[k]=v;});
  if(!q&&!Object.keys(opts).length)return;
  const ans=get(r,'answer').toUpperCase().replace(/[^A-D]/g,'').charAt(0);
  if(!q)g.errors.push(`Row ${rowNo}: the question is empty.`);
  else if(Object.keys(opts).length<2)g.errors.push(`Row ${rowNo}: add at least Option A and Option B.`);
  else if(!ans||!opts[ans])g.errors.push(`Row ${rowNo}: Correct Answer must be A, B, C or D and match a filled option.`);
  else g.questions.push({q,options:opts,answer:ans,explanation:get(r,'explanation')});});
 map.forEach(g=>{g.status=g.status==='draft'?'draft':'published';
  if(!g.text)g.errors.push('Passage Text is empty.');
  if(g.status==='published'&&!g.questions.length&&!g.errors.length)g.errors.push('A published passage needs at least one question (or set Status to draft).');
  out.groups.push(g);});
 if(!out.groups.length&&!out.problems.length)out.problems.push('No passages were found in the file.');
 return out;}
root.RFExcel={COLS,SAMPLE,INSTR,workbook,parse,fromPassages};
})(typeof window!=='undefined'?window:globalThis);
