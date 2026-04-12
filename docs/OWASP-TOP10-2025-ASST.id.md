# OWASP Top 10:2025 — ASST / `deepagentsjs` (sebagian)

**Versi 0.1** · Pendamping [.superstack/security-reports/ASST-2026-04-12.md](../.superstack/security-reports/ASST-2026-04-12.md) Fase 9 · [English](./OWASP-TOP10-2025-ASST.en.md)

Ini adalah pemetaan **parsial dan tidak lengkap** dari kategori [OWASP Top 10:2025](https://owasp.org/Top10/2025/) ke dokumen **Assurance Run** dan pohon **`deepagentsjs`** di workspace ini. **Bukan** sertifikasi, pentest, atau matriks kontrol penuh. Celah diharapkan; perlakukan baris sebagai **catatan spot-check** untuk operator dan pengembang.

| ID | Kategori | Postur di workspace ini (parsial) |
|----|----------|-----------------------------------|
| **A01:2025** — [Broken Access Control](https://owasp.org/Top10/2025/A01_2025-Broken_Access_Control/) | **Tidak** ditinjau sistematis di sini. Produksi harus menegakkan **otorisasi** pada API, alat, dan aksi agen (tolak secara default, pemeriksaan kepemilikan). |
| **A02:2025** — [Security Misconfiguration](https://owasp.org/Top10/2025/A02_2025-Security_Misconfiguration/) | **CI/CD:** aksi ter-pin SHA, izin `GITHUB_TOKEN` terbatas, tanpa rahasia di YAML ([Fase 4](../.superstack/security-reports/ASST-2026-04-12.md#phase-4--cicd)). **Contoh:** `POSTGRES_PASSWORD` default di `docker-compose` hanya untuk **dev**—bukan baseline produksi. |
| **A03:2025** — [Software Supply Chain Failures](https://owasp.org/Top10/2025/A03_2025-Software_Supply_Chain_Failures/) | **P3:** `pnpm audit` / `cargo audit` opsional, `supply-chain-merged.json`, ringkasan `supply_chain` pada manifest; **override pnpm** untuk isu transitif ([Fase 3](../.superstack/security-reports/ASST-2026-04-12.md#phase-3--dependency-supply-chain)). Jalankan ulang setelah perubahan dependensi. |
| **A04:2025** — [Cryptographic Failures](https://owasp.org/Top10/2025/A04_2025-Cryptographic_Failures/) | **Tidak** diaudit dalam pass ini. Gunakan TLS untuk API jarak jauh; kelola kunci lewat env/secret store—lihat panduan deployment, bukan jaminan pustaka. |
| **A05:2025** — [Injection](https://owasp.org/Top10/2025/A05_2025-Injection/) | **Web:** Tidak ada `dangerouslySetInnerHTML` di `libs/` (spot check). **QuickJS:** `eval` adalah **API mesin terkotak**, bukan eval sembarang di host. **Keluaran LLM:** anggap tidak tepercaya sebelum shell/FS/jaringan—[DASHBOARD-UX.id.md § 7](./DASHBOARD-UX.id.md#7-llm-dan-ai-batas-kepercayaan-operator). |
| **A06:2025** — [Insecure Design](https://owasp.org/Top10/2025/A06_2025-Insecure_Design/) | **Arsitektur** menekankan bukti terukur, sandbox, pola HITL ([ARCHITECTURE.id.md](../ARCHITECTURE.id.md)); tinjau desain **produk Anda** tetap diperlukan. |
| **A07:2025** — [Authentication Failures](https://owasp.org/Top10/2025/A07_2025-Authentication_Failures/) | **Di luar** cakupan dokumen ini. Integrasi (OpenRouter, LangSmith, dompet) harus mengikuti praktik autentikasi masing-masing penyedia. |
| **A08:2025** — [Software or Data Integrity Failures](https://owasp.org/Top10/2025/A08_2025-Software_or_Data_Integrity_Failures/) | **Rantai pasokan:** advisori dan override (A03). **Manifest:** `assurance/run-*.json` terikat commit dengan hash. **Lib transitif:** mis. advisori `langsmith` ditangani lewat bump/override (FINDING-002). |
| **A09:2025** — [Security Logging and Alerting Failures](https://owasp.org/Top10/2025/A09_2025-Security_Logging_and_Alerting_Failures/) | **CI** dan pelacakan **LangSmith** opsional—tanpa klaim monitoring keamanan terpusat; operator harus menghubungkan logging/peringatan standar organisasi untuk produksi. |
| **A10:2025** — [Mishandling of Exceptional Conditions](https://owasp.org/Top10/2025/A10_2025-Mishandling_of_Exceptional_Conditions/) | **Tidak** ditinjau menyeluruh (jalur error, kehabisan sumber daya, perilaku fail-open). Utamakan kegagalan eksplisit dalam kebijakan deployment dan uji. |

**Langkah lanjutan (di luar dokumen ini):** jalur Semgrep/SARIF ([TOOLS.id.md](../TOOLS.id.md)), pemodelan ancaman untuk agen yang di-deploy, dan tinjauan berkala dependensi dan kebijakan CI.

**Lihat juga:** [STRIDE-ASST.id.md](./STRIDE-ASST.id.md) (ringkasan ancaman STRIDE); [FALSE-POSITIVES-ASST.id.md](./FALSE-POSITIVES-ASST.id.md) (pola pemindai yang disaring).

---

*Dokumen internal. Bukan audit keamanan atau nasihat hukum.*
