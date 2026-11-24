ALTER TABLE "MapPin" ADD COLUMN "createdByUserId" TEXT CONSTRAINT "MapPin_createdByUserId_fkey" REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MapPin" ADD COLUMN "updatedByUserId" TEXT CONSTRAINT "MapPin_updatedByUserId_fkey" REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "MapPin_createdByUserId_idx" ON "MapPin"("createdByUserId");

ALTER TABLE "MapLayer" ADD COLUMN "createdByUserId" TEXT CONSTRAINT "MapLayer_createdByUserId_fkey" REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MapLayer" ADD COLUMN "updatedByUserId" TEXT CONSTRAINT "MapLayer_updatedByUserId_fkey" REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "MapLayer_createdByUserId_idx" ON "MapLayer"("createdByUserId");

ALTER TABLE "MapObjectGroup" ADD COLUMN "createdByUserId" TEXT CONSTRAINT "MapObjectGroup_createdByUserId_fkey" REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MapObjectGroup" ADD COLUMN "updatedByUserId" TEXT CONSTRAINT "MapObjectGroup_updatedByUserId_fkey" REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "MapObjectGroup_createdByUserId_idx" ON "MapObjectGroup"("createdByUserId");

ALTER TABLE "MapSceneObject" ADD COLUMN "createdByUserId" TEXT CONSTRAINT "MapSceneObject_createdByUserId_fkey" REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MapSceneObject" ADD COLUMN "updatedByUserId" TEXT CONSTRAINT "MapSceneObject_updatedByUserId_fkey" REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "MapSceneObject_createdByUserId_idx" ON "MapSceneObject"("createdByUserId");

ALTER TABLE "MapObjectKeyframe" ADD COLUMN "createdByUserId" TEXT CONSTRAINT "MapObjectKeyframe_createdByUserId_fkey" REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MapObjectKeyframe" ADD COLUMN "updatedByUserId" TEXT CONSTRAINT "MapObjectKeyframe_updatedByUserId_fkey" REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "MapObjectKeyframe_createdByUserId_idx" ON "MapObjectKeyframe"("createdByUserId");

ALTER TABLE "MapPresentationPreset" ADD COLUMN "createdByUserId" TEXT CONSTRAINT "MapPresentationPreset_createdByUserId_fkey" REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MapPresentationPreset" ADD COLUMN "updatedByUserId" TEXT CONSTRAINT "MapPresentationPreset_updatedByUserId_fkey" REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "MapPresentationPreset_createdByUserId_idx" ON "MapPresentationPreset"("createdByUserId");
