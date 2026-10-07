# ProjectHub - Role-Based Academic Project Management Platform

ProjectHub is an institutional academic capstone and research management platform engineered with **strict Role-Based Access Control (RBAC)**. The architecture enforces three isolated user roles:

1. **STUDENT** (`/login/student` → `/student/dashboard`)
2. **FACULTY** (`/login/faculty` → `/faculty/dashboard`)
3. **ADMIN** (`/login/admin` → `/admin/dashboard`)

The system never relies on frontend role selection alone. The backend server verifies the authenticated user's role directly from the MongoDB database on every request.

---

## 🏛️ Architectural Highlights

- **Three Dedicated Authentication Entry Points:**
  - Student Portal: `/login/student` (Google Workspace OAuth + Student verification)
  - Faculty Portal: `/login/faculty` (Faculty Google OAuth + Advisor validation)
  - Admin Portal: `/login/admin` (Institutional administrative key verification)
- **Role-Based Routing & Express Middleware:**
  - `/student/*` protected by `authenticateToken` + `requireStudent`
  - `/faculty/*` protected by `authenticateToken` + `requireFaculty`
  - `/admin/*` protected by `authenticateToken` + `requireAdmin`
  - Cross-role attempts (e.g. Student accessing `/faculty/dashboard` or Faculty accessing `/admin/dashboard`) are blocked with HTTP `403 Forbidden` and redirected safely to their authorized dashboard.
- **Three Dedicated Dashboard APIs:**
  - `GET /api/dashboard/student`: Profile, active projects, task counts, tasks due, completed tasks, upcoming milestones, deadlines, recent activity, notifications.
  - `GET /api/dashboard/faculty`: Profile, assigned projects, active teams, pending reviews, upcoming deadlines, at-risk projects, recent submissions, review queue, defense schedule, analytics summary.
  - `GET /api/dashboard/admin`: Student count, faculty count, active projects, completed projects, pending actions, department stats, project stats, faculty workload, cohort stats, audit summary.
- **Server-Side Data Scoping:**
  - `GET /api/projects/my-projects` automatically filters at the database level:
    - Students receive only projects where they are in `teamMembers`.
    - Faculty advisors receive only projects where they are the assigned `facultyMentor`.
    - Administrators receive institutional portfolio scope.
  - The client is never sent the entire dataset to filter in React or DOM scripts.
- **Milestone Approval Security:**
  - Students can submit deliverables and notes (`POST /api/milestones/:id/submit`).
  - Only Faculty advisors (or Admins) can evaluate or approve milestones (`POST /api/milestones/:id/review`). Student approval attempts strictly return `403 Forbidden`.
- **Database Persistence & Atlas Support:**
  - Data changes (tasks created, deliverables submitted, evaluations recorded, advisors reassigned) persist across sessions and browser restarts.
  - Configurable via `.env` (`MONGODB_URI`). Defaults to seamless in-memory MongoDB when no remote Atlas URI is provided, so the app runs out of the box.

---

## 🔑 Default Seed Credentials

| Role | Portal URL | Email | Password | Role Description |
|---|---|---|---|---|
| **STUDENT** | `http://localhost:5000/login/student` | `student@university.edu` | `student123` | Capstone Researcher (Alex Chen) |
| **STUDENT** | `http://localhost:5000/login/student` | `marcus@university.edu` | `student123` | Hardware Engineer (Marcus Brody) |
| **FACULTY** | `http://localhost:5000/login/faculty` | `faculty@university.edu` | `faculty123` | Advisor & Associate Professor (Dr. Aris Thorne) |
| **FACULTY** | `http://localhost:5000/login/faculty` | `mvance@university.edu` | `faculty123` | Advisor & Professor (Dr. Marcus Vance) |
| **ADMIN** | `http://localhost:5000/login/admin` | `admin@university.edu` | `admin123` | Dean & ABET Coordinator (Dean Eleanor Vance) |

---

## 🚀 Running the Platform

1. **Start Server:**
   ```bash
   npm start
   ```
2. **Access Web Portals:**
   - Platform Overview / Landing: `http://localhost:5000/`
   - Student Workspace: `http://localhost:5000/login/student`
   - Faculty Review Center: `http://localhost:5000/login/faculty`
   - Institutional Administration: `http://localhost:5000/login/admin`
3. **Run Automated Test Suite:**
   ```bash
   npm test
   ```

---

## ⚙️ Connecting to MongoDB Atlas

To connect ProjectHub directly to your MongoDB Atlas cluster:
1. Open `.env`
2. Set your connection string:
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/projecthub?retryWrites=true&w=majority
   ```
3. Restart the server (`npm start`). ProjectHub will automatically connect to Atlas as the source of truth.
