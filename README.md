# Tisk Task v1.0

A sophisticated, modern Todo List application featuring OTP-based authentication, role-based access control (RBAC), and a sleek, responsive UI. Built with Flask, SQLite, and Tailwind CSS.

## 🚀 Key Features

- **OTP Authentication**: Secure login via One-Time Passwords (sent via SMTP or printed to console for development).
- **Admin Masquerade Mode**: Administrators can view and edit tasks as any other user to provide support or oversight.
- **Rich Task Management**: 
  - Dynamic task line-items with a built-in rich-text editor (Bold, Italic, Lists, Links).
  - Per-item hour tracking for granular task management.
  - Soft deletes with a dedicated "Deleted" view for recovery.
- **Advanced Filtering**: Filter by status (Active, Completed, Past Due), color flags, custom labels, and date ranges.
- **Activity Feed**: Real-time-style comment updates and collaboration on shared tasks.
- **Modern UI**: Fully responsive dashboard with support for both Light and Dark modes.

## 🛠️ Tech Stack

- **Backend**: Python / Flask
- **Database**: SQLite
- **Frontend**: Vanilla JavaScript / Tailwind CSS
- **Security**: Environment-based configuration (python-dotenv)

## 💻 Getting Started

### Prerequisites

- Python 3.9+
- pip

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/pingram3541/to-do-python.git
    cd to-do-python
    ```

2.  **Install dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

3.  **Configure Environment**:
    Create a `.env` file in the root directory (refer to `config.py` for available variables):
    ```env
    SECRET_KEY=your-secret-key
    ADMIN_EMAIL=your-admin@email.com
    # SMTP Settings (optional for local testing)
    SMTP_HOST=
    SMTP_PORT=465
    SMTP_USER=
    SMTP_PASS=
    ```

### Running Locally

1.  **Start the Flask server**:
    ```bash
    python app.py
    ```

2.  **Access the app**:
    Open [http://127.0.0.1:5001](http://127.0.0.1:5001) in your browser.
    *Note: Port 5001 is used by default to avoid conflicts with macOS AirPlay (Port 5000).*

3.  **Login**:
    Enter your email. If `SMTP_HOST` is blank, check your terminal console for the 6-digit OTP code.

## 🔒 Security & Privacy

- **Environment Variables**: Sensitive credentials (API keys, SMTP passwords) are managed via `.env` and are never committed to version control.
- **RBAC**: Strict permission checks ensure users only see and edit tasks they own or have been granted access to.
- **Database Protection**: The `.htaccess` configuration is set up to deny direct web access to the SQLite database and environment files.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
