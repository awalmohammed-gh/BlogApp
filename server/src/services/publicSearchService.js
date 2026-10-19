import mongoose from "mongoose";
import ArticleRevision from "../models/ArticleRevision.js";

// Search the immutable published revision, never an unpublished working edit.
// The pipeline joins through the indexed publishedRevision pointer and paginates
// inside MongoDB. Legacy published articles without revisions use their own text index.
export async function searchPublishedArticles({ filter, search, sort, skip, limit }) {
  const match = { ...filter };
  for(const key of ["category","tags"]) {
    if(typeof match[key] === "string")match[key]=new mongoose.Types.ObjectId(match[key]);
  }
  const result = await ArticleRevision.aggregate([
    { $match:{ $text:{ $search:search }, isApproved:true } },
    { $lookup:{ from:"articles",localField:"_id",foreignField:"publishedRevision",as:"article",pipeline:[{$match:match}] } },
    { $unwind:"$article" },
    { $set:{ "article.title":"$title" } },
    { $replaceRoot:{ newRoot:"$article" } },
    { $unionWith:{ coll:"articles",pipeline:[{$match:{...match,publishedRevision:null,$text:{$search:search}}}] } },
    { $facet:{ items:[{$sort:sort},{$skip:skip},{$limit:limit},{$project:{_id:1}}],count:[{$count:"total"}] } }
  ]).option({maxTimeMS:5000});
  return { ids:result[0]?.items.map((item)=>item._id)||[],total:result[0]?.count[0]?.total||0 };
}
