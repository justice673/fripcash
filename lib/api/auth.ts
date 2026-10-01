"use client";

import { api, clearToken, writeToken } from "./client";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  phoneNumberVerified: boolean;
  emailVerified?: boolean;
  preferredLocale?: "FR" | "EN";
  userKind?: string;
  authAudience?: "CONSUMER" | "ADMIN" | "COURIER";
};

export type VerifyOtpResponse = {
  status: boolean;
  token: string | null;
  user: AuthUser;
};

export async function sendOtp(phoneNumber: string) {
  const { data } = await api.post<{ message: string }>(
    "/auth/phone-number/send-otp",
    { phoneNumber }
  );
  return data;
}

export async function verifyOtp(phoneNumber: string, code: string) {
  const { data } = await api.post<VerifyOtpResponse>(
    "/auth/phone-number/verify",
    { phoneNumber, code }
  );
  if (!data.token) {
    throw new Error("No session token returned");
  }
  writeToken(data.token);
  return data;
}

/** from-be recommended: POST /auth/otp/request */
export async function requestAuthOtp(body: {
  phone: string;
  purpose: "register" | "login" | "reset_password" | string;
}) {
  const purpose =
    body.purpose === "reset" ? "reset_password" : body.purpose;
  const { data } = await api.post("/auth/otp/request", {
    phone: body.phone,
    purpose,
  });
  return data;
}

/** from-be recommended: POST /auth/otp/verify → registrationSessionId / resetToken */
export async function verifyAuthOtp(body: {
  phone: string;
  code: string;
  purpose: "register" | "login" | "reset_password" | string;
}) {
  const purpose =
    body.purpose === "reset" ? "reset_password" : body.purpose;
  const { data } = await api.post("/auth/otp/verify", {
    phone: body.phone,
    code: body.code,
    purpose,
  });
  return data;
}

/** from-be recommended password register */
export async function registerConsumer(body: Record<string, unknown>) {
  const { data } = await api.post<{
    token?: string;
    user?: AuthUser;
  }>("/auth/register", body);
  if (data.token) writeToken(data.token);
  return data;
}

/** from-be recommended: POST /auth/login */
export async function loginWithPassword(body: {
  phone: string;
  password: string;
  termsAccepted: boolean;
}) {
  const { data } = await api.post<{
    token?: string;
    user?: AuthUser;
  }>("/auth/login", body);
  if (data.token) writeToken(data.token);
  return data;
}

export async function registerCloudinarySign(body: {
  phone: string;
  registrationSessionId: string;
}) {
  const { data } = await api.post(
    "/auth/media/register-cloudinary-sign",
    body
  );
  return data;
}

export async function forgotPasswordPhone(phone: string) {
  const { data } = await api.post("/auth/password/forgot", { phone });
  return data;
}

export async function resetPasswordPhone(body: {
  phone: string;
  resetToken: string;
  password: string;
}) {
  const { data } = await api.post("/auth/password/reset", body);
  return data;
}

export async function changePassword(body: {
  currentPassword: string;
  newPassword: string;
}) {
  const { data } = await api.post("/auth/password/change", body);
  return data;
}

export async function signOut() {
  try {
    await api.post("/auth/sign-out");
  } finally {
    clearToken();
  }
}

export async function getSession() {
  const { data } = await api.get<{
    session: { token: string };
    user: AuthUser;
  } | null>("/auth/get-session");
  return data;
}

export async function signInEmail(email: string, password: string) {
  const { data } = await api.post<{
    token?: string;
    user?: AuthUser;
    session?: { token?: string };
  }>("/auth/sign-in/email", { email, password });

  const token = data.token || data.session?.token;
  if (token) writeToken(token);
  return data;
}

/** Staff only — Nest `POST /auth/admin/login` → `aud: admin` session. */
export async function adminLogin(email: string, password: string) {
  const { data } = await api.post<{
    token?: string;
    user?: AuthUser;
    redirect?: boolean;
  }>("/auth/admin/login", { email, password });

  const token = data.token;
  if (!token) {
    throw new Error("No admin session token returned");
  }
  writeToken(token);
  return data;
}

/** France — Better Auth email signup. */
export async function signUpEmail(body: {
  email: string;
  password: string;
  name: string;
}) {
  const { data } = await api.post<{
    token?: string | null;
    user: AuthUser;
  }>("/auth/sign-up/email", body);

  const token = data.token;
  if (token) writeToken(token);
  return data;
}

/** Trigger verification email (requires BE email provider + trusted callbackURL). */
export async function sendVerificationEmail(
  email: string,
  callbackURL?: string
) {
  const { data } = await api.post("/auth/send-verification-email", {
    email,
    ...(callbackURL ? { callbackURL } : {}),
  });
  return data;
}

/** Confirm email from link token — GET /auth/verify-email?token= */
export async function verifyEmail(token: string) {
  const { data } = await api.get("/auth/verify-email", {
    params: { token },
  });
  return data;
}

export async function requestPasswordReset(
  email: string,
  redirectTo?: string
) {
  const { data } = await api.post("/auth/request-password-reset", {
    email,
    ...(redirectTo ? { redirectTo } : {}),
  });
  return data;
}

export async function resetPassword(body: {
  token: string;
  newPassword: string;
}) {
  const { data } = await api.post("/auth/reset-password", body);
  return data;
}

/** @deprecated Prefer `adminLogin` — staff must use `/auth/admin/login`. */
export const adminSignInEmail = adminLogin;
