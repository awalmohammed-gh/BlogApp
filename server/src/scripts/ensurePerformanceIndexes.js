import mongoose from "mongoose";
import env from "../config/env.js";
import Article from "../models/Article.js";
import ArticleRevision from "../models/ArticleRevision.js";
import Notification from "../models/Notification.js";
import ArticleComment from "../models/ArticleComment.js";
import { readingMinutes } from "../utils/readingMinutes.js";

try {
  await mongoose.connect(env.MONGODB_URI,{autoIndex:false,dbName:env.MONGODB_DB_NAME});
  for(const model of [Article,ArticleRevision,Notification,ArticleComment]){await model.createIndexes();console.log(`${model.modelName}: declared indexes ready`);}
  let updated=0;let batch=[];
  const cursor=Article.find({status:"published",publicReadingMinutes:null}).select("content publishedRevision").populate("publishedRevision","content").lean().cursor({batchSize:100});
  for await(const doc of cursor){batch.push({updateOne:{filter:{_id:doc._id,publicReadingMinutes:null},update:{$set:{publicReadingMinutes:readingMinutes(doc.publishedRevision?.content ?? doc.content)}}}});if(batch.length===100){await Article.collection.bulkWrite(batch);updated+=batch.length;batch=[];}}
  if(batch.length){await Article.collection.bulkWrite(batch);updated+=batch.length;}
  console.log(`Derived reading-time metadata filled: ${updated}; article content and timestamps unchanged.`);
  if(process.argv.includes("--prune-replaced")){
    const indexes=await Article.collection.indexes();
    for(const old of indexes.filter((index)=>!index.unique && ["status_1_publishedAt_-1","category_1_status_1_publishedAt_-1","isFeatured_1_status_1_publishedAt_-1","isBreakingNews_1_status_1_publishedAt_-1"].includes(index.name))){
      const replacement=indexes.find((index)=>index.name===`${old.name}__id_-1`);if(!replacement)throw new Error(`Replacement missing for ${old.name}`);
      await Article.collection.dropIndex(old.name);console.log(`Removed superseded prefix index: ${old.name}`);
    }
  }
}finally{await mongoose.disconnect();}
