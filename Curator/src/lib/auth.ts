import { supabase } from "./supabase";

export async function signUpWithUsername(input: {
  email: string;
  password: string;
  username: string;
}) {
  const cleanUsername = input.username.trim().toLowerCase();

  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      data: { username: cleanUsername }
    }
  });

  return { data, error, username: cleanUsername };
}

export async function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({
    email: email.trim(),
    password
  });
}

export function getAuthErrorMessage(message: string) {
  if (message.toLowerCase().includes("network request failed")) {
    return "Can't reach Supabase. Check your internet, verify EXPO_PUBLIC_SUPABASE_URL in .env, then restart with: npx expo start -c";
  }

  if (message.toLowerCase().includes("email not confirmed")) {
    return "Confirm your email first. Check your inbox, then sign in.";
  }

  if (message.toLowerCase().includes("invalid login credentials")) {
    return "Wrong email or password. Try again or create an account.";
  }

  return message;
}
