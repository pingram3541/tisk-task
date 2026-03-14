# Tisk Task v1.0 (Flask + SQLite)

A sophisticated, modern Todo List application featuring OTP-based authentication, role-based access control (RBAC), masquerade mode for admins, and rich-text task management.

## GitHub Repository Description
> **Tisk Task v1.0** is a secure, private task management system built with Flask and SQLite. It features OTP (One-Time Password) authentication via SMTP, an advanced RBAC permission system, and a "Masquerade" mode for administrators. The UI is a sleek, responsive Tailwind CSS dashboard supporting dynamic task line-items with a rich-text editor, deep date filtering, and activity feeds. Ideal for small teams requiring shared task oversight with strict privacy controls.

## Project Overview

- **Backend:** Flask (Python) with a SQLite database.
- **Frontend:** Vanilla JS with Tailwind CSS.
- **Authentication:** OTP-based login (sent via SMTP or console).
- **Key Features:**
  - **Masquerade Mode:** Admins can view/edit as any other user.
  - **Soft Deletes:** Tasks are moved to a "Deleted" view before permanent removal.
  - **Rich Task Items:** Multiple description line-items per task with Bold/Italic/List/Link support and per-item hour tracking.
  - **Advanced Filtering:** Filter by status (Active, Completed, Past Due, With Comments), color flags, labels, and custom date ranges.
  - **Activity Feed:** Real-time-style comment updates across shared tasks.

## Building and Running

### Prerequisites
- Python 3.x
- `pip`

### Installation
1. Install dependencies:
   ```bash
   pip install flask
   ```

### Running Locally
1. Start the application:
   ```bash
   python app.py
   ```
2. Open `http://localhost:5000`.
3. Check console for OTP codes if `SMTP_HOST` is blank in `config.py`.

## Development Conventions

- **State:** Session-based auth with `user_id` and optional `masquerade_user_id`.
- **Database:** SQLite with automated migrations for new features (like soft deletes and task items).
- **Styling:** Dark/Light mode supported via Tailwind's `dark:` class.
- **Rich Editor:** Uses `contenteditable` with `document.execCommand` for formatting.

## Testing
Manual verification of the following flows is required:
1. Admin masquerade toggle and quit.
2. Rich text formatting and link creation in task line items.
3. Sidebar activity toggle and center view expansion.
4. Bulk actions (Clear Completed / Purge Trash) visibility within specific filters.
