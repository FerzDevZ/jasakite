---
name: "docker-troubleshooter"
description: "Debugs Docker and container issues: container logs, exec inspection, healthchecks, layers, networking, resource limits. Invoke when containers fail, exit unexpectedly, or behave oddly."
---

# Docker Troubleshooter

Container yang crash itu kayak kucing yang tiba-tiba kabur: ada alasannya, tapi tidak akan cerita sendiri. Sepuh sudah pernah begadang karena container yang `exit 1` padahal log-nya kosong — ternyata rahasianya di layer sejarah, bukan di permukaan. Kuncinya: baca dari luar ke dalam, jangan panik duluan.

## Tujuan

Menemukan dan memperbaiki masalah container/Docker secara sistematis: gagal start, crash berulang, image besar, jaringan antar container, resource limit, dan perbedaan perilaku lokal vs produksi.

## Kapan Memakai

- Container exit / restart loop / crash tanpa pesan jelas.
- Aplikasi jalan di host tapi gagal di container.
- Image membengkak atau build lambat.
- Koneksi antar container gagal (networking).

## Workflow

1. **Lihat status & exit code** — `docker ps -a`, catat CONTAINER ID, STATUS, exit code. Exit code memberi petunjuk: 0 (berhenti normal), 137 (OOM/kill -9), 139 (segfault), 1/2 (error aplikasi).
2. **Baca log dengan konteks** — `docker logs <id>` dan lihat 50 baris terakhir: `docker logs <id> --tail 50 --timestamps`. Log kosong + exit 0 = mungkin entrypoint tidak menemukan apa yang dieksekusi.
3. **Cek start command** — `docker inspect <id> --format '{{json .Config.Cmd}}'` dan `Entrypoint`. Verifikasi: file/script itu ada di image? Jalan sebagai user yang benar? Permissions?
4. **Masuk dan periksa** — `docker exec -it <id> sh` (atau `docker run -it --entrypoint sh <image>` untuk yang gagal start). Cek env (`env`), working dir, file yang dibutuhkan, dependensi shared library (ldd).
5. **Cek resource & OOM** — `docker stats` saat berjalan; kalau `exit 137`: cek `dmesg | tail` / `docker inspect` untuk OOMKilled=true, naikkan limit atau perbaiki kebocoran memori.
6. **Periksa jaringan** — container tidak bisa terhubung: cek network (`docker network ls`), pastikan di network yang sama, gunakan nama service bukan localhost, `docker exec <id> ping <service>` atau nc untuk port.
7. **Kecilkan image bila membengkak** — `docker history <image>` cari layer besar; ganti multi-stage build, .dockerignore, atau distroless. Verifikasi ukuran turun dan masih jalan.
8. **Bandingkan konteks** — jalan di host tapi gagal di container: env yang hilang, path yang beda, timezone, user permission (root vs non-root). Bedakan dulu sebelum fix.

## Checklist Penyelesaian

- [ ] Exit code & status dimengerti (bukan asumsi)
- [ ] Log dibaca dengan tail + timestamps
- [ ] Cmd/Entrypoint diverifikasi ada & executable
- [ ] Environment & permissions benar
- [ ] Bukan OOM/resource limit (137/OOMKilled ditangani)
- [ ] Networking antar container terverifikasi
- [ ] Perubahan tercermin di Dockerfile/image, bukan cuma runtime manual
- [ ] Container restart bersih dan stabil

## Contoh

**Kasus:** `docker run` langsung exit 1, `docker logs` kosong.

**Langkah:**
1. `docker inspect <id> --format '{{json .Config.Cmd}}'` → `["sh","-c","start.sh"]`
2. `docker run -it --entrypoint sh <image>` → `ls -la start.sh` → file tidak ada!
3. Cek Dockerfile → `COPY start.sh /app/` salah path.
4. Fix Dockerfile, rebuild, run → stabil. Verifikasi: `docker ps` tidak restart loop.

## Anti-pattern

- ❌ Rebuild & run ulang tanpa melihat log — cuma buang waktu dan bandwidth.
- ❌ Langsung `--privileged` atau matikan security demi "biar jalan".
- ❌ Fix dengan menambah `sleep infinity` — menutupi masalah, bukan menyelesaikan.
- ❌ Mengabaikan exit code dan menebak penyebab.
- ❌ Fix di container berjalan tanpa di-capture ke Dockerfile (perubahan hilang saat rebuild).