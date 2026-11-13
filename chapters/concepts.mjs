// Original teaching illustrations: narrative and drawing data live with the curriculum.
const B=(...v)=>['box',...v],T=(...v)=>['text',...v],A=(...v)=>['arrow',...v],L=(...v)=>['line',...v],C=(...v)=>['band',...v];
export const concepts={
  boundary:{
    title:'A transaction boundary protects a complete decision',
    alt:'A transfer starts at Alice 100, Bob 100. Debit and credit belong inside one transaction. Commit yields 70 and 130; abort retains 100 and 100. A total of 200 alone also permits the wrong outcome 100 and 100.',
    caption:'The dashed boundary groups changes that must share an outcome. Atomicity prevents half a transfer; the application must still choose the right accounts and amount. Check the total and the intended result separately.',
    scenes:[
      {title:'Group the related writes',items:[T(12,15,'Before: Alice 100 · Bob 100'),C(4,39,312,184,'One database transaction'),B(20,75,280,56,'Debit Alice','100 − 30 = 70'),A('M160 133 V151'),B(20,155,280,56,'Credit Bob','100 + 30 = 130'),T(12,245,'A durable commit makes the complete\ntransaction recoverable.',40)]},
      {title:'Verify two different promises',items:[B(4,4,312,68,'COMMIT → 70 / 130','Total = 200; intended transfer holds','safe'),B(4,94,312,68,'ABORT → 100 / 100','No partial transfer is retained'),B(4,184,312,68,'Wrong code → 100 / 100','Total = 200; intended transfer fails','danger')]}
    ]
  },
  publication:{
    title:'Private work becomes one public outcome',
    alt:'A transaction descriptor owns a private write set. Public readers retain Alice 100 and Bob 100 while the writer stages 70 and 130. Commit publishes the complete map; abort discards it. Durability requires a separate recovery mechanism.',
    caption:'Follow the write set across the publication gate. In this teaching engine, replacing one public map is the visibility boundary. Production databases may instead install shared versions and use transaction status or locks to control what readers see.',
    scenes:[
      {title:'Stage without exposing half',items:[B(4,4,312,60,'Descriptor T1: active','Identity + status + owned writes'),A('M160 66 V90','owns',172,82),B(4,96,312,68,'Private write set','Alice = 70; Bob = 130'),L(4,192,316,192,'dashed'),B(4,212,312,60,'Readers: public map','Alice = 100; Bob = 100','safe')]},
      {title:'Choose one terminal outcome',items:[B(4,4,312,56,'Complete write set','Both new values exist'),A('M100 62 V95 H76 V115'),A('M220 62 V95 H244 V115','abort',238,86),T(24,87,'commit',14,'small'),B(4,120,148,86,'Publish','70 / 130\nAll at once','safe'),B(168,120,148,86,'Discard','100 / 100\nOld public map'),T(12,244,'Atomic visibility is one guarantee.\nWAL supplies crash recovery.',40)]}
    ]
  },
  reservation:{
    title:'Put the availability test inside the protected update',
    alt:'With one bicycle, a separate read can let two clients both decide yes. A conditional update holds write protection while checking stock and decrementing it. Only the request that updates a row creates a reservation, in the same transaction.',
    caption:'A CHECK on stock prevents negative values; it does not connect stock to a particular reservation. The conditional write and reservation insert must share a transaction. Under contention, follow the database’s isolation rules and retry a rejected whole decision.',
    scenes:[
      {title:'A separate check can go stale',items:[B(4,4,148,66,'Client A','Reads stock = 1'),B(168,4,148,66,'Client B','Reads stock = 1'),A('M78 72 V109'),A('M242 72 V109'),B(4,115,148,66,'Decides yes','Based on old read','danger'),B(168,115,148,66,'Decides yes','Based on old read','danger'),T(12,222,'Both applications can promise the\nsame item before either writes.',38)]},
      {title:'Make test + change one operation',items:[B(4,4,312,68,'Protected conditional write','UPDATE … WHERE stock > 0'),A('M160 74 V101'),B(4,108,312,68,'Inspect affected rows','1 → insert reservation; 0 → sold out','safe'),A('M160 178 V205'),B(4,212,312,60,'Commit stock + reservation','One local transaction','safe')]}
    ]
  },
  mvcc:{
    title:'One logical row can have two physical versions',
    alt:'An old snapshot was captured before writer T2 committed. It sees version 100 created before T2. An update adds version 70 with xmin T2 and marks the old version xmax T2. A new snapshot after commit sees 70; the old snapshot still sees 100. Vacuum must retain the old version while needed.',
    caption:'xmin names the creator; tuple xmax names the transaction that superseded a version. A snapshot combines an allocation boundary, IDs active at capture, and transaction status to select a version. Committing now does not make a version visible to every older snapshot.',
    scenes:[
      {title:'UPDATE extends the history',items:[B(4,4,312,74,'Old tuple: balance 100','xmin = earlier committed transaction\nxmax = T2'),A('M160 80 V111','new version, same logical row',28,101),B(4,118,312,74,'New tuple: balance 70','xmin = T2; xmax = none'),T(12,232,'T2 commits; both tuples can remain.\nCommit changes visibility, not every\nreader’s snapshot.',38)]},
      {title:'Snapshots choose different tuples',items:[B(4,4,312,68,'Old snapshot → 100','T2 was not visible at capture','safe'),B(4,98,312,68,'New snapshot → 70','Captured after T2 committed','safe'),L(4,194,316,194,'dashed'),T(12,224,'Vacuum cannot remove 100 while\nan active snapshot still needs it.\nStorage cleanup follows visibility.',38)]}
    ]
  },
  lostUpdate:{
    title:'A write lock cannot repair a stale calculation',
    alt:'Client A and B each read stock 2, then each writes its locally calculated value 1. The second write overwrites the first, leaving two reservations but one decrement. A protected stock = stock - 1 operation computes from the current row, producing 2 to 1 to 0.',
    caption:'Read the two columns from top to bottom in time. Serializing the final assignments still loses an update because both assignments contain the same old calculation. Protect the read–decide–write operation or move the computation into an appropriate atomic database operation.',
    scenes:[
      {title:'Stale assignments overwrite',items:[T(16,16,'Client A',15,'label'),T(184,16,'Client B',15,'label'),B(4,37,148,62,'Read 2','Compute 2 − 1'),B(168,37,148,62,'Read 2','Compute 2 − 1'),A('M78 102 V139'),A('M242 102 V177'),B(4,145,148,56,'Write 1','Reservation 1'),B(168,183,148,56,'Write 1','Reservation 2','danger'),T(12,271,'Final stock 1, reservations 2: wrong.',40)]},
      {title:'Compute against protected state',items:[B(4,4,312,62,'A: stock = stock − 1','Protected current row: 2 → 1','safe'),A('M160 72 V108','next writer uses the new value',24,96),B(4,115,312,62,'B: stock = stock − 1','Protected current row: 1 → 0','safe'),T(12,224,'Final stock 0, reservations 2.\nFor the last item, also test stock > 0\nand commit the reservation with it.',39)]}
    ]
  },
  writeSkew:{
    title:'Different rows can still share one invariant',
    alt:'Doctors A and B both see A on call and B on call. A turns its own row off because it read B on; B turns its own row off because it read A on. The writes touch different rows, but both off violates the rule. Read/write dependencies form a cycle.',
    caption:'Each arrow goes from a reader of an old version to the writer that invalidates that observation. Stable snapshots and disjoint writes do not by themselves serialize a cross-row decision. The model rejects a dependency cycle; PostgreSQL SSI uses a different detection algorithm.',
    scenes:[
      {title:'Both decisions look safe locally',items:[B(4,4,312,56,'Shared starting snapshot','A on; B on'),A('M78 62 V96'),A('M242 62 V96'),B(4,104,148,94,'A leaves','Read B = on\nWrite A = off'),B(168,104,148,94,'B leaves','Read A = on\nWrite B = off'),B(4,228,312,54,'Combined: both off','No on-call doctor remains','danger')]},
      {title:'The dependency cycle explains why',items:[B(4,84,112,66,'Tx A','Reads B on'),B(204,84,112,66,'Tx B','Reads A on'),A('M116 98 Q160 4 204 98','A read B’s old row',81,42,'danger'),A('M204 138 Q160 232 116 138','B read A’s old row',81,218,'danger'),T(12,264,'A serial order cannot justify both\nobservations and both decisions.',38)]}
    ]
  },
  validation:{
    title:'Optimistic concurrency validates the read dependencies',
    alt:'A transaction reads key x at version 7 and stages a private write. Before publishing, it compares observed version 7 with the current version. A match permits this version check; current version 8 requires abort and a fresh attempt. Validation and publication must be protected together.',
    caption:'The compared numbers are versions, not values. A changed version means the decision used stale information. In this model, validating the read set and publishing the write set form one protected step. More general serializability also needs correct handling of predicates and concurrent validators.',
    scenes:[
      {title:'Remember what the decision read',items:[B(4,4,312,62,'Read x at version 7','Record dependency: x → 7'),A('M160 70 V99'),B(4,106,312,62,'Compute using that observation','Stage a private write; publish nothing'),T(12,216,'Other transactions may commit\nwhile this transaction computes.',38)]},
      {title:'Compare before publishing',items:[B(4,4,312,60,'Observed version = 7','Compare with current x version'),A('M78 66 V111','7 = 7',36,94),A('M242 66 V111','7 ≠ 8',200,94,'danger'),B(4,118,148,86,'Match','Publish in the\nprotected step','safe'),B(168,118,148,86,'Conflict','Abort; reread\nand recompute','danger'),T(12,250,'A check separated from publication\ncan itself race with another writer.',38)]}
    ]
  },
  locks:{
    title:'Deadlock is a cycle of dependencies',
    alt:'Transaction A holds an exclusive lock on x and requests y. Transaction B holds an exclusive lock on y and requests x. A waits for B and B waits for A. Neither can release by completing. A detector aborts a victim to release its locks; consistent acquisition order prevents this cycle.',
    caption:'The wait-for graph removes the resources and keeps the reason each transaction cannot advance. Arrows point from waiter to blocker. One waiting edge is ordinary contention; the cycle is the deadlock. Locks must cover the complete operation they protect.',
    scenes:[
      {title:'Ownership creates the wait',items:[B(4,4,148,82,'Tx A','Holds x (X)\nRequests y'),B(168,4,148,82,'Tx B','Holds y (X)\nRequests x'),A('M78 90 V134'),A('M242 90 V134'),B(4,142,148,62,'Cannot finish','B owns y','danger'),B(168,142,148,62,'Cannot finish','A owns x','danger'),T(12,253,'X = exclusive: an incompatible\nrequest must wait for its blocker.',38)]},
      {title:'A cycle needs intervention',items:[B(4,85,112,60,'Tx A','Waiting'),B(204,85,112,60,'Tx B','Waiting'),A('M116 98 Q160 10 204 98','A waits for B',103,40,'danger'),A('M204 132 Q160 220 116 132','B waits for A',103,213,'danger'),T(12,258,'Abort a victim → release locks.\nOr require both to acquire x then y.',39)]}
    ]
  },
  retry:{
    title:'Retry the observation and decision, not only the write',
    alt:'An attempt reads two doctors and decides to leave, but validation aborts it after someone else leaves. Reusing that old decision can remove the last doctor. A correct retry starts a new transaction, reads the current one-doctor roster, and decides to stay.',
    caption:'An abort invalidates the decision’s inputs. The retry boundary goes around begin, read, decide, write and commit. External effects need stable identity or durable intent because a database rollback cannot retract an already delivered request.',
    scenes:[
      {title:'An abort invalidates the decision',items:[B(4,4,312,68,'Attempt 1: read 2 doctors','Decide: I can leave'),A('M160 76 V106'),B(4,114,312,68,'Another doctor leaves first','Validation rejects this attempt','danger'),T(12,236,'Reusing “I can leave” repeats\nthe stale assumption.',38)]},
      {title:'A new attempt asks again',items:[C(4,4,312,230,'Whole retry boundary'),B(20,42,280,56,'Begin → read current roster','Only 1 doctor remains'),A('M160 104 V131'),B(20,138,280,70,'Recompute → commit','Stay on call; make no unsafe write','safe'),T(12,269,'Bound retries and handle exhaustion.',40)]}
    ]
  },
  contention:{
    title:'Lock scope determines who must wait',
    alt:'A global lock makes unrelated requests form one queue. Per-key locks let requests for x and y run independently, while requests for x still serialize. A rule spanning x and y cannot be protected by unrelated per-key decisions alone.',
    caption:'Read each lane as a lock ownership interval, not a measured benchmark. Finer locks improve concurrency only when the invariant can safely be protected at that granularity. Shorter lock hold time also reduces the queue.',
    scenes:[
      {title:'One lock, one queue',items:[B(4,4,312,62,'Global lock held by request A','A works on key x'),A('M160 74 V102'),B(4,110,312,62,'B waits for the global lock','B only needs unrelated key y'),B(4,196,312,62,'C waits behind B','C also needs x'),T(12,283,'Unrelated work still waits.',38)]},
      {title:'Independent keys, separate lanes',items:[T(12,16,'Lock x',18,'label'),T(182,16,'Lock y',18,'label'),B(4,38,148,80,'A running','C waits for x'),B(168,38,148,80,'B running','No x conflict','safe'),T(12,181,'Parallel progress is safe only if\nthe protected decisions are independent.',39),T(12,252,'A rule over x + y needs a protocol\nthat protects the combined decision.',39)]}
    ]
  },
  files:{
    title:'File bytes and directory names have different durability',
    alt:'First write a temporary file and fsync its contents. Rename switches the visible target name atomically. Then fsync the containing directory to persist that name change before acknowledging success. A rename alone does not establish power-loss durability.',
    caption:'Follow the two kinds of state: file contents and the directory entry that names them. This is the course’s same-filesystem replacement protocol under its stated persistence assumptions; the native exercise tests process interruption, which is weaker than power loss.',
    scenes:[
      {title:'Prepare complete new contents',items:[B(4,4,312,64,'Write temporary file','New bytes enter the OS cache'),A('M160 72 V108','fsync temporary file',64,96),B(4,116,312,68,'New file contents persisted','The old target name still exists','safe'),T(12,236,'No reader needs to see a partly\nwritten replacement.',38)]},
      {title:'Publish, then persist the name',items:[B(4,4,312,64,'rename(temp, target)','Visible name switches atomically'),A('M160 76 V108','fsync containing directory',42,98),B(4,116,312,68,'Replacement name persisted','Contents and name are recoverable','safe'),A('M160 192 V227'),T(58,253,'Now acknowledge success',30,'label')]}
    ]
  },
  wal:{
    title:'Write-ahead logging separates commit from page flushing',
    alt:'A dirty page at pageLSN 42 may reach storage only after log record 42 is durable. Separately, durable acknowledgement waits for the transaction commit record. Data pages can be flushed later; after a crash, redo reinstalls committed updates absent from disk.',
    caption:'There are two ordering rules. Log-before-page preserves recovery information, including for an uncommitted page flush. Commit-record-before-acknowledgement makes a durable commit recoverable. Commit does not require every data page to be flushed in a no-force design.',
    scenes:[
      {title:'Before any changed page flush',items:[B(4,4,312,64,'Append update at LSN 42','Buffer page now has pageLSN = 42'),A('M160 76 V108','flush log through at least 42',37,98),B(4,116,312,60,'Recovery record is durable','WAL barrier crossed','safe'),A('M160 188 V216'),B(4,224,312,58,'Page flush is now permitted','Disk may now contain that update')]},
      {title:'Before durable success to caller',items:[B(4,4,312,64,'Append COMMIT at LSN 45','This transaction has one outcome'),A('M160 76 V108','flush log through 45',66,98),B(4,116,312,60,'Acknowledge durable commit','Data pages may still be old','safe'),T(12,232,'After a crash, durable log records\nlet redo restore missing page changes.\nAn unflushed log tail can be lost.',39)]}
    ]
  },
  recovery:{
    title:'Why recovery needs both redo and undo',
    alt:'No-force allows a committed update to remain only in a lost buffer, so redo restores its durable logged value. Steal allows an uncommitted update to have reached disk, so undo removes the loser’s effect. A pageLSN guard prevents a redo record from being applied twice.',
    caption:'The two policies create different recovery jobs. “Redo” does not mean blindly adding a change again: inspect the durable page’s pageLSN and the log record’s LSN before applying it. The foundation model uses before/after images; the optional ARIES lab adds compensation records.',
    scenes:[
      {title:'No-force → redo missing changes',items:[B(4,4,312,66,'Durable COMMIT + update log','Buffer lost; disk still holds 100'),A('M160 76 V108','redo only if the page is behind',24,98),B(4,116,312,66,'Reinstall committed value 70','Advance pageLSN with the page','safe'),T(12,230,'Already at this record’s LSN? Skip.\nRepeated recovery must converge.',39)]},
      {title:'Steal → undo unfinished work',items:[B(4,4,312,66,'No durable COMMIT','Uncommitted 70 reached disk','danger'),A('M160 76 V108','undo using recovery information',26,98),B(4,116,312,66,'Restore the loser’s old value','Retain committed transactions','safe'),T(12,230,'Analysis finds unfinished work.\nRedo and undo restore one outcome.',39)]}
    ]
  },
  twoPhase:{
    title:'Prepared is a durable promise, not a final decision',
    alt:'In phase one, each participant persists PREPARED before voting yes and retains required resources. In phase two, the coordinator durably records COMMIT before telling participants. If one participant receives COMMIT and another times out, the prepared participant must wait for authoritative resolution.',
    caption:'Trace the durable writes before the messages that rely on them. A YES vote promises the participant can obey the eventual decision after a restart. A timeout says that communication failed; it does not prove that the global decision was abort.',
    scenes:[
      {title:'Phase 1: collect durable promises',items:[B(4,4,312,56,'Coordinator sends PREPARE','Ask every required participant'),A('M78 64 V106'),A('M242 64 V106'),B(4,114,148,86,'Participant A','Persist PREPARED\nThen vote YES'),B(168,114,148,86,'Participant B','Persist PREPARED\nThen vote YES'),T(12,249,'Prepared participants retain enough\nstate and resources to honor either\nauthoritative final decision.',39)]},
      {title:'Phase 2: distribute the outcome',items:[B(4,4,312,62,'Coordinator persists COMMIT','Only after all required YES votes','safe'),A('M78 76 V131','COMMIT',30,104),A('M242 76 V131','message lost',188,104,'danger'),B(4,139,148,80,'A commits','Final decision\nreceived','safe'),B(168,139,148,80,'B waits','Still PREPARED\nCannot guess','danger'),T(12,266,'Recovery resends the stable decision.',40)]}
    ]
  },
  replication:{
    title:'Replicating a decision needs a protocol, not just copies',
    alt:'A leader-only entry may disappear from the surviving group if acknowledged too early. A Raft-style protocol combines majority replication, terms, election log restrictions and prefix matching to preserve committed entries. A coordinator quorum is separate from all required participant YES votes.',
    caption:'A majority is meaningful together with the election and log rules that preserve its entries. For Raft-style commit advancement, the leader commits an entry from its current term on a majority, bringing its earlier prefix with it. Agreement among coordinator replicas does not invent missing participant votes.',
    scenes:[
      {title:'A local append is not enough',items:[B(4,4,312,56,'Leader A: COMMIT at index 4','Only A has persisted this record'),A('M160 68 V104','A fails before replication',57,91,'danger'),B(4,112,148,76,'Replica B','Log ends at 3'),B(168,112,148,76,'Replica C','Log ends at 3'),T(12,235,'An early success reply cannot be\njustified by A’s local write alone.',39)]},
      {title:'Preserve the committed prefix',items:[B(4,4,312,56,'Leader A: index 4, term 2','Current-term entry persisted','safe'),A('M78 66 V97','copied',30,88),A('M242 66 V97','not yet',202,88,'danger'),B(4,105,148,70,'B: [4, t2]','Persisted copy','safe'),B(168,105,148,70,'C: [3, t1]','Missing index 4'),T(12,211,'A + B = durable majority. Advance\ncommitIndex; acknowledge the entry.',39),T(12,267,'Future elections preserve this prefix\nthrough the protocol’s log rules.',39)]}
    ]
  },
  outbox:{
    title:'Commit the event intent with the business change',
    alt:'A direct database commit followed by a broker publish has a crash gap. An outbox instead stores paid status and a dispatch event row in one database transaction. A relay publishes the durable event later and may publish it again after a lost acknowledgement, so the consumer must deduplicate effects.',
    caption:'The dashed box is one local atomic boundary. The arrow to the broker crosses that boundary and needs its own recovery loop. A durable intent prevents a lost event; stable event identity and consumer deduplication handle repeated delivery.',
    scenes:[
      {title:'The dual-write gap',items:[B(4,4,312,60,'Database: order = paid','Local transaction commits'),A('M160 70 V112','CRASH: dispatch intent is lost',31,96,'danger'),B(4,120,312,60,'Broker: no event','Paid order has no dispatch','danger'),T(12,232,'Publishing first moves the gap:\nthe event can outlive a failed order.',39)]},
      {title:'Persist intent, then relay',items:[C(4,4,312,144,'One local database transaction'),B(20,40,280,88,'Paid order + outbox row','Event e17: dispatch this order\nCommit both together','safe'),A('M160 152 V191','relay can retry e17',79,178),B(4,199,312,66,'Broker → consumer','Deduplicate e17 with the effect','safe')]}
    ]
  },
  idempotency:{
    title:'A lost reply does not mean the transaction failed',
    alt:'A server commits a charge with request key k and records the payload and result, but its reply is lost. Retrying the same key and payload returns the recorded result instead of another charge. Reusing the key for a different payload is rejected; effect and identity record must share the relevant atomic boundary.',
    caption:'Follow identity k across attempts. The durable identity/result record converts an ambiguous outcome into a lookup. Protect the first execution against concurrent duplicates and bind the key to the payload. An external provider must offer the corresponding guarantee at its own boundary.',
    scenes:[
      {title:'The uncertainty is at the client',items:[B(4,4,312,58,'Client sends key k, amount 30','One intended charge'),A('M160 68 V104'),B(4,112,312,66,'Server commits charge + result','k → payload 30, result receipt R','safe'),A('M160 190 V224','reply lost',121,216,'danger'),T(20,254,'Timeout: outcome is unknown',36,'label')]},
      {title:'Retry the same identity',items:[B(4,4,312,58,'Retry k with amount 30','Find committed request/result record'),A('M160 70 V105'),B(4,113,312,66,'Return receipt R','Do not perform a second charge','safe'),B(4,215,312,62,'Retry k with amount 40','Reject conflicting payload','danger')]}
    ]
  },
  saga:{
    title:'Compensation is new work after an earlier commit',
    alt:'Inventory reservation commits before payment is attempted. If payment is declined, a later release operation must compensate the reservation. The release can also fail or succeed with a lost reply, so the workflow must persist pending compensation and retry with stable identity. This is not rollback of the earlier transaction.',
    caption:'Each box has its own local commit. Other actors may observe those committed states. Compensation is a business action with its own failure modes; keep it pending until an authoritative result is recorded, and define what to do if the action cannot fully reverse the original effect.',
    scenes:[
      {title:'The earlier action is committed',items:[B(4,4,312,58,'Reserve stock: COMMIT','Reservation now exists','safe'),A('M160 70 V102'),B(4,110,312,62,'Attempt payment','Payment is declined','danger'),A('M160 184 V216'),B(4,224,312,56,'Need a new release operation','Rollback cannot erase the old commit')]},
      {title:'Persist unfinished compensation',items:[B(4,4,312,60,'Workflow: release pending','Store reservation and operation IDs'),A('M160 72 V106','retry safely after failure',58,95),B(4,114,312,68,'Release reservation','Idempotent compensation action'),A('M160 194 V221'),B(4,229,312,54,'Record confirmed completion','Do not declare recovery early','safe')]}
    ]
  },
  design:{
    title:'Map every promise to the boundary that enforces it',
    alt:'The order database atomically owns stock, reservation, workflow state and outbox intent. The payment service owns charges, the broker owns event delivery, and the consumer owns dispatch effects and deduplication. Each boundary needs recovery and stable identity; no local database commit spans all services.',
    caption:'For each boundary, ask: which identifier survives retries, who stores the outcome, and what restarts unfinished work? Inventory, charges, deliveries and dispatch effects need independent checks. A passing order count does not establish all four promises.',
    scenes:[
      {title:'Draw what one commit owns',items:[C(4,4,312,188,'Order database: one local transaction'),B(20,40,280,62,'Stock + reservation','Protect the inventory invariant'),B(20,116,280,56,'Workflow + outbox intent','Persist the next work to perform'),T(12,240,'A database commit cannot atomically\ncommit a remote charge or dispatch.',39)]},
      {title:'Name the crossing guarantees',items:[B(4,4,312,62,'Payment service','Request key → one intended charge'),B(4,91,312,62,'Broker delivery','Stable event ID → retries possible'),B(4,178,312,76,'Dispatch consumer','Deduplication + effect share its own\natomic boundary'),T(12,283,'Recover each crossing explicitly.',39)]}
    ]
  },
  aries:{
    title:'ARIES logs the rollback so rollback can restart',
    alt:'Transaction T2 has UPDATE 5, UPDATE 8 with prevLSN 5, and ABORT 11 with prevLSN 8. Undoing UPDATE 8 appends CLR 13: prevLSN 11 follows transaction log order; undoNextLSN 5 skips the already compensated UPDATE 8. Restart redoes durable compensation if missing from the page, then follows the skip pointer for remaining undo.',
    caption:'A compensation log record (CLR) describes a redo-only recovery action. Its prevLSN preserves transaction history; its undoNextLSN identifies where rollback should resume. The CLR obeys WAL too: make it durable before its changed page can reach storage. This diagram is the advanced continuation of redo/undo.',
    scenes:[
      {title:'Append compensation to history',items:[B(4,4,312,58,'UPDATE 5: B += 20','Earlier unfinished change by T2'),A('M160 66 V87'),B(4,94,312,58,'UPDATE 8: B += 5','prevLSN = 5'),A('M160 160 V181'),B(4,188,312,58,'ABORT 11','prevLSN = 8'),T(12,278,'Chronology runs down; prevLSN goes back.',42)]},
      {title:'Two links, two different jobs',items:[B(4,4,312,78,'CLR 13: B −= 5','Compensates UPDATE 8; redo-only\nprevLSN = 11; undoNextLSN = 5','safe'),A('M80 90 V137','history link',12,119),A('M240 90 V137','undo skip link',184,119),B(4,145,148,64,'ABORT 11','prevLSN target'),B(168,145,148,64,'UPDATE 5','Resume undo','safe'),T(12,249,'Restart: redo missing CLR action,\nthen continue undo at 5, not at 8.',39)]}
    ]
  }
};
