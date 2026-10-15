// @ts-check

/** @param {string | undefined} code */
export function getAuthErrorMessage(code) {
  if (!code) return null;
  switch (code) {
    case "OAuthAccountNotLinked":
      return "This account uses a different sign-in method. Please use your original sign-in method.";
    case "SessionRequired":
      return "Please sign in to continue.";
    case "CredentialsSignin":
      return "Invalid username or password.";
    case "AccessDenied":
      return "Sign-in was denied. Please try again.";
    case "Configuration":
      return "Sign-in is currently unavailable. Please try again later.";
    default:
      // Do not reflect arbitrary query-string values or server error details.
      return "We could not complete sign-in. Please try again. If this keeps happening, contact support.";
  }
}
