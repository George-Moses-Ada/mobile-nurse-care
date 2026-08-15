import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

// Simple in-memory database for development - use global to persist across requests
if (!(globalThis as any).__memoryDb) {
  (globalThis as any).__memoryDb = {
    users: [] as any[],
    sessions: [] as any[],
  };
}
const memoryDb = (globalThis as any).__memoryDb;

export function getDb() {
  // Check if running in Cloudflare environment
  if (typeof (globalThis as any).DB !== "undefined") {
    const db = (globalThis as any).DB;
    return drizzle(db, { schema });
  }
  
  // Use simple mock database for development
  return {
    select: (table: any) => ({
      from: (t: any) => ({
        where: (condition: any) => ({
          limit: (n?: number) => {
            console.log("DB SELECT - current users:", memoryDb.users.length);
            
            let results: any[] = [];
            
            // Try to extract value from condition - handle Drizzle eq() structure
            let value = null;
            let column = null;
            
            if (condition && typeof condition === 'object') {
              // Handle Drizzle eq() which might have nested structure
              const keys = Object.keys(condition);
              console.log("DB SELECT - condition keys:", keys);
              
              if (keys.length > 0) {
                const key = keys[0];
                column = key;
                value = condition[key];
                console.log(`DB SELECT - extracted: column=${column}, value=${value}`);
              }
            }
            
            // Check table by comparing with schema references
            let tableName = 'unknown';
            if (table === schema.users) {
              tableName = 'users';
            } else if (table === schema.sessions) {
              tableName = 'sessions';
            } else if (table?.name) {
              tableName = table.name;
            }
            
            console.log("DB SELECT - table name:", tableName);
            
            if (tableName === 'users') {
              if (column === 'email' && value) {
                results = memoryDb.users.filter((u: any) => u.email === value);
                console.log(`DB SELECT - found ${results.length} users with email ${value}`);
              } else if (column === 'id' && value) {
                results = memoryDb.users.filter((u: any) => u.id === value);
                console.log(`DB SELECT - found ${results.length} users with id ${value}`);
              } else {
                results = memoryDb.users;
                console.log(`DB SELECT - returning all ${results.length} users`);
              }
            } else if (tableName === 'sessions') {
              if (column === 'token' && value) {
                results = memoryDb.sessions.filter((s: any) => s.token === value);
                console.log(`DB SELECT - found ${results.length} sessions with token ${value}`);
              } else if (column === 'userId' && value) {
                results = memoryDb.sessions.filter((s: any) => s.userId === value);
                console.log(`DB SELECT - found ${results.length} sessions with userId ${value}`);
              } else {
                results = memoryDb.sessions;
                console.log(`DB SELECT - returning all ${results.length} sessions`);
              }
            }
            
            return n ? results.slice(0, n) : results;
          }
        })
      })
    }),
    insert: (table: any) => ({
      values: (data: any) => ({
        returning: () => {
          const newItem = { id: Date.now(), ...data };
          console.log("DB INSERT - data:", JSON.stringify(data));
          
          let tableName = 'unknown';
          if (table === schema.users) {
            tableName = 'users';
          } else if (table === schema.sessions) {
            tableName = 'sessions';
          } else if (table?.name) {
            tableName = table.name;
          }
          
          console.log("DB INSERT - table name:", tableName);
          
          if (tableName === 'users') {
            memoryDb.users.push(newItem);
            console.log(`DB INSERT - user added. Total users: ${memoryDb.users.length}`);
            console.log("DB INSERT - user email:", newItem.email);
            return [newItem];
          }
          if (tableName === 'sessions') {
            memoryDb.sessions.push(newItem);
            console.log(`DB INSERT - session added. Total sessions: ${memoryDb.sessions.length}`);
            return [newItem];
          }
          return [newItem];
        }
      })
    }),
    delete: (table: any) => ({
      where: (condition: any) => {
        let value = null;
        let column = null;
        
        if (condition && typeof condition === 'object') {
          const keys = Object.keys(condition);
          if (keys.length > 0) {
            column = keys[0];
            value = condition[column];
          }
        }
        
        let tableName = 'unknown';
        if (table === schema.sessions) {
          tableName = 'sessions';
        } else if (table?.name) {
          tableName = table.name;
        }
        
        if (tableName === 'sessions' && column === 'token' && value) {
          memoryDb.sessions = memoryDb.sessions.filter((s: any) => s.token !== value);
          console.log(`DB DELETE - removed session with token ${value}`);
        }
      }
    })
  };
}
