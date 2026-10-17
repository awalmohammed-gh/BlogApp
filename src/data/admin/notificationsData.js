export const initialNotifications = [
  {
    id: "notif-1",
    title: "Article Submitted for Review",
    message: "Abdul Gaffar submitted 'Underdog Team Upsets Top Seed' for senior editorial clearance.",
    type: "submission",
    timestamp: "12 minutes ago",
    read: false,
    targetUrl: "/admin/editorial",
    actorName: "Abdul Gaffar",
    relatedItem: "Underdog Team Upsets Top Seed"
  },
  {
    id: "notif-2",
    title: "New Comment Awaiting Moderation",
    message: "Daniel Mensah posted a comment on 'Underdog Team Upsets Top Seed' requiring approval.",
    type: "comment",
    timestamp: "45 minutes ago",
    read: false,
    targetUrl: "/admin/comments",
    actorName: "Daniel Mensah",
    relatedItem: "Comment #com-4"
  },
  {
    id: "notif-3",
    title: "Scheduled Post Reminder",
    message: "'Olympic Trials Set New Records' is queued for automated release on October 25 at 09:00 UTC.",
    type: "schedule",
    timestamp: "2 hours ago",
    read: false,
    targetUrl: "/admin/articles",
    actorName: "System Scheduler",
    relatedItem: "Scheduled Article #10"
  },
  {
    id: "notif-4",
    title: "Editorial Revision Requested",
    message: "Sarah Mensah requested revisions on paragraph 3 of 'Team A Clinches National Championship'.",
    type: "revision",
    timestamp: "5 hours ago",
    read: true,
    targetUrl: "/admin/editorial",
    actorName: "Sarah Mensah",
    relatedItem: "Revisions Requested"
  },
  {
    id: "notif-5",
    title: "Article Approved & Published",
    message: "'Marathon World Record Shattered' was approved by Mohammed Awal and is now live on the news wire.",
    type: "approval",
    timestamp: "1 day ago",
    read: true,
    targetUrl: "/admin/articles",
    actorName: "Mohammed Awal",
    relatedItem: "Marathon World Record Shattered"
  },
  {
    id: "notif-6",
    title: "Commercial Campaign Activated",
    message: "Sponsored partner feature 'NewsFront Executive Briefings 2026' is now actively displaying on the homepage.",
    type: "system",
    timestamp: "2 days ago",
    read: true,
    targetUrl: "/admin/advertisements",
    actorName: "Commercial Desk",
    relatedItem: "NewsFront Media Solutions"
  }
];
