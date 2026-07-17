-- An external provider identity may be linked to only one local user.
CREATE UNIQUE INDEX "User_provider_providerId_key" ON "User"("provider", "providerId");
