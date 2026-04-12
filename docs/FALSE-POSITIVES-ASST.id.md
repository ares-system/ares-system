# Positif palsu disaring — ASST / `deepagentsjs`

**Versi 0.1** · Pendamping [.superstack/security-reports/ASST-2026-04-12.md](../.superstack/security-reports/ASST-2026-04-12.md) Fase 12 · [English](./FALSE-POSITIVES-ASST.en.md)

Pemindai otomatis dan pola *grep* sering menampilkan **noise**: pola yang tampak berisiko tanpa konteks tetapi **dapat diterima** di basis kode ini bila aturan di bawah berlaku. Dokumen ini mencatat **apa yang disaring** dalam tinjauan ASST-2026-04-12 agar triase berikutnya (dan jalur **gabungan SARIF** mendatang) tetap konsisten.

**Bukan jaminan:** Kode baru dapat melanggar batas ini; perlakukan sebagai **daftar periksa triase**, bukan bukti keamanan tersendiri.

---

## 1. Kategori yang disaring (tidak masuk “temuan” pada pass tersebut)

| Pola | Mengapa biasanya positif palsu di sini | Periksa ulang bila |
|------|----------------------------------------|---------------------|
| **Nama kunci API di dokumen/contoh** | Penyebutan pengenal seperti `OPENROUTER_API_KEY`, `LANGSMITH_API_KEY` **tanpa nilai** adalah dokumentasi dan kontrak env—bukan rahasia hidup. | String yang sama muncul dengan **nilai** atau di **`.env`** yang ter-commit. |
| **Kredensial khusus uji** | `SECRET_KEY` placeholder, token tiruan, atau vektor uji tetap di `*.test.*` / fixture untuk tes unit/integrasi. | Pola yang sama muncul di jalur **produksi** atau **contoh** konfigurasi yang dimaksudkan disalin apa adanya. |
| **`eval` di penyedia QuickJS** | Rujukan ke **`eval`** mengacu pada **API mesin QuickJS** tertanam di dalam penyedia terkotak—bukan `eval()` host pada string sembarang tanpa kontrol. | `eval` muncul di luar batas penyedia QuickJS atau pada masukan **pengguna/model** tanpa sandbox. |

---

## 2. Arahan triase (untuk operator)

1. **Konfirmasi konteks:** jalur berkas (tes vs lib vs dokumen), dan apakah data **dipengaruhi penyerang** saat runtime.
2. **Utamakan bukti:** keluaran alat berbasis manifest dan SHA commit lebih dari satu temuan *grep*.
3. **Temuan tergabung (masa depan):** bila ada jalur Semgrep/SARIF ([TOOLS.id.md](../TOOLS.id.md) § C.2, § E), gunakan **penekanan** atau aturan gabungan yang merujuk daftar ini—hindari membuka debat yang sama setiap run.

---

## 3. Dokumen terkait

- [DASHBOARD-UX.id.md § 7](./DASHBOARD-UX.id.md#7-llm-dan-ai-batas-kepercayaan-operator) — batas kepercayaan untuk keluaran model/alat.
- [STRIDE-ASST.id.md](./STRIDE-ASST.id.md) — ringkasan ancaman; **Information disclosure** vs nama kunci hanya di dokumen.

---

*Dokumen internal. Bukan audit keamanan atau nasihat hukum.*
