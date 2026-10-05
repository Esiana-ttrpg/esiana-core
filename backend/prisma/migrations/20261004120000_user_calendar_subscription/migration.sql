CREATE TABLE "UserCalendarSubscription" (
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "lastAccessAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCalendarSubscription_pkey" PRIMARY KEY ("userId"),
    CONSTRAINT "UserCalendarSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "UserCalendarSubscription_tokenHash_key" ON "UserCalendarSubscription"("tokenHash");
