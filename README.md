# Request Management System

A full-stack CRUD web app with two roles — **User** and **Admin** — built with
plain HTML/CSS/JS on the frontend and Node.js + Express + SQLite on the
backend. Users submit "requests"; admins approve or reject them.

This README has two parts:
1. **How to run it** (quick start)
2. **How it actually works internally** — a walkthrough of every moving part, written to teach the concepts, not just list the files.

---

## 1. How to run it

### Requirements
- Node.js 18+ and npm installed on your machine

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Create your environment file from the template
cp .env.example .env

# 3. (Optional) open .env and change JWT_SECRET to your own random string,
#    and change ADMIN_EMAIL / ADMIN_PASSWORD if you want a different admin login.
#    You can leave SMTP_USER / SMTP_PASS empty — see the "Email" section below.

# 4. Start the server
npm start
```

Then open **http://localhost:3000** in your browser. You'll land on the login page.

- **Register** a normal account to try the User Dashboard.
- **Admin login**: use the email/password from `ADMIN_EMAIL` / `ADMIN_PASSWORD`
  in your `.env` (defaults to `admin@gmail.com` / `Admin@123`). This account is
  created automatically the first time the server starts — you never register
  an admin through the UI.

### Email (forgot password)

By default `SMTP_USER`/`SMTP_PASS` are empty. In that case the app automatically
creates a free, temporary [Ethereal](https://ethereal.email) test inbox on
startup — real Nodemailer emails still get sent, but to a fake address, and
the app prints a **preview link** to the terminal for every email so you can
open it in a browser and see exactly what the user would receive.

The reset link itself is *always* printed to the terminal too (`Password
reset link for someone@example.com: http://localhost:3000/reset-password/<token>`),
so you can test the whole flow without needing to check any inbox at all.

To send real emails (e.g. through Gmail), fill in `SMTP_HOST`, `SMTP_USER`,
and `SMTP_PASS` (a Gmail **App Password**, not your normal password) in `.env`.

### Useful scripts
```bash
npm start   # run normally
npm run dev # run with nodemon (auto-restarts on file changes)
```

The database is a single file created automatically at `database/database.sqlite`
the first time you run the app. Delete it any time to reset all data — it will
be recreated (with a fresh admin account) on the next `npm start`.

---

## 2. How everything works internally

### 2.1 The big picture

This is a classic **3-tier web app**:

```
Browser (HTML/CSS/JS)  <-- fetch() over HTTP -->  Express server  <-->  SQLite file
     "frontend"                                      "backend"          "database"
```

The browser never talks to the database directly. Every action — logging in,
creating a request, approving one — is a `fetch()` call from JavaScript in
the browser to an API endpoint on the Express server, which is the *only*
thing allowed to read/write the SQLite file. This is what makes the app secure:
the browser can be fully inspected/tampered with by the user, but the server
re-checks everything before touching the database.

### 2.2 MVC folder structure, and why each layer exists

```
project/
├── server.js            entry point: wires everything together, starts listening
├── config/database.js    opens the SQLite file, creates tables, seeds the admin
├── models/               ONLY place that contains raw SQL
├── controllers/          business logic: what should happen for each request
├── routes/               maps URLs + HTTP methods -> controller functions
├── middleware/           code that runs BEFORE a controller (auth checks, etc.)
├── utils/                small reusable helpers (hashing, JWT, email, validation)
├── public/               static files sent as-is to the browser (css, js)
└── views/                the HTML pages themselves
```

This is the **MVC (Model-View-Controller)** pattern:
- **Model** = `models/` — talks to the database, knows nothing about HTTP.
- **View** = `views/` + `public/` — what the user sees, knows nothing about SQL.
- **Controller** = `controllers/` — the middleman: reads the HTTP request,
  calls the model, decides what to send back.

Why bother separating these? Because each piece can change independently.
You could swap SQLite for MySQL by only touching `config/database.js` and the
SQL inside `models/` — the controllers, routes, and frontend wouldn't need to
change at all.

### 2.3 Registration: what happens when you click "Create account"

1. **Frontend** (`public/js/register.js`) checks the fields aren't empty and
   the passwords match, purely so the user gets instant feedback. This check
   is *not* trusted by the server.
2. It sends `POST /api/auth/register` with `{ name, email, password, confirmPassword }`.
3. **`routes/authRoutes.js`** matches that URL and runs, in order:
   - `authLimiter` — blocks an IP after too many attempts (brute-force protection).
   - `registerRules` (`utils/validators.js`) — re-validates everything server-side
     using `express-validator`: is the email actually a valid email, is the
     password 8+ characters, do the two passwords match. **This is the real
     check** — a user could bypass the frontend entirely (e.g. with `curl`) and
     this is what actually stops bad data.
   - `authController.register` — the real logic.
4. Inside `register()`:
   - `userModel.findUserByEmail()` checks if that email is already taken.
   - `hashPassword()` (in `utils/hash.js`) runs the password through **bcrypt**,
     turning `"Adhi@1234"` into something like `$2b$10$KJHsd9834...`. This is a
     **one-way** transformation — there's no function to turn the hash back
     into the original password, even for us. bcrypt also automatically adds a
     random "salt" so two users with the same password get different hashes.
   - `userModel.createUser()` inserts the new row with the *hashed* password —
     the plain-text password is never written to disk anywhere.
   - `signToken()` (in `utils/jwt.js`) creates a **JWT** (JSON Web Token): a
     signed, tamper-proof string containing `{ id, email, role }`. Signed
     means the server can later verify the token wasn't edited, because
     only the server knows the `JWT_SECRET` used to sign it.
5. The server responds with `{ token, user }`. The frontend saves the token
   in `localStorage` and redirects to the dashboard.

### 2.4 Login and "staying logged in"

Login (`POST /api/auth/login`) is simpler: look up the user by email, then
`comparePassword()` runs bcrypt's compare function, which hashes the *submitted*
password the same way and checks if it matches the *stored* hash — again,
without ever decrypting anything.

Once you have a JWT, **every subsequent API call** attaches it as an HTTP
header:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6...
```
This happens automatically inside the shared `api()` helper
(`public/js/api.js`) — every page includes this file, so you never have to
remember to attach the token manually.

On the server, `middleware/auth.js` (`requireAuth`) runs before any protected
route. It reads that header, calls `verifyToken()`, and if the signature
checks out, attaches the decoded payload to `req.user` — so every controller
downstream knows *who* is making the request without ever touching the
database again. If the token is missing, expired, or has been tampered with,
`verifyToken()` throws, and the middleware responds `401 Unauthorized` before
the request ever reaches your data.

`middleware/adminAuth.js` (`requireAdmin`) runs *after* `requireAuth` on admin
routes and simply checks `req.user.role === 'admin'`. This is why a regular
user can't approve requests even if they guess the URL `/api/admin/approve/5`
— the role check happens on the server, not just by hiding the button in the UI.

### 2.5 Forgot password / reset password — the full lifecycle

This is the most "stateful" flow in the app, so it's worth tracing in full:

1. User submits their email to `POST /api/auth/forgot-password`.
2. The server looks the user up. **Whether or not the email exists, it
   returns the same generic message** ("If that email is registered...").
   This is deliberate: if the message were different for known vs. unknown
   emails, an attacker could use this form to figure out who has an account.
3. If the user *does* exist, the server generates a random, unguessable token
   with `crypto.randomBytes(32)`, and stores it in the `password_resets` table
   along with an expiry time (1 hour from now).
4. `sendResetPasswordEmail()` sends an email (via Nodemailer) with a link like
   `http://localhost:3000/reset-password/<token>`.
5. Visiting that link serves `views/reset-password.html`. The token itself
   isn't validated until the user actually submits a new password — the page
   itself is just a form.
6. On submit, `POST /api/auth/reset-password/:token` runs:
   - `findValidToken()` — a single SQL query that only matches if the token
     exists **and** hasn't expired (`expires_at > datetime('now')`). Expired or
     unknown tokens simply don't match, so they're rejected with one message.
   - The new password gets hashed and saved, exactly like registration.
   - The token row is deleted immediately — **one-time use**. If you tried to
     reuse the same reset link twice, the second attempt would fail because
     the token no longer exists in the table.

### 2.6 Requests: the CRUD core of the app

Every request (Leave Request, Laptop Repair, etc.) is one row in the
`requests` table: `id, user_id, title, description, category, status,
created_at, updated_at`. `status` starts as `'Pending'` and can only be
changed by an admin action.

**User side** (`controllers/userController.js`) — every operation first loads
the request and checks two things before doing anything:
- `existing.user_id === req.user.id` → you can only touch **your own** requests.
- `existing.status === 'Pending'` → you can only edit/delete requests that
  haven't been reviewed yet.

Both checks happen **on the server**, using the `id` from the verified JWT —
not from anything the browser sends about "who I am" — so there's no way to
edit someone else's request by, say, changing a hidden form field.

**Admin side** (`controllers/adminController.js`) — `getAllRequests()` builds
one SQL query that joins `requests` with `users` (to show who submitted each
one) and optionally adds a `WHERE` clause for status filtering and a `LIKE`
clause for search, then an `ORDER BY` for sort — all in the database itself,
which is far more efficient than pulling every row into memory and filtering
in JavaScript.

Approve/reject just does `UPDATE requests SET status = ? WHERE id = ?`. The
frontend re-fetches the list afterward, so "the user sees the update instantly
after refresh" simply means: the database is the single source of truth, and
every page load/re-fetch reads whatever is currently in it.

### 2.7 The database itself

SQLite stores the entire database as one file (`database/database.sqlite`) —
no separate database server to install or run. `config/database.js`:
- Opens that file.
- Wraps the `sqlite3` package's callback-based API (`db.run(sql, params,
  callback)`) in **Promises**, so the rest of the app can use clean
  `async/await` syntax instead of nested callbacks.
- Runs `CREATE TABLE IF NOT EXISTS ...` for all three tables on every startup
  — harmless if they already exist, and means a brand-new clone of this
  project needs zero manual database setup.
- Every query uses `?` placeholders with parameters passed separately (e.g.
  `db.get('SELECT * FROM users WHERE email = ?', [email])`) instead of
  building a SQL string by hand. This is what prevents **SQL injection** — the
  database driver treats the parameter purely as data, never as part of the
  SQL syntax, no matter what characters it contains.

### 2.8 Frontend architecture

There's no framework (React/Vue/etc.) — just HTML files in `views/`, each
paired with a small JS file in `public/js/`. They all share:
- **`public/js/api.js`** — the one place that knows how to call the backend.
  Every page includes this before its own script. It automatically attaches
  the JWT, parses JSON, and — importantly — if the server ever responds `401`
  (token invalid/expired), it clears the saved session and redirects to
  `/login` automatically, so a user is never stuck looking at a broken
  dashboard with a dead token.
- **`requireRole('user')` / `requireRole('admin')`** — called at the top of
  each dashboard script. If you're not logged in, or you're the wrong role,
  it redirects you before the page can show any data — this is the frontend's
  route guard (though, again, the *real* protection is server-side).
- **Toasts, modals, spinners** — small vanilla-JS helpers in `api.js` and each
  page's own script; no external UI library, just DOM manipulation and CSS
  transitions defined in `public/css/style.css`.

### 2.9 Security features, and where each one lives

| Concern | Where it's handled |
|---|---|
| Password storage | bcrypt hashing (`utils/hash.js`) — never store or log plain text |
| Session/identity | JWT, signed with `JWT_SECRET` (`utils/jwt.js`) |
| Who can call which route | `middleware/auth.js`, `middleware/adminAuth.js` |
| Malformed/malicious input | `express-validator` rules (`utils/validators.js`) run before any controller |
| SQL injection | parameterized queries everywhere in `models/` |
| Cross-site scripting (XSS) | frontend always inserts user text via `escapeHtml()` before putting it in the DOM |
| Common HTTP header attacks | `helmet` middleware in `server.js` |
| Cross-origin requests | `cors` middleware in `server.js` |
| Brute-force login/reset attempts | `express-rate-limit` (`middleware/rateLimiter.js`) |
| Secrets (JWT secret, admin password, SMTP creds) | kept in `.env`, never committed (see `.gitignore`), never hardcoded in source |

---

## API reference

| Method | Endpoint | Auth required | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | – | Create a user account |
| POST | `/api/auth/login` | – | Log in (user or admin) |
| POST | `/api/auth/forgot-password` | – | Request a reset email |
| POST | `/api/auth/reset-password/:token` | – | Set a new password |
| GET | `/api/requests` | User | List your own requests |
| POST | `/api/requests` | User | Create a request |
| PUT | `/api/requests/:id` | User (owner, Pending only) | Edit a request |
| DELETE | `/api/requests/:id` | User (owner, Pending only) | Delete a request |
| GET | `/api/admin/requests` | Admin | List all requests (`?search=&status=&sort=`) |
| PUT | `/api/admin/approve/:id` | Admin | Approve a request |
| PUT | `/api/admin/reject/:id` | Admin | Reject a request |

---

## Troubleshooting

- **"Address already in use"** — something else is already running on port
  3000. Either stop it, or change `PORT` in `.env`.
- **Forgot my admin password** — delete `database/database.sqlite` and
  restart (this wipes ALL data and reseeds a fresh admin), or manually update
  `ADMIN_PASSWORD` in `.env` and reset the database.
- **Emails aren't arriving** — if you haven't set `SMTP_USER`/`SMTP_PASS`,
  check your terminal: the reset link (and an Ethereal preview link) are
  printed there instead of a real inbox. This is expected in development.
