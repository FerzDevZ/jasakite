import { z } from "zod"

/**
 * Bacaan konfigurasi + deployment Vercel untuk halaman admin.
 *
 * Semua fungsi di sini murni terhadap data yang diberikan (payload API dan
 * objek environment). Tidak ada modul ini yang menyentuh jaringan saat diimpor,
 * supaya bisa diuji tanpa memanggil Vercel dan supaya route handler yang
 * memakainya tetap mudah dibaca.
 */

export const VERCEL_API_BASE = "https://api.vercel.com"

/** Nama variabel environment yang dibutuhkan, tanpa nilainya. */
export const VERCEL_ENV = {
  token: "VERCEL_TOKEN",
  projectId: "VERCEL_PROJECT_ID",
  teamId: "VERCEL_TEAM_ID",
} as const

export type VercelTarget = "production" | "preview" | "development"

export type DeploymentSummary = {
  id: string
  url: string
  target: VercelTarget
  state: string
  /**
   * `CANCELED` di Vercel dipakai untuk dua hal: build yang dilewati Ignored
   * Build Step dan pembatalan manual. API tidak membedakannya, jadi medan ini
   * bernama apa adanya — bukan `skippedByGate`, yang akan mengklaim sebab.
   */
  canceled: boolean
  commitSha: string | null
  commitRef: string | null
  commitMessage: string | null
  createdAt: number
  durationMs: number | null
}

export type VercelCredentials = {
  configured: boolean
  missingEnvVars: string[]
  token: string | null
  projectId: string | null
  teamId: string | null
}

const deploymentSchema = z
  .object({
    // `uid` ada di REST API, tetapi keluaran lain (mis. `vercel ls --json`)
    // hanya membawa `url`/`name`. Mewajibkan `uid` akan membuang seluruh baris
    // tanpa satu pun galat, jadi identitas diterima dari beberapa sumber.
    uid: z.string().nullish(),
    id: z.string().nullish(),
    url: z.string().nullish(),
    name: z.string().nullish(),
    state: z.string().nullish(),
    target: z.string().nullish(),
    createdAt: z.number().nullish(),
    created: z.number().nullish(),
    buildingAt: z.number().nullish(),
    ready: z.number().nullish(),
    meta: z.record(z.string()).nullish(),
  })
  .passthrough()

const deploymentListSchema = z
  .object({
    deployments: z.array(z.unknown()).default([]),
  })
  .passthrough()

/** Sumber perintah "Ignored Build Step" yang benar-benar dipakai Vercel. */
export type IgnoredBuildStepSource = "dashboard" | "vercel.json" | "none"

export type IgnoredBuildStepResolution = {
  repositoryCommand: string | null
  dashboardCommand: string | null
  effectiveCommand: string | null
  source: IgnoredBuildStepSource
  /** Dashboard diset DAN berbeda dari `vercel.json` — repo tidak lagi jadi acuan. */
  overridden: boolean
}

function normalizeCommand(command: string | null | undefined): string | null {
  if (typeof command !== "string") return null
  const normalized = command.trim().replace(/\s+/g, " ")
  return normalized.length > 0 ? normalized : null
}

/**
 * Menentukan perintah mana yang menang.
 *
 * Aturan Vercel: isian di Project Settings → Git → Ignored Build Step
 * menimpa `ignoreCommand` di `vercel.json`, dan berlaku untuk SEMUA environment
 * (produksi maupun preview) karena setelan itu per project, bukan per
 * environment. Karena itu halaman admin perlu menyebut sumbernya, bukan hanya
 * menampilkan `vercel.json` yang mungkin sudah tidak dipakai.
 */
export function resolveIgnoredBuildStep(input: {
  repositoryCommand: string | null
  dashboardCommand: string | null
}): IgnoredBuildStepResolution {
  const repositoryCommand = normalizeCommand(input.repositoryCommand)
  const dashboardCommand = normalizeCommand(input.dashboardCommand)

  if (dashboardCommand !== null) {
    return {
      repositoryCommand,
      dashboardCommand,
      effectiveCommand: dashboardCommand,
      source: "dashboard",
      overridden: dashboardCommand !== repositoryCommand,
    }
  }

  return {
    repositoryCommand,
    dashboardCommand: null,
    effectiveCommand: repositoryCommand,
    source: repositoryCommand === null ? "none" : "vercel.json",
    overridden: false,
  }
}

function readTrimmedEnv(
  environment: Record<string, string | undefined>,
  name: string
): string | null {
  const rawValue = environment[name]
  if (typeof rawValue !== "string") return null
  const trimmed = rawValue.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function resolveVercelCredentials(
  environment: Record<string, string | undefined>
): VercelCredentials {
  const token = readTrimmedEnv(environment, VERCEL_ENV.token)
  const projectId = readTrimmedEnv(environment, VERCEL_ENV.projectId)
  const teamId = readTrimmedEnv(environment, VERCEL_ENV.teamId)

  // `VERCEL_TEAM_ID` opsional: project milik akun pribadi tidak memilikinya.
  const missingEnvVars: string[] = []
  if (token === null) missingEnvVars.push(VERCEL_ENV.token)
  if (projectId === null) missingEnvVars.push(VERCEL_ENV.projectId)

  return {
    configured: missingEnvVars.length === 0,
    missingEnvVars,
    token,
    projectId,
    teamId,
  }
}

function normalizeTarget(rawTarget: string | null | undefined): VercelTarget {
  if (rawTarget === "production") return "production"
  if (rawTarget === "development") return "development"
  // Vercel mengirim `null` untuk deployment preview, bukan "preview".
  return "preview"
}

export function summarizeDeployment(rawDeployment: unknown): DeploymentSummary | null {
  const parsed = deploymentSchema.safeParse(rawDeployment)
  if (!parsed.success) return null

  const deployment = parsed.data
  const meta = deployment.meta ?? {}
  const createdAt = deployment.createdAt ?? deployment.created ?? 0
  const state = deployment.state ?? "UNKNOWN"
  const buildingAt = deployment.buildingAt ?? null
  const ready = deployment.ready ?? null

  const identifier =
    deployment.uid ?? deployment.id ?? deployment.url ?? deployment.name ?? null
  // Tanpa identitas, baris tidak bisa dirender sebagai entri yang stabil.
  if (identifier === null) return null

  return {
    id: identifier,
    url: deployment.url ?? identifier,
    target: normalizeTarget(deployment.target),
    state,
    canceled: state === "CANCELED",
    commitSha: meta.githubCommitSha ?? null,
    commitRef: meta.githubCommitRef ?? null,
    commitMessage: meta.githubCommitMessage ?? null,
    createdAt,
    durationMs:
      buildingAt !== null && ready !== null && ready >= buildingAt
        ? ready - buildingAt
        : null,
  }
}

export function summarizeDeployments(
  payload: unknown,
  limit = 20
): DeploymentSummary[] {
  const parsed = deploymentListSchema.safeParse(payload)
  if (!parsed.success) return []

  return parsed.data.deployments
    .map(summarizeDeployment)
    .filter((deployment): deployment is DeploymentSummary => deployment !== null)
    .sort((left, right) => right.createdAt - left.createdAt)
    .slice(0, limit)
}

function describeFailure(status: number, body: unknown): string {
  const parsedBody = z
    .object({ error: z.object({ message: z.string() }).optional() })
    .passthrough()
    .safeParse(body)
  const apiMessage = parsedBody.success ? parsedBody.data.error?.message : undefined
  if (apiMessage) return `Vercel API menolak (${status}): ${apiMessage}`
  return `Vercel API menolak permintaan (HTTP ${status}).`
}

const projectSettingsSchema = z
  .object({
    commandForIgnoringBuildStep: z.string().nullish(),
  })
  .passthrough()

/**
 * Membaca isian Ignored Build Step milik project (setelan dashboard).
 * Mengembalikan `null` bila kosong — artinya `vercel.json` yang dipakai.
 */
export async function fetchVercelProjectIgnoredBuildStep(input: {
  token: string
  projectId: string
  teamId?: string | null
  fetchImpl?: typeof fetch
}): Promise<string | null> {
  const requestUrl = new URL(
    `${VERCEL_API_BASE}/v9/projects/${encodeURIComponent(input.projectId)}`
  )
  if (input.teamId) requestUrl.searchParams.set("teamId", input.teamId)

  const send = input.fetchImpl ?? fetch
  const response = await send(requestUrl, {
    headers: { Authorization: `Bearer ${input.token}` },
    cache: "no-store",
  })

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null)
    throw new Error(describeFailure(response.status, body))
  }

  const payload: unknown = await response.json().catch(() => null)
  const parsed = projectSettingsSchema.safeParse(payload)
  if (!parsed.success) return null
  return normalizeCommand(parsed.data.commandForIgnoringBuildStep)
}

export async function fetchVercelDeployments(input: {
  token: string
  projectId: string
  teamId?: string | null
  limit?: number
  fetchImpl?: typeof fetch
}): Promise<DeploymentSummary[]> {
  const requestUrl = new URL(`${VERCEL_API_BASE}/v6/deployments`)
  requestUrl.searchParams.set("projectId", input.projectId)
  requestUrl.searchParams.set("limit", String(input.limit ?? 20))
  if (input.teamId) requestUrl.searchParams.set("teamId", input.teamId)

  const send = input.fetchImpl ?? fetch
  const response = await send(requestUrl, {
    headers: { Authorization: `Bearer ${input.token}` },
    cache: "no-store",
  })

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null)
    // Pesan sengaja tidak memuat token: nilai itu tidak boleh masuk log atau
    // respons apa pun yang bisa dibaca admin lain.
    throw new Error(describeFailure(response.status, body))
  }

  const payload: unknown = await response.json().catch(() => null)
  return summarizeDeployments(payload, input.limit ?? 20)
}
