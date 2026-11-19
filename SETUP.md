# Setting up ProvidusBench on the office Mac Studio

Follow these steps to run the site 24/7 in Docker on the office Mac Studio, with a public link through ngrok.

## How it fits together

| Part | Where it comes from | In git? |
|---|---|---|
| Code (site, Dockerfile, compose.yaml) | GitHub: `ProvidusAI/parse-doc-demo`, branch `feature/frontend` | yes |
| Page data: `public/showcase/` (page images, DocAI results, manifests, wall thumbnails; about 280 MB, 1009 pages) | Copied by hand from the PC that has it | **no, never** |
| ngrok token and domain: `.env` | Typed in on the Mac | **no, never** |

- **The data is copied into the image.** When the image is built, Docker copies `public/showcase/` into it. The site then reads every page from inside the container, with no slow file sharing with the Mac.
- **Copy the data before you build.** The list of pages is fixed when the image is built, so the data must already be in place.
- **Keep the image on the Mac.** It contains all the page data, so never push it to Docker Hub or any other registry.

## 1. Prepare the Mac (once)

1. **Docker Desktop:**
   - Install Docker Desktop for Mac, the **Apple Silicon** version, from docker.com.
   - Open it, then go to **Settings → General** and turn on **Start Docker Desktop when you sign in**.
2. **Git:** run `git --version` in Terminal. If macOS offers to install the developer tools, accept.
3. **GitHub access:** you need a GitHub account that can see `ProvidusAI/parse-doc-demo`, because the repository is private.
4. **Keep the Mac awake and running:**
   - In **System Settings → Energy**, turn on **Prevent automatic sleeping** and **Start up automatically after a power failure**.
   - Turn on automatic login for the account that runs Docker, so Docker starts again after a reboot.
5. **Remote Login:** to copy the data from the PC over the network, go to **System Settings → General → Sharing** and turn on **Remote Login**. That screen also shows the Mac's network name, for example `mac-studio.local`.
6. **Disk space:** keep about 3 GB free for the images and the build.

## 2. Get the code (once)

In Terminal on the Mac:

```bash
cd ~
```
```bash
git clone -b feature/frontend https://github.com/ProvidusAI/parse-doc-demo.git
```

The code is now in `~/parse-doc-demo`.

## 3. Copy the page data from the PC

Do this the first time, and again whenever the pages change.

1. **On the Windows PC, pack the data.** In Git Bash or PowerShell, inside the `providus-bench.ai` folder, run:

   ```bash
   tar -czf showcase.tgz public/showcase
   ```

2. **Send the file to the Mac.** Replace `USER` with the Mac account name and `mac-studio.local` with the Mac's network name:

   ```bash
   scp showcase.tgz USER@mac-studio.local:~/parse-doc-demo/
   ```

   AirDrop or a USB drive works too. Just put `showcase.tgz` into `~/parse-doc-demo` on the Mac.

3. **On the Mac, unpack it.** This replaces any older copy:

   ```bash
   cd ~/parse-doc-demo && rm -rf public/showcase && tar -xzf showcase.tgz && rm showcase.tgz
   ```

4. **Check it arrived.** Both files should be listed:

   ```bash
   ls public/showcase/manifest.json public/showcase/manifest.local.json
   ```

Afterwards, delete `showcase.tgz` from the PC as well.

## 4. Set up ngrok (once)

1. Sign in at dashboard.ngrok.com.
2. **Authtoken:** open **Your Authtoken** and copy the token.
3. **Domain:** open **Domains** and claim your free static domain, for example `something.ngrok-free.app`. A static domain keeps the public link the same after every restart.
4. **On the Mac, create `~/parse-doc-demo/.env`** with these two lines:

   ```
   NGROK_AUTHTOKEN=paste-the-token-here
   NGROK_DOMAIN=something.ngrok-free.app
   ```

`.env` is git-ignored and kept out of the image, so the token stays on the Mac. If no public link is needed, skip this step, and see step 5.

## 5. Build and start

```bash
cd ~/parse-doc-demo && docker compose up -d --build
```

- **First build:** it takes a few minutes and needs internet, to download Node, the npm packages and the fonts.
- **Two containers start:**
  - `app`, the site, on port 3001;
  - `ngrok`, the public link.
- **They restart themselves** after a crash or a reboot, once Docker Desktop is running.

To run only the site, without a public link:

```bash
docker compose up -d --build app
```

**Before starting ngrok on the Mac, stop the ngrok tunnel on the PC.** The free plan may refuse a second tunnel while another one is online.

## 6. Check it works

| Check | How | Expected |
|---|---|---|
| Containers running | `docker compose ps` | `app` and `ngrok` both `running` |
| Site on the Mac | open http://localhost:3001 | The landing page; the dataset shows 1009 pages |
| From another office computer | open `http://mac-studio.local:3001` | Same site |
| Public link | open `https://<NGROK_DOMAIN>` | Same site (ngrok may show a one-time warning page first) |
| Tunnel status | open http://localhost:4040 | ngrok's own status page |
| Logs | `docker compose logs -f` (Ctrl+C to leave) | No errors |

## Everyday tasks

| Task | Commands (in `~/parse-doc-demo`) |
|---|---|
| Update the code | `git pull && docker compose up -d --build` |
| Update the pages | Repeat step 3, then `docker compose up -d --build` |
| Restart | `docker compose restart` |
| Stop everything | `docker compose down` |
| Free disk space after many rebuilds | `docker image prune -f` |

## When something goes wrong

| Problem | Cause and fix |
|---|---|
| The site shows fewer pages than expected | The data was missing or old when the image was built. Redo step 3, then `docker compose up -d --build`. |
| `port is already allocated` | Something else uses port 3001 (or 4040). In `compose.yaml`, change `"3001:3000"` to another free port, for example `"3005:3000"`, and start again. |
| ngrok keeps restarting | Check `docker compose logs ngrok`. Usually the token or domain in `.env` is wrong, or another tunnel (for example the PC's) is still online. |
| The build fails while fetching fonts or packages | The Mac had no internet during the build. Connect it and build again. |
| Nothing comes back after a reboot | Docker Desktop is not starting at login, or the Mac is waiting at the login screen. Check step 1. |
