// One lease per minute across all visitors/functions, <=4 concurrent requests,
// <=20 starts/second (official TSE limit is 100/IP/second). Never visitor-scaled.
export const liveCollection={batchSize:400,concurrency:4,startBudgetMs:30000,maxStartsPerSecond:20};
// Scheduled functions have a shorter 30s platform limit; reserve room for the
// last 8s upstream timeout and metadata operations. Slow rounds resume next tick.
export const scheduledCollection={...liveCollection,startBudgetMs:18000};
