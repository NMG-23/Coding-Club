const input = document.getElementById('secretInput');
const btn = document.getElementById('loginBtn');
const errorMsg = document.getElementById('errorMsg');
const successMsg = document.getElementById('successMsg');

function showError(text) {
  errorMsg.textContent = text;
  errorMsg.style.display = 'block';
  successMsg.style.display = 'none';
  setTimeout(() => { errorMsg.style.display = 'none'; }, 4000);
}

function showSuccess(text) {
  successMsg.textContent = text;
  successMsg.style.display = 'block';
  errorMsg.style.display = 'none';
}

input.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') doLogin();
});

async function doLogin() {
  const val = input.value.trim();
  if (!val) { 
    showError("Secret Key required."); 
    return; 
  }
  
  btn.textContent = "Authenticating...";
  btn.disabled = true;
  errorMsg.style.display = 'none';
  
  try {
    const res = await fetch("/api/admin/login", { 
      method: "POST", 
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ secret: val }), 
      credentials: "include" 
    });
    const data = await res.json();
    
    if (res.ok && data.success) {
      showSuccess("Authenticated successfully. Redirecting...");
      btn.textContent = "Success";
      setTimeout(() => {
        window.location.href = "/public/admin.html";
      }, 800);
    } else {
      showError(data.error || "Authentication failed. Incorrect key.");
      btn.textContent = "Login to Console";
      btn.disabled = false;
    }
  } catch (err) {
    showError("Login request failed. Check console.");
    btn.textContent = "Login to Console";
    btn.disabled = false;
  }
}
