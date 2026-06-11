import {
  assertNoSecretKeys,
  type BuildMetadata,
  type MaintenanceState,
  type ReleaseCatalog,
  type ServiceIdentity,
  type UpdateMode,
} from './contracts.ts'

const isoDatePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/u

export const normalizeBuildMetadata = (input: Partial<BuildMetadata> & {
  commitSha: string
}): BuildMetadata => {
  const shortCommitSha = input.shortCommitSha ?? input.commitSha.slice(0, 12)
  return {
    buildId: input.buildId ?? shortCommitSha,
    commitSha: input.commitSha,
    shortCommitSha,
    version: input.version ?? shortCommitSha,
    committedAt: input.committedAt ?? new Date(0).toISOString(),
    ...(input.deployedAt ? { deployedAt: input.deployedAt } : {}),
  }
}

export const buildReleaseCatalog = (input: {
  service: ServiceIdentity
  build: BuildMetadata
  updateMode: UpdateMode
  patchNotesSource: string
  releaseNotes?: ReleaseCatalog['releaseNotes']
  maintenance: MaintenanceState
}): ReleaseCatalog => {
  const catalog: ReleaseCatalog = {
    service: input.service,
    currentBuild: input.build,
    updateMode: input.updateMode,
    patchNotesSource: input.patchNotesSource,
    ...(input.releaseNotes ? { releaseNotes: input.releaseNotes } : {}),
    maintenance: {
      enabled: input.maintenance.enabled,
      ...(input.maintenance.message ? { message: input.maintenance.message } : {}),
    },
  }

  assertNoSecretKeys(catalog)
  return catalog
}

export const validateReleaseCatalog = (catalog: ReleaseCatalog): void => {
  if (!catalog.service.id) {
    throw new Error('Release catalog is missing service id.')
  }
  if (!catalog.currentBuild.commitSha || catalog.currentBuild.commitSha.length < 7) {
    throw new Error('Release catalog is missing a usable commit SHA.')
  }
  if (!isoDatePattern.test(catalog.currentBuild.committedAt)) {
    throw new Error('Release catalog committedAt must be an ISO timestamp.')
  }
  if (!catalog.patchNotesSource.startsWith('/')) {
    throw new Error('Release catalog patchNotesSource should be root-relative.')
  }
  if (catalog.releaseNotes?.discordStatus === 'skipped' && !catalog.releaseNotes.discordSkipReason) {
    throw new Error('Skipped Discord announcements require a skip reason.')
  }
  assertNoSecretKeys(catalog)
}
