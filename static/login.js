let mode = "login";

const form = document.getElementById("authForm");
const errorEl = document.getElementById("authError");
const loginButtons = document.getElementById("loginButtons");
const signupSubmit = document.getElementById("signupSubmit");
const toggleText = document.getElementById("toggleText");
const toggleLink = document.getElementById("toggleModeLink");

toggleLink.addEventListener("click", (e) => {
    e.preventDefault();
    mode = mode === "login" ? "signup" : "login";

    loginButtons.hidden = mode !== "login";
    signupSubmit.hidden = mode !== "signup";
    toggleText.textContent = mode === "login" ? "Don't have an account?" : "Already have an account?";
    toggleLink.textContent = mode === "login" ? "Sign up" : "Log in";
    errorEl.textContent = "";
});

async function attemptAuth(role) {
    errorEl.textContent = "";
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    const endpoint = mode === "login" ? "/api/login" : "/api/signup";
    const body = mode === "login" ? { username, password, role } : { username, password };

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        const data = await response.json();

        if (!response.ok) {
            errorEl.textContent = data.error || "Something went wrong";
            return;
        }

        window.location.href = role === "admin" ? "/users.html" : "/homepage.html";
    } catch (error) {
        errorEl.textContent = "Couldn't reach the server";
    }
}

// Student Login and Sign Up both use the form's native submit (Enter key works for either).
form.addEventListener("submit", (e) => {
    e.preventDefault();
    attemptAuth("student");
});

// Admin Login is a plain button, not a submit — needs its own listener.
document.getElementById("adminLoginBtn").addEventListener("click", () => {
    attemptAuth("admin");
});
