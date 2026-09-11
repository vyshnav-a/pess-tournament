export function getStoredUser() {
  const userData = localStorage.getItem(
    "pess_user"
  );

  if (!userData) {
    return null;
  }

  try {
    return JSON.parse(userData);
  } catch {
    return null;
  }
}


export function isAdmin() {
  const user = getStoredUser();

  return (
    !!user &&
    user.role === "ADMIN"
  );
}


export function isLoggedIn() {
  return !!localStorage.getItem(
    "pess_token"
  );
}