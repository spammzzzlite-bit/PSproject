import { supabase } from "./supabase";

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function parseAuthError(error: any): string {
  if (!error) return "Something went wrong.";
  const msg = error.message || error.error_description || error.toString();
  
  if (msg.includes("Invalid login credentials")) {
    return "Incorrect email or password.";
  }
  if (msg.includes("Email rate limit exceeded") || msg.includes("Too many requests") || error.status === 429) {
    return "Too many attempts. Please wait a moment before trying again.";
  }
  if (msg.includes("User already registered")) {
    return "An account with this email already exists.";
  }
  if (msg.includes("Password should be at least")) {
    return "Password must be at least 8 characters.";
  }
  
  return msg;
}
