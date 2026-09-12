let mode = "login";

const form = document.getElementById("authForm");
const errorEl = document.getElementById("authError");
const submitBtn = document.getElementById("authSubmit");
const toggleText = document.getElementById("toggleText");
const toggleLink = document.getElementById("toggleModeLink");

toggleLink.addEventListener("click", (e) => {
    e.preventDefault();
    mode = mode === "login" ? "signup" : "login";
    submitBtn.textContent = mode === "login" ? "Log In" : "Sign Up";
    toggleText.textContent = mode === "login" ? "Don't have an account?" : "Already have an account?";
    toggleLink.textContent = mode === "login" ? "Sign up" : "Log in";
    errorEl.textContent = "";
});

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.textContent = "";

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    const endpoint = mode === "login" ? "/api/login" : "/api/signup";

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
        });
        const data = await response.json();

        if (!response.ok) {
            errorEl.textContent = data.error || "Something went wrong";
            return;
        }

        window.location.href = "/homepage.html";
    } catch (error) {
        errorEl.textContent = "Couldn't reach the server";
    }
});