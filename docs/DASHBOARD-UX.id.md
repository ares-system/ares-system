# Assurance Run — UX dashboard, palet, dan atestasi bukti

**Versi 0.1** — Pendamping [ARCHITECTURE.id.md](../ARCHITECTURE.id.md) § 3.4 · [English](./DASHBOARD-UX.en.md)

Dokumen ini menjelaskan prinsip UX untuk **dashboard** Assurance Run (dan permukaan terkait) di masa depan. Tidak menggantikan berkas mentah `assurance/` atau audit profesional.

---

## 1. Dashboard berorientasi tindakan

Setiap tampilan utama menjawab: **apa langkah berikutnya?**

| Pola | Maksud |
|------|--------|
| Aksi primer | **Jalankan assurance** · **Lihat run terbaru** · **Buka temuan** |
| Gerbang gagal | Satu CTA dominan (mis. **Lihat SARIF**, **Minta waiver**) |
| Hindari | Graf kosmetik tanpa tindakan lanjut |

---

## 2. Navigasi cepat dan praktis

| Pola | Maksud |
|------|--------|
| Nav global | **Runs** · **Bukti** · **Kebijakan** · **Pengaturan** |
| Tautan dalam | `/runs/:sha`, `/findings` |
| Pencarian / palet perintah | Lompat via SHA commit atau id PR |
| Sasaran | ≤3 interaksi ke run terbaru, SHA, dan severity tergabung |

---

## 3. Kejelasan dan transparansi

Kepercayaan lewat **dapat diperiksa**, bukan slogan.

| Selalu tampilkan | Catatan |
|------------------|---------|
| SHA Git dan ref | Cabang atau tag bila ada |
| Nama + versi alat | Seperti di manifest |
| Exit code | Per langkah |
| Stempel waktu | UTC + lokal |
| Bundel mentah | Tautan ke `assurance/run-*.json` |

Jangan **menyembunyikan** kegagalan di balik ringkasan hijau semua.

---

## 4. Siap pakai di lapangan

| Pola | Maksud |
|------|--------|
| Memuat | Skeleton untuk run async |
| Offline | Cache ringkasan run sukses terakhir bila aman |
| Sentuh | Target minimal ~44×44 px |
| Gerak | Hormati `prefers-reduced-motion` |
| Pengguna mahir | Pintasan keyboard |

---

## 5. Otomasi yang terasa andal

| Pola | Maksud |
|------|--------|
| Pemicu CI | Tampilkan **antri / berjalan / gagal** jelas |
| Notifikasi | Satu baris ringkas (opsional Slack/webhook) |
| Kegagalan | Selalu terlihat di aplikasi |

---

## 6. Faktor keberhasilan (gaya IDF)

| Faktor | Perilaku dashboard |
|--------|---------------------|
| **Useful** | Mendukung keputusan: *aman digabung?* Ekspor untuk paket audit. |
| **Credible** | Data dari manifest dan alat—bukan skor LLM saja. |
| **Desirable** | UI tenang; tanpa gamifikasi keamanan. |
| **Findable** | Runs, temuan, waiver, digest di nav utama. |

**Aksesibilitas:** wilayah semantik, urutan fokus, wilayah live untuk selesainya run (target WCAG 2.1 AA).

---

## 7. LLM dan AI (batas kepercayaan operator)

**Tujuan:** mencatat **pemeriksaan cepat** alur berbantuan model terhadap risiko—bukan pengganti pemodelan ancaman atau red team.

| Topik | Arahan |
|-------|--------|
| **Alat, shell, berkas, jaringan** | Anggap **string keluaran model tidak tepercaya** sampai divalidasi. Utamakan **middleware kebijakan**, **backend `execute` terkotak**, dan **manusia dalam loop** untuk tindakan destruktif atau radius ledak besar. |
| **Penyedia QuickJS** | **`eval`** di sini merujuk ke **API mesin QuickJS** dalam runtime terisolasi penyedia—bukan izin untuk menyalurkan konten sembarang ke `eval()` atau shell di host. |
| **Dashboard** | Tampilkan fakta **berbasis manifest** (nama alat, versi, exit code, SHA commit). Jangan menempatkan **skor “keamanan” buatan LLM** sebagai bukti utama tanpa menandai ringkasan non-deterministik. |
| **Risiko sisa** | Injeksi prompt, penyalahgunaan alat, dan pola *confused deputy* bergantung pada **kontrol deployment** (daftar izin, pemantauan, kebijakan organisasi). |

**Bukan tujuan:** Ini tidak mensertifikasi keluaran model; ini menetapkan **ekspektasi UX dan integrasi** bagi operator dan pengembang.

---

## 8. Palet warna — variabel CSS

Peran semantik (implementasi dengan `:root` di aplikasi nanti).

| Token | Hex | Peran |
|-------|-----|-------|
| `--surface` | `#eeeeee` | Latar halaman |
| `--surface-raised` | `#f2f2f3` | Kartu / panel |
| `--border-subtle` | `#8ca4ac` | Pemisah |
| `--text-muted` / `--accent-soft` | `#7d9cb7` | Label sekunder, metadata |
| `--primary` | `#217eaa` | Aksi primer, tautan |
| `--text-primary` | `#4d4847` | Teks isi |
| `--danger` | `#df0606` | Gerbang gagal, temuan kritis (dengan ikon/teks) |
| `--danger-dark` | `#7a0809` | Hover / penekanan bahaya |
| `--ink` | `#160404` | Judul |

Biru dingin mendukung **kredibilitas**; netral menonjolkan **data**; **merah** untuk kegagalan agar tetap menonjol. Verifikasi kontras **4.5:1** untuk teks isi.

---

## 9. Default yang disarankan: muatan digest on-chain (atestasi bukti)

**Tujuan:** mengikat **transaksi bertanda dompet** ke **satu run assurance** tanpa mengklaim runner CI bebas manipulasi. Rantai menyimpan **komitmen**; verifikator menghitung ulang hash dari artefak yang dipublikasikan.

**Bidang minimum yang disarankan** (versikan skema, mis. `assurance_digest_v1`):

1. **Hash JSON tergabung** — serialisasi kanonik dari satu keluaran temuan / rantai pasokan tergabung (mis. gaya solsec).
2. **SHA commit `git`** — dan nama cabang/ref atau tag.
3. **Manifest alat** — nama dan versi Semgrep, `cargo audit`, `cargo deny`, dll.
4. **Opsional: digest lockfile** — mis. SHA-256 dari `Cargo.lock` dan/atau lockfile npm/pnpm.

**Di luar rantai:** JSON penuh, log, dan kebijakan kunci penandatanganan tetap **di luar pita**; digest adalah **penunjuk**, bukan bukti penuh.

**Non-tujuan:** Ini tidak membuktikan runner jujur kecuali identitas runner dan URL artefak juga dikomitkan dan diverifikasi—jelaskan batasan untuk pemangku kepentingan.

---

## 10. Persona × permukaan (pengiriman bertahap)

| Persona | Permukaan utama | Catatan |
|---------|------------------|---------|
| Pengembang | Web (React) | Pemeriksaan PR, drill-down SARIF |
| Sec / pemilik rilis | Web + **CLI** opsional | Setujui waiver, ekspor bundel |
| CI / otomasi | **CLI** | Skema manifest sama dengan UI; tanpa browser |
| Operator lapangan | Web (ramah mobile) | Sentuh besar, stabil di jaringan lemah |
| Pengguna desktop | **Tauri** (opsional) | Bungkus web atau tampilan asli; API sama |
| Tampilan terminal cepat | **TUI** (opsional) | Status hanya-baca; fase belakang |

**Urutan MVP yang disarankan:** **Web (React)** + parity **CLI** → **Tauri** / **TUI** sebagai perpanjangan.

---

*Dokumen internal. Bukan audit keamanan atau nasihat hukum.*
