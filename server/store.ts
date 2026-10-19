import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
process.umask(0o077);
const filename=resolve(process.env.PLOTWAKE_DB||'data/plotwake.sqlite');
mkdirSync(dirname(filename),{recursive:true,mode:0o700});
const db=new DatabaseSync(filename);
db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS pulse (id TEXT PRIMARY KEY, value TEXT NOT NULL)');
export async function read(key:string,fallback:unknown):Promise<any>{const row=db.prepare('SELECT value FROM pulse WHERE id = ?').get(key) as {value:string}|undefined;return row?JSON.parse(row.value):fallback;}
export async function write(key:string,value:unknown){db.prepare('INSERT INTO pulse (id,value) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value').run(key,JSON.stringify(value));}
