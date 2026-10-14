---
name: "prompt-engineering"
description: "Crafts effective prompts for coding AI agents: context, explicit instructions, output format, iteration. Invoke when writing prompts, improving agent instructions, or when agent output is off-target."
---

# Prompt Engineering untuk Agent

Seni ngasih instruksi ke AI coding agent. Bukan mantra ajaib — ini teknik komunikasi: konteks yang cukup, instruksi yang jelas, ekspektasi yang terukur. Sepuh dulu ngajarin junior dengan satu kalimat yang padat, sekarang kalimat itu namanya prompt.

## Tujuan

Membuat prompt (atau skill instruction) yang menghasilkan output sesuai target sekali jalan, minim iterasi bolak-balik. Berlaku untuk instruksi ke agent di chat, sistem prompt, dan file SKILL.md.

## Kapan Memakai

- User minta tolong merapikan/merumuskan prompt.
- Output agent melenceng dari yang diminta (ambiguity, asumsi salah, kurang detail).
- Menulis atau mereview SKILL.md dan instruksi sistem.
- Menyusun task description untuk subagent.

## Prinsip Dasar

1. **Konteks dulu, instruksi kemudian.** Agent tidak tahu project lo. Sebutkan stack, file yang relevan, constraint. Prompt tanpa konteks = tebak-tebakan.
2. **Instruksi negatif itu lemah.** "Jangan pakai X" lebih lemah daripada "pakai Y". Kalau terpaksa negatif, beri alternatif.
3. **Format output eksplisit.** Kalau butuh daftar, bilang "buat daftar"; kalau butuh kode, bilang bahasa & file-nya.
4. **Satu prompt, satu fokus.** Prompt yang minta 5 hal sekaligus, hasilnya 5 hal setengah jadi.

## Workflow

1. **Kumpulkan konteks** — stack, bahasa, framework, file terkait, konvensi yang ada. Jawab: "Apa yang agent perlu TAHU untuk mengerjakan ini?"
2. **Definisikan task dalam satu kalimat** — "Refactor fungsi X di file Y". Kalau tidak bisa dirumuskan satu kalimat, task-nya terlalu besar — pecah.
3. **Tulis instruksi langkah** — urutan kerja eksplisit: baca file dulu, rencanakan, eksekusi, verifikasi. Cantumkan perintah verifikasi konkret (build, test).
4. **Tentukan batas** — apa yang JANGAN diubah (area di luar scope), format output (diff, daftar, penjelasan), panjang jawaban.
5. **Beri contoh bila berguna** — satu contoh input→output yang diharapkan lebih kuat dari 10 kalimat deskripsi.
6. **Iterasi terukur** — kalau output meleset, jangan ulangi prompt sama. Identifikasi bagian mana yang gagal (konteks? instruksi? format?) lalu perbaiki spesifik di situ.
7. **Uji dan catat** — prompt yang bagus dipakai berulang: simpan jadi skill/SKILL.md kalau ternyata reusable.

## Checklist Penyelesaian

- [ ] Konteks lengkap: stack, file, constraint disebutkan
- [ ] Task dirumuskan satu kalimat yang jelas
- [ ] Instruksi langkah berurutan, termasuk langkah verifikasi
- [ ] Batas scope eksplisit (yang tidak boleh diubah)
- [ ] Format output ditentukan
- [ ] Contoh diberikan bila ada ambiguitas
- [ ] Prompt sebelumnya gagal → analisis + perbaiki, bukan ulang mentah

## Contoh

**Prompt lemah:**
> "Perbaiki bug di code ini" + paste 200 baris tanpa konteks.

**Prompt kuat:**
> Konteks: Aplikasi Node.js + Express, file `src/routes/users.js` baris 42-60, fungsi `createUser` melempar 500 saat email sudah ada.
> Task: Perbaiki agar mengembalikan 409 Conflict.
> Instruksi: 1) Baca `src/models/user.js` untuk pola error yang ada. 2) Ikuti pola yang sama. 3) Jalankan `npm test` untuk verifikasi.
> Batas: Jangan ubah file lain. Output: diff perubahan + 1 paragraf penjelasan.

## Anti-pattern

- ❌ Prompt raksasa tanpa struktur — agent tersesat di antara 5 permintaan.
- ❌ Asumsi agent tahu project ("di handler auth, ubah..." tanpa path file).
- ❌ Instruksi kontradiktif ("cepat tapi sempurna, lengkap tapi ringkas").
- ❌ Mengulang prompt gagal tanpa analisis — cuma buang token.
- ❌ Prompt yang minta jawaban "aman" tapi tidak memberi ruang verifikasi.
