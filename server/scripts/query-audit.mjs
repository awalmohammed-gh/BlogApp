// Read-only explain audit. The native client does not initialize models or create indexes.
import { MongoClient } from "mongodb";
import env from "../src/config/env.js";
import { mkdir, writeFile } from "node:fs/promises";
const client = new MongoClient(env.MONGODB_URI);
try {
  await client.connect(); const db = client.db();
  const article = await db.collection("articles").findOne({status:"published"},{projection:{category:1,slug:1,author:1}});
  const admin = await db.collection("admins").findOne({status:"active"},{projection:{_id:1}});
  const now = new Date();
  const tests = [
    ["latest", "articles", {status:"published",publishedAt:{$lte:now}}, {publishedAt:-1,_id:-1}],
    ["category", "articles", {status:"published",category:article?.category,publishedAt:{$lte:now}}, {publishedAt:-1,_id:-1}],
    ["slug", "articles", {slug:article?.slug,status:"published",publishedAt:{$lte:now}}, null],
    ["approvedComments", "articlecomments", {articleId:article?._id,status:"approved"}, {createdAt:-1,_id:-1}],
    ["notifications", "notifications", {recipientId:admin?._id,isArchived:false}, {createdAt:-1,_id:-1}]
  ];
  const report={measuredAt:new Date().toISOString(), replicaSet:Boolean((await db.admin().command({hello:1})).setName), counts:{articles:await db.collection("articles").estimatedDocumentCount(),pageViews:await db.collection("pageviewevents").estimatedDocumentCount()}, queries:{}, indexes:{}};
  for(const [name,collection,filter,sort] of tests){
    let query=db.collection(collection).find(filter).limit(12);if(sort)query=query.sort(sort);
    const result=await query.explain("executionStats");const stats=result.executionStats;
    report.queries[name]={returned:stats.nReturned,docsExamined:stats.totalDocsExamined,keysExamined:stats.totalKeysExamined,timeMs:stats.executionTimeMillis,winningPlan:result.queryPlanner.winningPlan};
    if(!report.indexes[collection])report.indexes[collection]=await db.collection(collection).indexes();
  }
  await mkdir("../performance",{recursive:true});await writeFile(`../performance/queries-${process.argv[2]||"baseline"}.json`,JSON.stringify(report,null,2));
  console.log(JSON.stringify({replicaSet:report.replicaSet,counts:report.counts,queries:Object.fromEntries(Object.entries(report.queries).map(([key,{winningPlan,...value}])=>[key,value]))},null,2));
}finally{await client.close();}
