import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {labs} from '../scripts/catalog.mjs';
const seed=await readFile('web/seed.sql','utf8');
for(const lab of labs){
  const blocks=[...(await readFile(lab.file,'utf8')).matchAll(/```sql\n([\s\S]*?)```/g)].map(m=>m[1]);
  if(!blocks.length)continue;
  test(`${lab.slug}: published SQL executes in order and matches its stated outcomes`,async()=>{
    const db=await PGlite.create();
    try{
      await db.exec(seed);let outputs=[];
      for(const sql of blocks)outputs.push(await db.exec(sql));
      if(lab.slug==='invariants'){
        assert.equal(outputs.at(-1).at(-1).rows[0].intended_transfer_completed,false);
        assert.deepEqual((await db.query('SELECT id,balance FROM accounts ORDER BY id')).rows,[{id:'alice',balance:100},{id:'bob',balance:100}]);
        await db.exec(blocks[1].replace("balance + 30 WHERE id = 'alice'","balance + 30 WHERE id = 'bob'"));
        assert.equal((await db.exec(blocks[2])).at(-1).rows[0].intended_transfer_completed,true);
      }
      if(lab.slug==='atomicity')assert.deepEqual((await db.query('SELECT id,balance FROM accounts ORDER BY id')).rows,[{id:'alice',balance:70},{id:'bob',balance:130}]);
      if(lab.slug==='constraints'){
        assert.equal((await db.query("SELECT stock FROM inventory WHERE sku='bike'")).rows[0].stock,0);
        assert.deepEqual((await db.query('SELECT * FROM reservations')).rows,[{request_id:'request-a',sku:'bike'}]);
        assert.equal(outputs.at(-1).at(-1).rows[0].inventory_conserved,true);
      }
      if(lab.slug==='outbox'){
        assert.deepEqual(outputs.at(-1).at(-1).rows,[{order_survived:false,intent_survived:false}]);
        assert.equal((await db.query('SELECT count(*)::int AS n FROM orders JOIN outbox ON orders.id=outbox.order_id')).rows[0].n,1);
      }
    }finally{await db.close();}
  });
}
