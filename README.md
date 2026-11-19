# LabPress

A calm, simplified Word-style studio for designing, managing, and updating class labs, homework assignments, and instruction sheets across courses and professor layout styles.

## Highlights

- **Distraction-Free Paper Canvas**: Edit on a clean US Letter page with on-demand **Documents** and **Details** drawers and inline **+ Add Section** controls.
- **Structured Lab & Homework Blocks**: Headings, rich formatted paragraphs (selection Bold/Italic/Code + 1-click variable insertion), auto-numbered procedure steps, code/terminal blocks with expected output, callout notes, checklists, data/rubric tables, graded Question & Answer Key blocks (with auto-totaled points), linked modules, and page breaks.
- **Course-Locked Professor Layouts**: Define each professor's header style, typography, accent color, step format, density, and footer once in **Course Setup**, keeping every handout in a course visually consistent.
- **Student Handout vs. Instructor Key**: Toggle instantly between student handouts (blank answer lines, hidden pacing notes) and instructor keys (solutions, rubrics, teaching notes).
- **Shared Variables & Reusable Modules**: Update `{{semester}}`, `{{vm_host}}`, or shared setup sections once and propagate across every linked document.
- **Semester Snapshots & Diffs**: Capture named semester snapshots, compare block-level changes, and restore safely with automatic backups.
- **Print-Ready PDF, Standalone HTML & JSON Backup**: Export clean US Letter PDFs, single-file LMS-ready `.html` handouts, or full workspace `.json` backups.

---

## Local Development

**Requirements:** Node.js 20+ (Node 22 recommended)

```bash
# 1. Install dependencies
npm install

# 2. Start local dev server (http://localhost:3000)
npm run dev

# 3. Typecheck
npm run lint

# 4. Build for production (outputs to dist/)
npm run build

# 5. Preview production build locally
npm run preview
```

No `.env` file or API keys are needed—all data saves locally in browser `localStorage` via a cloud-ready repository layer (`src/lib/storage.ts`).

---

## Deploying from GitHub

LabPress includes ready-to-use configurations for both **Vercel** (`vercel.json`) and **Netlify** (`netlify.toml`), plus a GitHub Actions CI workflow (`.github/workflows/ci.yml`) that runs typechecking and a production build on every pull request and push to `main`.

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial LabPress release"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

### 2. Deploy on Vercel (Auto-Deploy on Push to `main`)

1. Sign in to [Vercel](https://vercel.com) and click **Add New → Project**.
2. Import your GitHub repository.
3. Vercel automatically detects `vercel.json` (`vite`, build command `npm run build`, output directory `dist`).
4. Click **Deploy**—every future push to `main` automatically deploys to production, and pull requests receive preview URLs.

### 3. Or Deploy on Netlify (Auto-Deploy on Push to `main`)

1. Sign in to [Netlify](https://app.netlify.com) and click **Add new site → Import an existing project**.
2. Connect GitHub and select your repository.
3. Netlify automatically reads `netlify.toml` (build command `npm run build`, publish directory `dist`, Node 22).
4. Click **Deploy site**—every push to `main` triggers an automatic production deploy.
