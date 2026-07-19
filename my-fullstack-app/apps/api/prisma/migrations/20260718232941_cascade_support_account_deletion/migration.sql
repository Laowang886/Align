-- DropForeignKey
ALTER TABLE "FeedbackSubmission" DROP CONSTRAINT "FeedbackSubmission_userId_fkey";

-- DropForeignKey
ALTER TABLE "SafetyReport" DROP CONSTRAINT "SafetyReport_userId_fkey";

-- AddForeignKey
ALTER TABLE "FeedbackSubmission" ADD CONSTRAINT "FeedbackSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyReport" ADD CONSTRAINT "SafetyReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
