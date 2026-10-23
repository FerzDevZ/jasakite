import { createRequire } from "node:module"
import { describe, expect, it, vi } from "vitest"
import {
  fetchVercelDeployments,
  fetchVercelProjectIgnoredBuildStep,
  resolveIgnoredBuildStep,
  resolveVercelCredentials,
  summarizeDeployment,
  summarizeDeployments,
} from "@/lib/vercel-deployments"
import { BUILD_INPUT_PATTERNS, readBuildGateConfiguration } from "@/lib/vercel-build-gate"

const requireCommonJs = createRequire(import.meta.url)
const { BUILD_INPUT_PATTERN_SOURCES } = requireCommonJs(
  "../scripts/vercel-ignore-build.js"
) as { BUILD_INPUT_PATTERN_SOURCES: string[] }

const TOKEN = "vercel-token-uji-jangan-dipakai"

function deploymentFixture(overrides: Record<string, unknown> = {}) {
  return {
    uid: "dpl_1",
    url: "jasakite-abc.vercel.app",
    state: "READY",
    target: "production",
    createdAt: 1_700_000_000_000,
    buildingAt: 1_700_000_000_000,
    ready: 1_700_000_120_000,
    meta: {
      githubCommitSha: "9e0234f9c8ddf0b9af760a76924aa58736da84c0",
      githubCommitRef: "main",
      githubCommitMessage: "chore(ci): lewati build Vercel",
    },
    ...overrides,
  }
}

describe("kredensial Vercel", () => {
  it("melaporkan nama variabel yang hilang tanpa nilai apa pun", () => {
    const credentials = resolveVercelCredentials({})

    expect(credentials.configured).toBe(false)
    expect(credentials.missingEnvVars).toEqual(["VERCEL_TOKEN", "VERCEL_PROJECT_ID"])
    expect(credentials.token).toBeNull()
  })

  it("menganggap nilai kosong atau spasi sebagai belum diset", () => {
    const credentials = resolveVercelCredentials({
      VERCEL_TOKEN: "   ",
      VERCEL_PROJECT_ID: "\n",
    })

    expect(credentials.configured).toBe(false)
    expect(credentials.missingEnvVars).toEqual(["VERCEL_TOKEN", "VERCEL_PROJECT_ID"])
  })

  it("cukup dengan token dan project id; team id opsional", () => {
    const credentials = resolveVercelCredentials({
      VERCEL_TOKEN: ` ${TOKEN} `,
      VERCEL_PROJECT_ID: "prj_123",
    })

    // Spasi dipangkas: nilai yang tersalin dari dashboard sering membawanya.
    expect(credentials.configured).toBe(true)
    expect(credentials.token).toBe(TOKEN)
    expect(credentials.projectId).toBe("prj_123")
    expect(credentials.teamId).toBeNull()
    expect(credentials.missingEnvVars).toEqual([])
  })
})

describe("ringkasan deployment", () => {
  it("memakai target produksi apa adanya dan null sebagai preview", () => {
    const production = summarizeDeployment(deploymentFixture())
    const preview = summarizeDeployment(deploymentFixture({ uid: "dpl_2", target: null }))

    expect(production?.target).toBe("production")
    // Vercel mengirim `null`, bukan "preview" — salah memetakan ini akan
    // membuat seluruh deployment preview tampil sebagai produksi.
    expect(preview?.target).toBe("preview")
  })

  it("menandai CANCELED sebagai canceled, bukan sebagai sukses", () => {
    const canceled = summarizeDeployment(
      deploymentFixture({ uid: "dpl_3", state: "CANCELED", target: null })
    )

    expect(canceled?.canceled).toBe(true)
    expect(canceled?.state).toBe("CANCELED")
  })

  it("menghitung durasi hanya bila kedua stempel waktu masuk akal", () => {
    expect(summarizeDeployment(deploymentFixture())?.durationMs).toBe(120_000)
    expect(
      summarizeDeployment(deploymentFixture({ ready: 1_600_000_000_000 }))?.durationMs
    ).toBeNull()
    expect(
      summarizeDeployment(deploymentFixture({ buildingAt: undefined }))?.durationMs
    ).toBeNull()
  })

  it("menolak entri yang tidak bisa dibaca dan mengurutkan yang terbaru lebih dulu", () => {
    const summaries = summarizeDeployments({
      deployments: [
        deploymentFixture({ uid: "lama", createdAt: 1_600_000_000_000 }),
        { bukan: "deployment" },
        null,
        deploymentFixture({ uid: "baru", createdAt: 1_700_000_000_000, target: null }),
      ],
    })

    expect(summaries.map((summary) => summary.id)).toEqual(["baru", "lama"])
  })

  it("membatasi jumlah baris yang dikembalikan", () => {
    const summaries = summarizeDeployments(
      {
        deployments: Array.from({ length: 5 }, (_, index) =>
          deploymentFixture({ uid: `dpl_${index}`, createdAt: 1_700_000_000_000 + index })
        ),
      },
      2
    )

    expect(summaries).toHaveLength(2)
  })

  it("menerima payload tanpa uid dan memakai url sebagai identitas", () => {
    // `vercel ls --json` mengirim createdAt/state/target/meta/url tanpa `uid`.
    // Mewajibkan uid akan membuang setiap baris tanpa satu pun galat.
    const { uid: _omittedUid, ...withoutUid } = deploymentFixture()
    const summary = summarizeDeployment(withoutUid)

    expect(summary?.id).toBe("jasakite-abc.vercel.app")
    expect(summary?.state).toBe("READY")
  })

  it("melewati entri yang tidak punya identitas sama sekali", () => {
    expect(summarizeDeployment({ state: "READY", target: "production" })).toBeNull()
  })

  it("mengembalikan null untuk payload yang bukan objek", () => {
    expect(summarizeDeployment("bukan deployment")).toBeNull()
    expect(summarizeDeployments({ deployments: "bukan array" })).toEqual([])
  })
})

describe("permintaan ke Vercel API", () => {
  it("menyusun URL dan header tanpa membocorkan token ke pesan galat", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(JSON.stringify({ error: { message: "Invalid token" } }), {
          status: 403,
          headers: { "content-type": "application/json" },
        })
    )

    await expect(
      fetchVercelDeployments({
        token: TOKEN,
        projectId: "prj_123",
        teamId: "team_abc",
        limit: 5,
        fetchImpl: fetchMock as unknown as typeof fetch,
      })
    ).rejects.toThrow(/Invalid token/)

    const [requestedUrl, requestedInit] = fetchMock.mock.calls[0] ?? []
    const requestedHeaders = new Headers(requestedInit?.headers)

    expect(String(requestedUrl)).toContain("/v6/deployments")
    expect(String(requestedUrl)).toContain("projectId=prj_123")
    expect(String(requestedUrl)).toContain("teamId=team_abc")
    expect(String(requestedUrl)).toContain("limit=5")
    expect(requestedHeaders.get("Authorization")).toBe(`Bearer ${TOKEN}`)

    const rejectedMessage = await fetchVercelDeployments({
      token: TOKEN,
      projectId: "prj_123",
      fetchImpl: fetchMock as unknown as typeof fetch,
    }).catch((error: Error) => error.message)

    expect(rejectedMessage).not.toContain(TOKEN)
  })

  it("memetakan respons sukses menjadi ringkasan", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ deployments: [deploymentFixture()] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    )

    const deployments = await fetchVercelDeployments({
      token: TOKEN,
      projectId: "prj_123",
      fetchImpl: fetchMock as unknown as typeof fetch,
    })

    expect(deployments).toHaveLength(1)
    expect(deployments[0]?.commitRef).toBe("main")
    expect(deployments[0]?.commitSha).toBe(
      "9e0234f9c8ddf0b9af760a76924aa58736da84c0"
    )
  })
})

describe("sumber perintah Ignored Build Step", () => {
  it("memakai vercel.json saat dashboard kosong", () => {
    const resolution = resolveIgnoredBuildStep({
      repositoryCommand: "node scripts/vercel-ignore-build.js",
      dashboardCommand: null,
    })

    expect(resolution.source).toBe("vercel.json")
    expect(resolution.effectiveCommand).toBe("node scripts/vercel-ignore-build.js")
    expect(resolution.overridden).toBe(false)
  })

  it("tidak menganggap override bila isinya sama meski spasinya berbeda", () => {
    const resolution = resolveIgnoredBuildStep({
      repositoryCommand: "node scripts/vercel-ignore-build.js",
      dashboardCommand: "  node   scripts/vercel-ignore-build.js\n",
    })

    expect(resolution.source).toBe("dashboard")
    expect(resolution.overridden).toBe(false)
    expect(resolution.effectiveCommand).toBe("node scripts/vercel-ignore-build.js")
  })

  it("menandai override saat dashboard berbeda dari repo", () => {
    const resolution = resolveIgnoredBuildStep({
      repositoryCommand: "node scripts/vercel-ignore-build.js",
      dashboardCommand: "exit 0",
    })

    expect(resolution.source).toBe("dashboard")
    expect(resolution.overridden).toBe(true)
    expect(resolution.effectiveCommand).toBe("exit 0")
  })

  it("melaporkan tidak ada perintah sama sekali bila keduanya kosong", () => {
    const resolution = resolveIgnoredBuildStep({
      repositoryCommand: null,
      dashboardCommand: "   ",
    })

    expect(resolution.source).toBe("none")
    expect(resolution.effectiveCommand).toBeNull()
  })
})

describe("pembacaan setelan project Vercel", () => {
  it("membaca commandForIgnoringBuildStep dan mengembalikan null saat kosong", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      const requestedUrl = String(input)
      return new Response(
        JSON.stringify(
          requestedUrl.includes("proyek-kosong")
            ? { commandForIgnoringBuildStep: "   " }
            : { commandForIgnoringBuildStep: "node scripts/vercel-ignore-build.js" }
        ),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    })

    const dashboardCommand = await fetchVercelProjectIgnoredBuildStep({
      token: TOKEN,
      projectId: "prj_123",
      teamId: "team_abc",
      fetchImpl: fetchMock as unknown as typeof fetch,
    })
    const emptyCommand = await fetchVercelProjectIgnoredBuildStep({
      token: TOKEN,
      projectId: "proyek-kosong",
      fetchImpl: fetchMock as unknown as typeof fetch,
    })

    expect(dashboardCommand).toBe("node scripts/vercel-ignore-build.js")
    expect(emptyCommand).toBeNull()

    const [requestedUrl, requestedInit] = fetchMock.mock.calls[0] ?? []
    expect(String(requestedUrl)).toContain("/v9/projects/prj_123")
    expect(String(requestedUrl)).toContain("teamId=team_abc")
    expect(new Headers(requestedInit?.headers).get("Authorization")).toBe(
      `Bearer ${TOKEN}`
    )
  })

  it("tidak membocorkan token saat setelan project ditolak", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(JSON.stringify({ error: { message: "Not authorized" } }), {
          status: 403,
          headers: { "content-type": "application/json" },
        })
    )

    const failureMessage = await fetchVercelProjectIgnoredBuildStep({
      token: TOKEN,
      projectId: "prj_123",
      fetchImpl: fetchMock as unknown as typeof fetch,
    }).catch((error: Error) => error.message)

    expect(failureMessage).toMatch(/Not authorized/)
    expect(failureMessage).not.toContain(TOKEN)
  })
})

describe("konfigurasi gerbang build", () => {
  it("membaca ignoreCommand dari vercel.json", () => {
    const gate = readBuildGateConfiguration()

    expect(gate.ignoreCommand).toBe("node scripts/vercel-ignore-build.js")
    expect(gate.buildInputPatterns.length).toBeGreaterThan(0)
    expect(gate.buildInputPatterns).toContain("^app/")
    expect(gate.buildInputPatterns).toContain("^\\.env")
  })

  it("memakai daftar pola yang sama dengan skrip gerbang", () => {
    // Satu sumber kebenaran: halaman admin tidak boleh menampilkan aturan yang
    // berbeda dari yang dijalankan build.
    expect(readBuildGateConfiguration().buildInputPatterns).toEqual(
      BUILD_INPUT_PATTERN_SOURCES
    )
    expect(BUILD_INPUT_PATTERNS).toEqual(BUILD_INPUT_PATTERN_SOURCES)
  })
})
