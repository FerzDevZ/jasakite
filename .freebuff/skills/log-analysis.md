---
name: "log-analysis"
description: "Analyzes application logs for anomalies, patterns, and root causes. Invoke when user shares log files or asks what happened in logs."
---

# Log Analysis

Log itu memori terpendek aplikasi: dia mencatat apa yang benar-benar terjadi, bukan apa yang user kira terjadi. Masalahnya, log yang bagus sekalipun jadi sampah kalau dibaca tanpa urutan. Jangan baca baris per baris dari atas — log itu timeline, jadi kerjakan seperti detektif: cari anomali dulu, tarik garis waktunya, baru simpulkan. Sekali ketemu pola "error selalu muncul setelah event X", setengah pekerjaan sudah beres.

## Tujuan

Menganalisis file log aplikasi (aplikasi, server, CI) untuk menemukan anomali, pola berulang, dan root cause — dengan urutan: struktur → timeline → anomali → korelasi → kesimpulan.

## Kapan Memakai

- User membagikan file log / output console dan bertanya "ada apa di sini?" atau "kenapa gagal?".
- Investigasi incident: cari tahu apa yang terjadi sebelum, saat, dan setelah error.
- Log error rate naik, request gagal intermittent, atau job timeout tanpa pesan jelas.
- User minta "cari di log" untuk event tertentu (error tertentu, user tertentu, request tertentu).

## Workflow

### Langkah 1: Pahami struktur log

1. Identifikasi format: JSON lines (`{"level":"error","ts":...,"msg":...}`), syslog (`timestamp host app[pid]: msg`), Apache/nginx (`IP - - [date] "METHOD path" status size`), atau plain text.
2. Cek level yang ada: `Grep -c` per level — `grep -c '"level":"error"' app.log`, `grep -c ERROR app.log`. Ini snapshot kesehatan cepat.
3. Tentukan rentang waktu log dan timezone. Kalau log punya timestamp, catat gap — gap panjang bisa berarti app mati/restart.
4. Kalau multi-file (per hari/per instance): urutkan file per waktu, gabungkan mental. Jangan analisis per file terpisah — timeline harus utuh.

### Langkah 2: Ekstrak baris menarik

5. Cari error/exception: `grep -n -E "ERROR|FATAL|Exception|panic|traceback" app.log | head -100`. Simpan konteks 3-5 baris sebelum tiap match (`grep -B 5`).
6. Cari warning yang berulang: `grep WARN app.log | sort | uniq -c | sort -rn | head -20` — pola top warning bisa jadi sinyal awal.
7. Cari baris unik: `sort app.log | uniq -c | sort -rn | head` — baris yang paling sering muncul biasanya kunci (entah spam atau pola error massal).
8. Filter noise request health check: exclude pola `/healthz|/ping|OPTIONS` sebelum analisis.

### Langkah 3: Bangun timeline

9. Urutkan temuan per timestamp. Format: `HH:MM:SS level lokasi pesan`.
10. Tandai event penting: start/stop (`listening on`, `shutting down`), deployment, restart, OOM, rate limit.
11. Cari **pola waktu**: error selalu muncul jam X? Setiap 5 menit? Setelah request pertama yang lambat? Korelasi waktu adalah petunjuk paling kuat.
12. Untuk error massal di satu titik: cek apa yang terjadi tepat sebelum — dependency restart, deploy, traffic spike, timeout upstream.

### Langkah 4: Korelasikan & isolasi

13. Pilih satu error, lacak request/transaction ID-nya (kalau ada `request_id`/`trace_id`): `grep <request_id> app.log` — rekonstruksi perjalanan penuh satu request.
14. Cek error upstream: `grep -B 5 "ECONNREFUSED" app.log` — biasanya rantai: app → DB → timeout → error massal.
15. Bandingkan dengan baseline: kalau ada log hari kemarin yang normal, diff-kan pola error hari ini vs kemarin (`diff <(grep ERROR log.yesterday) <(grep ERROR log.today)`).
16. Jangan lupa level di bawah error: warning/info tepat sebelum crash sering berisi nilai yang menyebabkan error (mis. payload besar, argumen aneh).

### Langkah 5: Kesimpulan & rekomendasi

17. Tulis kronologi singkat: kapan mulai, pola apa, trigger apa, dampak apa.
18. Tulis root cause (atau hipotesis terkuat + bukti pendukungnya) dan rekomendasi fix.
19. Kalau log tidak cukup: rekomendasikan penambahan logging — `request_id` per request, log di setiap error dengan context (bukan `except: pass`), struktur JSON yang konsisten.

## Checklist Penyelesaian

- [ ] Format & timezone log diidentifikasi
- [ ] Hitungan per level dibuat (snapshot error rate)
- [ ] Baris error/warning unik diekstrak dengan konteks
- [ ] Timeline dibangun dengan event penting
- [ ] Pola waktu/trigger ditemukan
- [ ] Satu error dilacak end-to-end (request_id bila ada)
- [ ] Kesimpulan: kronologi + root cause + rekomendasi
- [ ] Gap logging dicatat jika bukti kurang

## Contoh

**Skenario:** `app.log` — endpoint `/orders` kadang 500. User minta cari tahu.

**Analisis:**
1. Format: JSON lines dengan `ts`, `level`, `request_id`. Error rate: 40 dari 10.000 request.
2. `grep '"level":"error"' app.log | sort | uniq -c | sort -rn` → semua error pesannya sama: `timeout reading from redis`.
3. Timeline: error tersebar acak, tapi `grep -B 3 '"level":"error"'` menunjukkan error selalu didahului `cache miss` dengan key `orders:<id>` yang sama.
4. Korelasi: request pertama dengan key X → cache miss → redis timeout → 500. Request kedua key X → 200 (cache terisi oleh request pertama? Tidak — cache set-nya gagal juga).
5. Kesimpulan: redis timeout saat `SET` payload besar (respons `/orders` besar), sehingga cache tidak pernah terisi → miss berulang → timeout terus.
6. Rekomendasi: kecilkan payload cache, tambah timeout redis, dan jangan 500 kalau cache gagal (fallback ke DB).

**Output:**
> Bukan bug di `/orders` — bugnya cache layer: SET timeout untuk payload besar, gagal isi cache, miss berulang.

## Anti-pattern

- ❌ Membaca log baris per baris dari atas — 100 MB log, 99,9% normal. Ekstrak dulu, baca sisanya.
- ❌ Menyimpulkan dari satu error tanpa konteks sekitarnya — `-B`/`-A` itu wajib, error tanpa konteks itu gosip.
- ❌ Mengabaikan timestamp/gap — "loh kok tiba-tiba error" padahal app restart 2 menit sebelumnya.
- ❌ Menghapus/memotong log sebelum analisis — konteks hilang permanen.
- ❌ Tidak mencatat timezone — timeline jadi teka-teki.
- ❌ Log analysis tanpa pertanyaan — "apa yang harus diketahui dari log ini?" Tentukan dulu, baru cari.
