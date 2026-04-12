# STRIDE — ASST / `deepagentsjs` (ringkasan)

**Versi 0.1** · Pendamping [.superstack/security-reports/ASST-2026-04-12.md](../.superstack/security-reports/ASST-2026-04-12.md) Fase 10 · [English](./STRIDE-ASST.en.md)

[STRIDE](https://learn.microsoft.com/en-us/previous-versions/commerce-server/ee823878(v=cs.20)) (*Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege*) adalah **mnemonik pemodelan ancaman**. Halaman ini memberi **ringkasan parsial** untuk workspace Assurance Run dan **`deepagentsjs`**—bukan model ancaman alur data penuh.

---

## 1. Menurut jenis ancaman (parsial)

| Ancaman | Arti singkat | Catatan untuk workspace ini |
|---------|--------------|----------------------------|
| **Spoofing** | Penyalahgunaan identitas | Kunci API dan autentikasi penyedia di **env / secret store** (lihat `.env.example`); konten buatan model tidak boleh diperlakukan sebagai identitas tepercaya—[DASHBOARD-UX.id.md § 7](./DASHBOARD-UX.id.md#7-llm-dan-ai-batas-kepercayaan-operator). |
| **Tampering** | Modifikasi tanpa izin | **Dependensi:** jalur rantai pasokan ([P3](../.superstack/development-plan.md)), override, audit. **CI:** aksi pihak ketiga ter-pin SHA, install lockfile beku. **Artefak:** manifest assurance terikat commit dengan hash. |
| **Repudiation** | Menyangkal suatu tindakan | **Parsial:** manifest mencatat versi alat dan SHA commit; **digest on-chain** opsional dan jejak LangSmith meningkatkan akuntabilitas—lihat [DASHBOARD-UX.id.md § 9](./DASHBOARD-UX.id.md#9-default-yang-disarankan-muatan-digest-on-chain-atestasi-bukti). Non-repudiasi penuh adalah proses **organisasi**, tidak dibuktikan oleh repo saja. |
| **Information disclosure** | Rahasia atau data bocor | `.env` tidak dilacak; tidak ada rahasia hidup yang diamati dalam pemindaian rutin (laporan). **Sisa:** isu kelas SSRF/metadata dari **axios** transitif di jalur SDK Daytona ([FINDING-001](../.superstack/security-reports/ASST-2026-04-12.md#high-finding-001-transitive-vulnerable-axios-via-daytonaio-sdk)); mitigasi lewat upgrade/override. |
| **Denial of service** | Ketersediaan / penyalahgunaan sumber daya | **Tidak** ditinjau menyeluruh (loop agen, kuota penyedia, CPU/mem sandbox). Batas operasional dan pemantauan menjadi tanggung jawab deployment. |
| **Elevation of privilege** | Kemampuan ekstra tanpa otorisasi | **Desain:** sandbox, middleware HITL, kebijakan skill ([ARCHITECTURE.id.md](../ARCHITECTURE.id.md)). Deployment harus menegakkan **least privilege** pada alat dan akun eksternal. |

---

## 2. Menurut komponen (tabel spot-check)

| Komponen | Tema STRIDE utama | Mitigasi di pohon sumber |
|----------|-------------------|-------------------------|
| **Penyedia Daytona** (`libs/providers/daytona`) | **Tampering** / **Information disclosure** (isus SSRF lewat **axios** transitif) | Upgrade `@daytonaio/sdk` atau **override pnpm** `axios` (FINDING-001, [pemetaan OWASP](./OWASP-TOP10-2025-ASST.id.md)). |
| **Klien LangSmith** (transitif) | **Tampering** / **Integritas** (kelas prototype pollution—bergaya A08) | Bump / override **langsmith** (FINDING-002). |
| **GitHub Actions (CI)** | **Tampering** pipeline; miskonfigurasi | Aksi ter-pin SHA, izin terbatas, rahasia hanya lewat **`secrets.*`**; lihat [Fase 4](../.superstack/security-reports/ASST-2026-04-12.md#phase-4--cicd) dalam laporan. |

---

## 3. Hubungan ke OWASP

Topik rantai pasokan dan integritas tumpang tindih **OWASP A03 / A08**; batas kepercayaan dan injeksi tumpang tindih **A05**—lihat [OWASP-TOP10-2025-ASST.id.md](./OWASP-TOP10-2025-ASST.id.md).

**Noise pemindai:** [FALSE-POSITIVES-ASST.id.md](./FALSE-POSITIVES-ASST.id.md) mencantumkan pola yang sering disaring saat triase pemindaian statis (mis. nama kunci hanya di dokumen vs rahasia sungguhan).

---

*Dokumen internal. Bukan audit keamanan atau nasihat hukum.*
